import {
  Stack,
  type StackProps,
  Tags,
  CfnOutput,
  Duration,
  aws_lambda as lambda,
  aws_cloudfront as cf,
  aws_dynamodb as dynamodb,
  aws_iam as iam,
  aws_logs as logs,
} from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import type { EnvConfig } from '../config';
import * as path from 'path';

export interface TenantRoutingStackProps {
  tenantPoolsTable: dynamodb.Table;
}

export interface TenantRoutingStackOutputs {
  tenantRouterFunction: cf.experimental.EdgeFunction;
}

/**
 * Tenant routing stack — Lambda@Edge functions for multi-tenant CloudFront.
 *
 * Creates:
 * 1. Lambda@Edge origin-request function that resolves tenant from hostname
 * 2. Grants DynamoDB read access to the tenant pools table
 *
 * Note: Lambda@Edge functions must be created in us-east-1.
 * The CDK experimental.EdgeFunction handles cross-region deployment automatically.
 */
export class TenantRoutingStack extends Stack {
  public readonly outputs: TenantRoutingStackOutputs;

  constructor(
    scope: Construct,
    id: string,
    config: EnvConfig,
    routingProps: TenantRoutingStackProps,
    props?: StackProps,
  ) {
    super(scope, id, props);
    Tags.of(this).add('Project', 'ChiselGrid');
    Tags.of(this).add('ManagedBy', 'CDK');

    // Lambda@Edge for tenant routing (origin-request)
    const tenantRouterFunction = new cf.experimental.EdgeFunction(this, 'TenantRouter', {
      functionName: `chiselgrid-tenant-router-${config.enableDeletion ? 'dev' : 'prod'}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'tenant-router.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../edge')),
      memorySize: 128,
      timeout: Duration.seconds(5),
      description: 'Resolves tenant from hostname and injects tenant headers into CloudFront origin request',
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Grant DynamoDB read access
    routingProps.tenantPoolsTable.grantReadData(tenantRouterFunction);

    // Also grant via IAM policy for edge execution
    tenantRouterFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:Query',
      ],
      resources: [
        routingProps.tenantPoolsTable.tableArn,
        `${routingProps.tenantPoolsTable.tableArn}/index/*`,
      ],
    }));

    // Environment variables for edge function (passed via custom headers in CloudFront)
    // Note: Lambda@Edge doesn't support env vars, so these are baked into the code

    new CfnOutput(this, 'TenantRouterFunctionArn', {
      value: tenantRouterFunction.functionArn,
      exportName: `${id}-TenantRouterFunctionArn`,
    });

    this.outputs = {
      tenantRouterFunction,
    };
  }
}
