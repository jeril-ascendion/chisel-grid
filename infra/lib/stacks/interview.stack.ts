/**
 * T-19.1/T-19.3/T-19.4 Interview Mode CDK Stack
 *
 * Provisions:
 * - DynamoDB tables for interview templates, interviews, and schedules
 * - Lambda handlers for templates, processing, and scheduling
 * - EventBridge rule for push notification reminders
 */

import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';

interface InterviewStackProps extends cdk.StackProps {
  voicePipelineArn: string;
  mediaBucketArn: string;
}

export class InterviewStack extends cdk.Stack {
  public readonly templatesTable: dynamodb.Table;
  public readonly interviewsTable: dynamodb.Table;
  public readonly schedulesTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: InterviewStackProps) {
    super(scope, id, props);

    // DynamoDB: Interview Templates
    this.templatesTable = new dynamodb.Table(this, 'InterviewTemplatesTable', {
      tableName: 'chiselgrid-interview-templates',
      partitionKey: { name: 'templateId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    this.templatesTable.addGlobalSecondaryIndex({
      indexName: 'tenantId-index',
      partitionKey: { name: 'tenantId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // DynamoDB: Interviews (processing state)
    this.interviewsTable = new dynamodb.Table(this, 'InterviewsTable', {
      tableName: 'chiselgrid-interviews',
      partitionKey: { name: 'interviewId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    this.interviewsTable.addGlobalSecondaryIndex({
      indexName: 'userId-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // DynamoDB: Interview Schedules
    this.schedulesTable = new dynamodb.Table(this, 'InterviewSchedulesTable', {
      tableName: 'chiselgrid-interview-schedules',
      partitionKey: { name: 'scheduleId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      timeToLiveAttribute: 'ttl',
    });

    this.schedulesTable.addGlobalSecondaryIndex({
      indexName: 'userId-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'scheduledAt', type: dynamodb.AttributeType.STRING },
    });

    // Lambda: Interview Templates CRUD
    const templatesFn = new lambda.Function(this, 'InterviewTemplatesFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'interview-templates.handler',
      code: lambda.Code.fromAsset('dist/handlers'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        INTERVIEW_TEMPLATES_TABLE: this.templatesTable.tableName,
      },
    });
    this.templatesTable.grantReadWriteData(templatesFn);

    // Lambda: Interview Processor
    const processorFn = new lambda.Function(this, 'InterviewProcessorFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'interview-processor.handler',
      code: lambda.Code.fromAsset('dist/handlers'),
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      environment: {
        INTERVIEWS_TABLE: this.interviewsTable.tableName,
        VOICE_PIPELINE_ARN: props.voicePipelineArn,
        MEDIA_BUCKET: cdk.Fn.select(5, cdk.Fn.split(':', props.mediaBucketArn)),
      },
    });
    this.interviewsTable.grantReadWriteData(processorFn);
    processorFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['states:StartExecution'],
        resources: [props.voicePipelineArn],
      }),
    );

    // Lambda: Interview Scheduling
    const schedulingFn = new lambda.Function(this, 'InterviewSchedulingFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'interview-scheduling.handler',
      code: lambda.Code.fromAsset('dist/handlers'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        SCHEDULES_TABLE: this.schedulesTable.tableName,
        FROM_EMAIL: 'interviews@ascendion.engineering',
      },
    });
    this.schedulesTable.grantReadWriteData(schedulingFn);
    schedulingFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendEmail', 'ses:SendRawEmail'],
        resources: ['*'],
      }),
    );

    // EventBridge rule: trigger reminder 30 minutes before scheduled interview
    const reminderRule = new events.Rule(this, 'InterviewReminderRule', {
      eventPattern: {
        source: ['chiselgrid.interviews'],
        detailType: ['interview.reminder'],
      },
    });
    reminderRule.addTarget(new targets.LambdaFunction(schedulingFn));

    // Outputs
    new cdk.CfnOutput(this, 'TemplatesTableName', {
      value: this.templatesTable.tableName,
    });
    new cdk.CfnOutput(this, 'InterviewsTableName', {
      value: this.interviewsTable.tableName,
    });
    new cdk.CfnOutput(this, 'SchedulesTableName', {
      value: this.schedulesTable.tableName,
    });
  }
}
