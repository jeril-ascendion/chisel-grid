/**
 * EPIC-20: Microsoft Teams Integration CDK Stack
 *
 * Infrastructure for Teams integration:
 * - DynamoDB tables for channel mappings and tenant config
 * - Lambda handlers for monday digest, channel posts, meeting recordings, auth, and MCP server
 * - EventBridge rules for scheduled digest and article.published events
 * - API Gateway routes for webhook, auth, and MCP endpoints
 * - IAM policies for DynamoDB, S3, Secrets Manager, Step Functions, Bedrock, Transcribe
 */

import {
  Stack,
  type StackProps,
  Tags,
  CfnOutput,
  Duration,
  RemovalPolicy,
  aws_lambda as lambda,
  aws_events as events,
  aws_events_targets as targets,
  aws_iam as iam,
  aws_s3 as s3,
  aws_dynamodb as dynamodb,
  aws_apigateway as apigw,
} from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import type { EnvConfig } from '../config';

export interface TeamsStackProps {
  mediaBucket: s3.IBucket;
  eventBusName: string;
}

export class TeamsStack extends Stack {
  public readonly channelMappingsTableName: string;
  public readonly tenantConfigTableName: string;
  public readonly apiUrl: string;

  constructor(
    scope: Construct,
    id: string,
    config: EnvConfig,
    teamsProps: TeamsStackProps,
    props?: StackProps,
  ) {
    super(scope, id, props);
    Tags.of(this).add('Project', 'ChiselGrid');
    Tags.of(this).add('ManagedBy', 'CDK');

    const envName = id.split('-')[1]?.toLowerCase() ?? 'dev';

    // ── DynamoDB: Teams Channel Mappings ──────────────────────
    const channelMappingsTable = new dynamodb.Table(this, 'TeamsChannelMappingsTable', {
      tableName: `chiselgrid-${envName}-teams-channel-mappings`,
      partitionKey: { name: 'tenantId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'channelId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    // ── DynamoDB: Teams Tenant Config ─────────────────────────
    const tenantConfigTable = new dynamodb.Table(this, 'TeamsTenantConfigTable', {
      tableName: `chiselgrid-${envName}-teams-tenant-config`,
      partitionKey: { name: 'tenantId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'configKey', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    // ── Event Bus (reuse existing) ───────────────────────────
    const eventBus = events.EventBus.fromEventBusName(
      this,
      'EventBus',
      teamsProps.eventBusName,
    );

    // ── Shared environment variables ─────────────────────────
    const sharedEnv = {
      CHANNEL_MAPPINGS_TABLE: channelMappingsTable.tableName,
      TENANT_CONFIG_TABLE: tenantConfigTable.tableName,
      MEDIA_BUCKET: teamsProps.mediaBucket.bucketName,
      EVENT_BUS_NAME: teamsProps.eventBusName,
      AWS_REGION_OVERRIDE: config.region,
    };

    // ── Shared IAM policy for DynamoDB, S3, Secrets Manager, Step Functions, Bedrock, Transcribe ──
    const sharedPolicy = new iam.PolicyStatement({
      actions: [
        // Secrets Manager
        'secretsmanager:GetSecretValue',
        // Step Functions
        'states:StartExecution',
        'states:DescribeExecution',
        // Bedrock
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
        // Transcribe
        'transcribe:StartTranscriptionJob',
        'transcribe:GetTranscriptionJob',
      ],
      resources: ['*'],
    });

    // ── Monday Digest Handler ────────────────────────────────
    const mondayDigestLambda = new lambda.Function(this, 'TeamsMondayDigestFn', {
      functionName: `chiselgrid-${envName}-teams-monday-digest`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/teams-monday-digest.handler',
      code: lambda.Code.fromAsset('../apps/api/dist'),
      timeout: Duration.minutes(5),
      memorySize: 512,
      environment: sharedEnv,
    });

    channelMappingsTable.grantReadData(mondayDigestLambda);
    tenantConfigTable.grantReadData(mondayDigestLambda);
    teamsProps.mediaBucket.grantRead(mondayDigestLambda);
    mondayDigestLambda.addToRolePolicy(sharedPolicy);

    // EventBridge scheduled rule: every Monday 9am SGT (UTC+8 → 01:00 UTC)
    new events.Rule(this, 'MondayDigestScheduleRule', {
      ruleName: `chiselgrid-${envName}-teams-monday-digest`,
      schedule: events.Schedule.expression('cron(0 1 ? * MON *)'),
      targets: [new targets.LambdaFunction(mondayDigestLambda)],
      description: 'Triggers Teams monday digest every Monday at 9am SGT',
    });

    // ── Teams Channel Post Handler ───────────────────────────
    const channelPostLambda = new lambda.Function(this, 'TeamsChannelPostFn', {
      functionName: `chiselgrid-${envName}-teams-channel-post`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/teams-channel-post.handler',
      code: lambda.Code.fromAsset('../apps/api/dist'),
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: sharedEnv,
    });

    channelMappingsTable.grantReadData(channelPostLambda);
    tenantConfigTable.grantReadData(channelPostLambda);
    channelPostLambda.addToRolePolicy(sharedPolicy);

    // EventBridge rule: article.published → channel post
    new events.Rule(this, 'ArticlePublishedRule', {
      eventBus,
      eventPattern: {
        source: ['chiselgrid.content'],
        detailType: ['article.published'],
      },
      targets: [new targets.LambdaFunction(channelPostLambda)],
      description: 'Posts to Teams channel when an article is published',
    });

    // ── API Gateway for Teams webhooks ───────────────────────
    const api = new apigw.RestApi(this, 'TeamsApi', {
      restApiName: `chiselgrid-${envName}-teams-api`,
      description: 'API Gateway for Teams integration webhooks',
      deployOptions: {
        stageName: envName,
        throttlingRateLimit: 100,
        throttlingBurstLimit: 50,
      },
    });

    // ── Meeting Recording Webhook Handler ────────────────────
    const meetingRecordingLambda = new lambda.Function(this, 'TeamsMeetingRecordingFn', {
      functionName: `chiselgrid-${envName}-teams-meeting-recording`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/teams-meeting-recording.handler',
      code: lambda.Code.fromAsset('../apps/api/dist'),
      timeout: Duration.minutes(5),
      memorySize: 512,
      environment: sharedEnv,
    });

    channelMappingsTable.grantReadData(meetingRecordingLambda);
    tenantConfigTable.grantReadData(meetingRecordingLambda);
    teamsProps.mediaBucket.grantReadWrite(meetingRecordingLambda);
    meetingRecordingLambda.addToRolePolicy(sharedPolicy);

    const meetingResource = api.root.addResource('meeting-recording');
    meetingResource.addMethod('POST', new apigw.LambdaIntegration(meetingRecordingLambda));

    // ── Teams Auth Handler ───────────────────────────────────
    const teamsAuthLambda = new lambda.Function(this, 'TeamsAuthFn', {
      functionName: `chiselgrid-${envName}-teams-auth`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/teams-auth.handler',
      code: lambda.Code.fromAsset('../apps/api/dist'),
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: sharedEnv,
    });

    tenantConfigTable.grantReadWriteData(teamsAuthLambda);
    teamsAuthLambda.addToRolePolicy(sharedPolicy);

    const authResource = api.root.addResource('auth');
    authResource.addMethod('GET', new apigw.LambdaIntegration(teamsAuthLambda));
    authResource.addMethod('POST', new apigw.LambdaIntegration(teamsAuthLambda));

    // ── MCP Server Handler ───────────────────────────────────
    const mcpServerLambda = new lambda.Function(this, 'TeamsMcpServerFn', {
      functionName: `chiselgrid-${envName}-teams-mcp-server`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/teams-mcp-server.handler',
      code: lambda.Code.fromAsset('../apps/api/dist'),
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: sharedEnv,
    });

    channelMappingsTable.grantReadWriteData(mcpServerLambda);
    tenantConfigTable.grantReadWriteData(mcpServerLambda);
    teamsProps.mediaBucket.grantRead(mcpServerLambda);
    mcpServerLambda.addToRolePolicy(sharedPolicy);

    const mcpResource = api.root.addResource('mcp');
    mcpResource.addMethod('POST', new apigw.LambdaIntegration(mcpServerLambda));

    // ── Store references ─────────────────────────────────────
    this.channelMappingsTableName = channelMappingsTable.tableName;
    this.tenantConfigTableName = tenantConfigTable.tableName;
    this.apiUrl = api.url;

    // ── Outputs ──────────────────────────────────────────────
    new CfnOutput(this, 'ChannelMappingsTableName', {
      value: channelMappingsTable.tableName,
      description: 'DynamoDB table for Teams channel mappings',
    });

    new CfnOutput(this, 'TenantConfigTableName', {
      value: tenantConfigTable.tableName,
      description: 'DynamoDB table for Teams tenant configuration',
    });

    new CfnOutput(this, 'TeamsApiUrl', {
      value: api.url,
      description: 'API Gateway URL for Teams integration endpoints',
    });

    new CfnOutput(this, 'MondayDigestFunctionName', {
      value: mondayDigestLambda.functionName,
      description: 'Lambda function for Monday digest',
    });

    new CfnOutput(this, 'ChannelPostFunctionName', {
      value: channelPostLambda.functionName,
      description: 'Lambda function for Teams channel posts',
    });
  }
}
