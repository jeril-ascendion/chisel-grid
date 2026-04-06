import {
  Stack,
  type StackProps,
  Tags,
  CfnOutput,
  RemovalPolicy,
  aws_s3 as s3,
  aws_athena as athena,
  aws_glue as glue,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_events as events,
  aws_events_targets as targets,
  aws_logs as logs,
  Duration,
} from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import type { EnvConfig } from '../config';

export interface AnalyticsStackOutputs {
  accessLogsBucket: s3.IBucket;
  athenaResultsBucket: s3.IBucket;
  athenaWorkgroupName: string;
  databaseName: string;
}

/**
 * Analytics infrastructure stack.
 * Creates:
 * 1. S3 bucket for CloudFront access logs
 * 2. S3 bucket for Athena query results
 * 3. Glue database and table for log analysis
 * 4. Athena workgroup for querying
 * 5. Lambda for daily log aggregation
 */
export class AnalyticsStack extends Stack {
  public readonly outputs: AnalyticsStackOutputs;

  constructor(scope: Construct, id: string, config: EnvConfig, props?: StackProps) {
    super(scope, id, props);
    Tags.of(this).add('Project', 'ChiselGrid');
    Tags.of(this).add('ManagedBy', 'CDK');

    const envSuffix = config.enableDeletion ? 'dev' : 'prod';

    // S3 bucket for CloudFront access logs
    const accessLogsBucket = new s3.Bucket(this, 'AccessLogsBucket', {
      bucketName: `chiselgrid-access-logs-${envSuffix}`,
      versioned: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [{
        id: 'ExpireOldLogs',
        expiration: Duration.days(90),
      }],
      removalPolicy: config.enableDeletion ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
      autoDeleteObjects: config.enableDeletion,
    });

    // S3 bucket for Athena query results
    const athenaResultsBucket = new s3.Bucket(this, 'AthenaResultsBucket', {
      bucketName: `chiselgrid-athena-results-${envSuffix}`,
      versioned: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [{
        id: 'ExpireResults',
        expiration: Duration.days(30),
      }],
      removalPolicy: config.enableDeletion ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
      autoDeleteObjects: config.enableDeletion,
    });

    // Glue Database for analytics
    const databaseName = `chiselgrid_analytics_${envSuffix}`;
    const database = new glue.CfnDatabase(this, 'AnalyticsDatabase', {
      catalogId: this.account,
      databaseInput: {
        name: databaseName,
        description: 'ChiselGrid analytics data warehouse',
      },
    });

    // Glue Table for CloudFront access logs
    new glue.CfnTable(this, 'AccessLogsTable', {
      catalogId: this.account,
      databaseName: databaseName,
      tableInput: {
        name: 'cloudfront_access_logs',
        description: 'CloudFront standard access logs',
        tableType: 'EXTERNAL_TABLE',
        parameters: {
          'skip.header.line.count': '2',
          'serialization.format': '\t',
          'field.delim': '\t',
        },
        storageDescriptor: {
          location: `s3://${accessLogsBucket.bucketName}/cf-logs/`,
          inputFormat: 'org.apache.hadoop.mapred.TextInputFormat',
          outputFormat: 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat',
          serdeInfo: {
            serializationLibrary: 'org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe',
            parameters: {
              'field.delim': '\t',
              'serialization.format': '\t',
            },
          },
          columns: [
            { name: 'log_date', type: 'date' },
            { name: 'log_time', type: 'string' },
            { name: 'edge_location', type: 'string' },
            { name: 'sc_bytes', type: 'bigint' },
            { name: 'client_ip', type: 'string' },
            { name: 'cs_method', type: 'string' },
            { name: 'cs_host', type: 'string' },
            { name: 'cs_uri_stem', type: 'string' },
            { name: 'sc_status', type: 'int' },
            { name: 'cs_referer', type: 'string' },
            { name: 'cs_user_agent', type: 'string' },
            { name: 'cs_uri_query', type: 'string' },
            { name: 'cs_cookie', type: 'string' },
            { name: 'edge_result_type', type: 'string' },
            { name: 'edge_request_id', type: 'string' },
            { name: 'host_header', type: 'string' },
            { name: 'cs_protocol', type: 'string' },
            { name: 'cs_bytes', type: 'bigint' },
            { name: 'time_taken', type: 'float' },
          ],
        },
      },
    }).addDependency(database);

    // Athena Workgroup
    const workgroup = new athena.CfnWorkGroup(this, 'AnalyticsWorkgroup', {
      name: `chiselgrid-analytics-${envSuffix}`,
      description: 'ChiselGrid analytics queries',
      workGroupConfiguration: {
        resultConfiguration: {
          outputLocation: `s3://${athenaResultsBucket.bucketName}/results/`,
          encryptionConfiguration: {
            encryptionOption: 'SSE_S3',
          },
        },
        enforceWorkGroupConfiguration: true,
        bytesScannedCutoffPerQuery: 10_000_000_000, // 10GB limit per query
        publishCloudWatchMetricsEnabled: true,
      },
    });

    // Lambda for daily analytics aggregation
    const aggregationLambda = new lambda.Function(this, 'AnalyticsAggregation', {
      functionName: `chiselgrid-analytics-aggregation-${envSuffix}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'analytics-aggregation.handler',
      code: lambda.Code.fromAsset('lambda/analytics'),
      memorySize: 512,
      timeout: Duration.minutes(5),
      environment: {
        ATHENA_DATABASE: databaseName,
        ATHENA_WORKGROUP: workgroup.name!,
        ATHENA_RESULTS_BUCKET: athenaResultsBucket.bucketName,
        ACCESS_LOGS_BUCKET: accessLogsBucket.bucketName,
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Grant Athena and S3 permissions
    accessLogsBucket.grantRead(aggregationLambda);
    athenaResultsBucket.grantReadWrite(aggregationLambda);
    aggregationLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'athena:StartQueryExecution',
        'athena:GetQueryExecution',
        'athena:GetQueryResults',
        'glue:GetDatabase',
        'glue:GetTable',
        'glue:GetPartitions',
      ],
      resources: ['*'],
    }));

    // Schedule daily aggregation at 2 AM UTC
    new events.Rule(this, 'DailyAggregationRule', {
      schedule: events.Schedule.cron({ hour: '2', minute: '0' }),
      targets: [new targets.LambdaFunction(aggregationLambda)],
    });

    // Outputs
    new CfnOutput(this, 'AccessLogsBucketName', {
      value: accessLogsBucket.bucketName,
      exportName: `${id}-AccessLogsBucket`,
    });
    new CfnOutput(this, 'AthenaWorkgroupName', {
      value: workgroup.name!,
      exportName: `${id}-AthenaWorkgroup`,
    });

    this.outputs = {
      accessLogsBucket,
      athenaResultsBucket,
      athenaWorkgroupName: workgroup.name!,
      databaseName,
    };
  }
}
