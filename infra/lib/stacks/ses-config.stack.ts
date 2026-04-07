/**
 * T-22.3 SES Configuration CDK Stack
 *
 * Provisions:
 * - SES configuration set with event destinations
 * - SNS topic for bounce/complaint events
 * - Lambda for suppression list updates
 * - Aurora table for send statistics
 */

import * as cdk from 'aws-cdk-lib';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

interface SesConfigStackProps extends cdk.StackProps {
  databaseSecretArn: string;
}

export class SesConfigStack extends cdk.Stack {
  public readonly configurationSetName: string;
  public readonly bounceTopic: sns.Topic;
  public readonly sendStatsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: SesConfigStackProps) {
    super(scope, id, props);

    // SES Configuration Set
    const configSet = new ses.CfnConfigurationSet(this, 'ChiselGridConfigSet', {
      name: 'chiselgrid-email',
      reputationOptions: {
        reputationMetricsEnabled: true,
      },
      sendingOptions: {
        sendingEnabled: true,
      },
      suppressionOptions: {
        suppressedReasons: ['BOUNCE', 'COMPLAINT'],
      },
    });
    this.configurationSetName = configSet.name!;

    // SNS Topic for bounce/complaint notifications
    this.bounceTopic = new sns.Topic(this, 'BounceComplaintTopic', {
      topicName: 'chiselgrid-ses-bounces',
      displayName: 'ChiselGrid SES Bounce/Complaint Notifications',
    });

    // SES event destination → SNS
    new ses.CfnConfigurationSetEventDestination(this, 'BounceEventDest', {
      configurationSetName: configSet.name!,
      eventDestination: {
        name: 'bounce-complaint-events',
        enabled: true,
        matchingEventTypes: ['bounce', 'complaint', 'reject'],
        snsDestination: {
          topicArn: this.bounceTopic.topicArn,
        },
      },
    });

    // DynamoDB table for send statistics
    this.sendStatsTable = new dynamodb.Table(this, 'SendStatsTable', {
      tableName: 'chiselgrid-ses-send-stats',
      partitionKey: { name: 'tenantId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'date', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      timeToLiveAttribute: 'ttl',
    });

    // Lambda: handle bounce/complaint events
    const bounceHandlerFn = new lambda.Function(this, 'BounceHandlerFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'ses-bounce-handler.handler',
      code: lambda.Code.fromAsset('dist/handlers'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        SEND_STATS_TABLE: this.sendStatsTable.tableName,
        DATABASE_SECRET_ARN: props.databaseSecretArn,
      },
    });

    // Grant permissions
    this.sendStatsTable.grantReadWriteData(bounceHandlerFn);
    bounceHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'ses:PutSuppressedDestination',
          'ses:GetSuppressedDestination',
        ],
        resources: ['*'],
      }),
    );
    bounceHandlerFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: [props.databaseSecretArn],
      }),
    );

    // Subscribe Lambda to SNS topic
    this.bounceTopic.addSubscription(
      new snsSubscriptions.LambdaSubscription(bounceHandlerFn),
    );

    // Lambda: record send statistics (called from email send handlers)
    const statsRecorderFn = new lambda.Function(this, 'StatsRecorderFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'ses-stats-recorder.handler',
      code: lambda.Code.fromAsset('dist/handlers'),
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        SEND_STATS_TABLE: this.sendStatsTable.tableName,
      },
    });
    this.sendStatsTable.grantReadWriteData(statsRecorderFn);

    // Outputs
    new cdk.CfnOutput(this, 'ConfigurationSetName', {
      value: this.configurationSetName,
    });
    new cdk.CfnOutput(this, 'BounceTopicArn', {
      value: this.bounceTopic.topicArn,
    });
    new cdk.CfnOutput(this, 'SendStatsTableName', {
      value: this.sendStatsTable.tableName,
    });
  }
}
