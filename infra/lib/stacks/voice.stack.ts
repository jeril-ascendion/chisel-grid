/**
 * T-16.7: Voice pipeline CDK stack
 *
 * Infrastructure for voice capture and transcription:
 * - S3 event notifications for voice uploads
 * - SQS queues for transcription jobs
 * - Lambda handlers for transcription, vocabulary, upload, and notifications
 * - DynamoDB tables for vocabulary and push tokens
 * - IAM permissions for Amazon Transcribe
 * - EventBridge rules for pipeline events
 */

import {
  Stack,
  type StackProps,
  Tags,
  CfnOutput,
  Duration,
  RemovalPolicy,
  aws_sqs as sqs,
  aws_lambda as lambda,
  aws_lambda_event_sources as eventsources,
  aws_events as events,
  aws_events_targets as targets,
  aws_iam as iam,
  aws_s3 as s3,
  aws_dynamodb as dynamodb,
} from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import type { EnvConfig } from '../config';

export interface VoiceStackProps {
  mediaBucket: s3.IBucket;
  cloudFrontDomain: string;
  eventBusName: string;
}

export class VoiceStack extends Stack {
  public readonly transcriptionQueueUrl: string;
  public readonly vocabularyTableName: string;
  public readonly pushTokensTableName: string;

  constructor(
    scope: Construct,
    id: string,
    config: EnvConfig,
    voiceProps: VoiceStackProps,
    props?: StackProps,
  ) {
    super(scope, id, props);
    Tags.of(this).add('Project', 'ChiselGrid');
    Tags.of(this).add('ManagedBy', 'CDK');

    const envName = id.split('-')[1]?.toLowerCase() ?? 'dev';

    // ── DynamoDB: Custom Vocabulary Table ─────────────────────
    const vocabularyTable = new dynamodb.Table(this, 'VocabularyTable', {
      tableName: `chiselgrid-${envName}-vocabulary`,
      partitionKey: { name: 'tenantId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    // ── DynamoDB: Push Tokens Table ───────────────────────────
    const pushTokensTable = new dynamodb.Table(this, 'PushTokensTable', {
      tableName: `chiselgrid-${envName}-push-tokens`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    pushTokensTable.addGlobalSecondaryIndex({
      indexName: 'tenant-role-index',
      partitionKey: { name: 'tenantId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'role', type: dynamodb.AttributeType.STRING },
    });

    // ── Dead Letter Queue ─────────────────────────────────────
    const dlq = new sqs.Queue(this, 'TranscriptionDLQ', {
      queueName: `chiselgrid-${envName}-transcription-dlq`,
      retentionPeriod: Duration.days(14),
    });

    // ── Transcription Job Queue ───────────────────────────────
    const transcriptionQueue = new sqs.Queue(this, 'TranscriptionQueue', {
      queueName: `chiselgrid-${envName}-transcription-jobs.fifo`,
      fifo: true,
      contentBasedDeduplication: false,
      visibilityTimeout: Duration.minutes(15), // Transcription can take a while
      retentionPeriod: Duration.days(4),
      deadLetterQueue: {
        queue: dlq,
        maxReceiveCount: 2,
      },
    });

    // ── Event Bus (reuse if exists) ───────────────────────────
    const eventBus = events.EventBus.fromEventBusName(
      this,
      'EventBus',
      voiceProps.eventBusName,
    );

    // ── Voice Upload Handler ──────────────────────────────────
    const uploadLambda = new lambda.Function(this, 'VoiceUploadFn', {
      functionName: `chiselgrid-${envName}-voice-upload`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/voice-upload.handler',
      code: lambda.Code.fromAsset('../apps/api/dist'),
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        MEDIA_BUCKET: voiceProps.mediaBucket.bucketName,
        TRANSCRIPTION_QUEUE_URL: transcriptionQueue.queueUrl,
      },
    });

    voiceProps.mediaBucket.grantPut(uploadLambda);
    transcriptionQueue.grantSendMessages(uploadLambda);

    // ── Transcription Handler ─────────────────────────────────
    const transcribeLambda = new lambda.Function(this, 'VoiceTranscribeFn', {
      functionName: `chiselgrid-${envName}-voice-transcribe`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/voice-transcribe.handler',
      code: lambda.Code.fromAsset('../apps/api/dist'),
      timeout: Duration.minutes(10),
      memorySize: 512,
      environment: {
        MEDIA_BUCKET: voiceProps.mediaBucket.bucketName,
        TRANSCRIPT_BUCKET: voiceProps.mediaBucket.bucketName,
        EVENT_BUS_NAME: voiceProps.eventBusName,
        CUSTOM_VOCABULARY_PREFIX: `chiselgrid-vocab-`,
      },
    });

    // SQS trigger for transcription
    transcribeLambda.addEventSource(
      new eventsources.SqsEventSource(transcriptionQueue, {
        batchSize: 1,
        maxBatchingWindow: Duration.seconds(5),
      }),
    );

    // Transcribe permissions
    transcribeLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'transcribe:StartTranscriptionJob',
          'transcribe:GetTranscriptionJob',
          'transcribe:GetVocabulary',
        ],
        resources: ['*'],
      }),
    );

    // S3 read/write for media and transcripts
    voiceProps.mediaBucket.grantReadWrite(transcribeLambda);

    // EventBridge put events
    transcribeLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['events:PutEvents'],
        resources: [eventBus.eventBusArn],
      }),
    );

    // Grant Transcribe service access to read from S3
    voiceProps.mediaBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [voiceProps.mediaBucket.arnForObjects('*/voice/*')],
        principals: [new iam.ServicePrincipal('transcribe.amazonaws.com')],
      }),
    );

    // Grant Transcribe service access to write transcripts to S3
    voiceProps.mediaBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:PutObject'],
        resources: [voiceProps.mediaBucket.arnForObjects('*/transcripts/*')],
        principals: [new iam.ServicePrincipal('transcribe.amazonaws.com')],
      }),
    );

    // ── Vocabulary Handler ────────────────────────────────────
    const vocabularyLambda = new lambda.Function(this, 'VoiceVocabularyFn', {
      functionName: `chiselgrid-${envName}-voice-vocabulary`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/voice-vocabulary.handler',
      code: lambda.Code.fromAsset('../apps/api/dist'),
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        VOCABULARY_TABLE: vocabularyTable.tableName,
        CUSTOM_VOCABULARY_PREFIX: `chiselgrid-vocab-`,
      },
    });

    vocabularyTable.grantReadWriteData(vocabularyLambda);

    vocabularyLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'transcribe:CreateVocabulary',
          'transcribe:UpdateVocabulary',
          'transcribe:GetVocabulary',
        ],
        resources: ['*'],
      }),
    );

    // ── Notification Handler ──────────────────────────────────
    const notificationLambda = new lambda.Function(this, 'VoiceNotificationFn', {
      functionName: `chiselgrid-${envName}-voice-notification`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/voice-notification.handler',
      code: lambda.Code.fromAsset('../apps/api/dist'),
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        PUSH_TOKENS_TABLE: pushTokensTable.tableName,
      },
    });

    pushTokensTable.grantReadData(notificationLambda);

    // EventBridge rule: voice.human_review_ready → notification Lambda
    new events.Rule(this, 'VoiceReviewReadyRule', {
      eventBus,
      eventPattern: {
        source: ['chiselgrid.voice'],
        detailType: ['voice.human_review_ready'],
      },
      targets: [new targets.LambdaFunction(notificationLambda)],
      description: 'Sends push notification when voice draft is ready for review',
    });

    // EventBridge rule: voice.transcribed → voice content pipeline
    new events.Rule(this, 'VoiceTranscribedRule', {
      eventBus,
      eventPattern: {
        source: ['chiselgrid.voice'],
        detailType: ['voice.transcribed'],
      },
      targets: [], // Will be connected to Step Functions in T-17.5
      description: 'Routes transcribed voice to content pipeline',
    });

    // ── Store references ──────────────────────────────────────
    this.transcriptionQueueUrl = transcriptionQueue.queueUrl;
    this.vocabularyTableName = vocabularyTable.tableName;
    this.pushTokensTableName = pushTokensTable.tableName;

    // ── Outputs ───────────────────────────────────────────────
    new CfnOutput(this, 'TranscriptionQueueUrl', {
      value: transcriptionQueue.queueUrl,
      description: 'SQS queue URL for transcription jobs',
    });

    new CfnOutput(this, 'TranscriptionDLQUrl', {
      value: dlq.queueUrl,
      description: 'Dead letter queue for failed transcription jobs',
    });

    new CfnOutput(this, 'VocabularyTableName', {
      value: vocabularyTable.tableName,
      description: 'DynamoDB table for custom vocabulary per tenant',
    });

    new CfnOutput(this, 'PushTokensTableName', {
      value: pushTokensTable.tableName,
      description: 'DynamoDB table for push notification tokens',
    });
  }
}
