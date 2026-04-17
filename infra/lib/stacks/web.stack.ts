import {
  Stack,
  type StackProps,
  Tags,
  Duration,
  CfnOutput,
} from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import type { Construct } from 'constructs';
import type { EnvConfig } from '../config';
import type { NetworkStack } from './network.stack';
import type { DataStack } from './data.stack';
import type { StorageStack } from './storage.stack';
import type { AuthStack } from './auth.stack';

export interface WebStackDeps {
  networkStack: NetworkStack;
  dataStack: DataStack;
  storageStack: StorageStack;
  authStack: AuthStack;
}

export class WebStack extends Stack {
  public readonly serverFunction: lambda.Function;
  public readonly distribution: cloudfront.Distribution;

  constructor(
    scope: Construct,
    id: string,
    config: EnvConfig,
    deps: WebStackDeps,
    props?: StackProps,
  ) {
    super(scope, id, props);
    Tags.of(this).add('Project', 'ChiselGrid');
    Tags.of(this).add('ManagedBy', 'CDK');

    const envPrefix = id.split('-')[1] ?? 'dev';
    const { networkStack, dataStack, authStack } = deps;

    // --- Next.js Server Lambda ---
    this.serverFunction = new lambda.Function(this, 'NextjsServer', {
      functionName: `chiselgrid-${envPrefix}-nextjs-server`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../apps/web/.open-next/server-functions/default'),
      memorySize: 1024,
      timeout: Duration.seconds(30),
      vpc: networkStack.outputs.vpc,
      securityGroups: [networkStack.outputs.lambdaSecurityGroup],
      vpcSubnets: { subnets: networkStack.outputs.privateSubnets },
      environment: {
        NEXTAUTH_URL: `https://${config.domain}`,
        NEXTAUTH_SECRET: 'placeholder-replaced-at-deploy',
        COGNITO_USER_POOL_ID: authStack.outputs.userPoolId,
        COGNITO_CLIENT_ID: authStack.outputs.userPoolClientId,
        AWS_BEDROCK_MODEL_ID: 'anthropic.claude-3-sonnet-20240229-v1:0',
        DB_SECRET_ARN: dataStack.outputs.dbSecretArn,
        DB_HOST: dataStack.outputs.clusterEndpoint,
        DB_PORT: String(dataStack.outputs.dbPort),
        DB_NAME: 'chiselgrid',
      },
      logGroup: new logs.LogGroup(this, 'NextjsServerLogs', {
        logGroupName: `/aws/lambda/chiselgrid-${envPrefix}-nextjs-server`,
        retention: logs.RetentionDays.ONE_WEEK,
      }),
    });

    // Bedrock InvokeModel permissions
    this.serverFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: ['*'],
      }),
    );

    // Secrets Manager access for DB credentials
    this.serverFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: [dataStack.outputs.dbSecretArn],
      }),
    );

    // --- HTTP API Gateway (bypass SCP blocking Lambda Function URLs) ---
    const httpApi = new apigwv2.HttpApi(this, 'NextjsHttpApi', {
      apiName: `chiselgrid-${envPrefix}-nextjs-api`,
    });

    httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [apigwv2.HttpMethod.ANY],
      integration: new apigwv2Integrations.HttpLambdaIntegration(
        'NextjsIntegration',
        this.serverFunction,
      ),
    });

    httpApi.addRoutes({
      path: '/',
      methods: [apigwv2.HttpMethod.ANY],
      integration: new apigwv2Integrations.HttpLambdaIntegration(
        'NextjsRootIntegration',
        this.serverFunction,
      ),
    });

    const apiDomain = `${httpApi.httpApiId}.execute-api.${this.region}.amazonaws.com`;

    // --- CloudFront Distribution ---
    this.distribution = new cloudfront.Distribution(this, 'WebDistribution', {
      defaultBehavior: {
        origin: new origins.HttpOrigin(apiDomain),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      },
      comment: `ChiselGrid ${envPrefix} Web Distribution`,
    });

    // --- Outputs ---
    new CfnOutput(this, 'FunctionArn', {
      value: this.serverFunction.functionArn,
      exportName: `ChiselGrid-${envPrefix}-NextjsFunctionArn`,
    });

    new CfnOutput(this, 'HttpApiUrl', {
      value: httpApi.url!,
      exportName: `ChiselGrid-${envPrefix}-HttpApiUrl`,
    });

    new CfnOutput(this, 'DistributionDomain', {
      value: this.distribution.distributionDomainName,
      exportName: `ChiselGrid-${envPrefix}-WebDistributionDomain`,
    });

    new CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      exportName: `ChiselGrid-${envPrefix}-WebDistributionId`,
    });
  }
}
