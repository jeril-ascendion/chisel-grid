/**
 * T-08.3: SQS audio job queue with EventBridge rule
 * Audio pipeline infrastructure: EventBridge → SQS → Lambda → Polly → S3
 */

import {
  Stack,
  type StackProps,
  Tags,
  CfnOutput,
  Duration,
  aws_sqs as sqs,
  aws_lambda as lambda,
  aws_lambda_event_sources as eventsources,
  aws_events as events,
  aws_events_targets as targets,
  aws_iam as iam,
  aws_s3 as s3,
} from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import type { EnvConfig } from '../config';

export interface AudioStackProps {
  mediaBucket: s3.IBucket;
  cloudFrontDomain: string;
}

export class AudioStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    config: EnvConfig,
    audioProps: AudioStackProps,
    props?: StackProps,
  ) {
    super(scope, id, props);
    Tags.of(this).add('Project', 'ChiselGrid');
    Tags.of(this).add('ManagedBy', 'CDK');

    // ── Dead Letter Queue ──────────────────────────────────
    const dlq = new sqs.Queue(this, 'AudioDLQ', {
      queueName: `chiselgrid-${config.stage}-audio-dlq`,
      retentionPeriod: Duration.days(14),
    });

    // ── Audio Job Queue ────────────────────────────────────
    const audioQueue = new sqs.Queue(this, 'AudioQueue', {
      queueName: `chiselgrid-${config.stage}-audio-jobs`,
      visibilityTimeout: Duration.minutes(10), // Must be > Lambda timeout
      retentionPeriod: Duration.days(4),
      deadLetterQueue: {
        queue: dlq,
        maxReceiveCount: 3, // 3 retries before DLQ
      },
    });

    // ── EventBridge Rule: content.published → SQS ──────────
    const eventBus = new events.EventBus(this, 'ChiselGridEventBus', {
      eventBusName: `chiselgrid-${config.stage}-events`,
    });

    new events.Rule(this, 'ContentPublishedRule', {
      eventBus,
      eventPattern: {
        source: ['chiselgrid.content'],
        detailType: ['content.published'],
      },
      targets: [new targets.SqsQueue(audioQueue)],
      description: 'Routes content.published events to audio generation queue',
    });

    // ── Audio Generation Lambda ────────────────────────────
    const audioLambda = new lambda.Function(this, 'AudioGenerateFn', {
      functionName: `chiselgrid-${config.stage}-audio-generate`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/audio-generate.handler',
      code: lambda.Code.fromAsset('../apps/api/dist'),
      timeout: Duration.minutes(5),
      memorySize: 512,
      environment: {
        AUDIO_BUCKET: audioProps.mediaBucket.bucketName,
        CLOUDFRONT_DOMAIN: audioProps.cloudFrontDomain,
        AWS_REGION_OVERRIDE: config.region,
      },
    });

    // SQS trigger
    audioLambda.addEventSource(
      new eventsources.SqsEventSource(audioQueue, {
        batchSize: 1, // Process one at a time (Polly jobs are heavy)
        maxBatchingWindow: Duration.seconds(10),
      }),
    );

    // Polly permissions
    audioLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'polly:StartSpeechSynthesisTask',
          'polly:GetSpeechSynthesisTask',
        ],
        resources: ['*'],
      }),
    );

    // S3 write permissions for Polly output and checking existence
    audioProps.mediaBucket.grantReadWrite(audioLambda);

    // Also grant Polly service role write access to the bucket
    audioProps.mediaBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:PutObject'],
        resources: [audioProps.mediaBucket.arnForObjects('audio/*')],
        principals: [new iam.ServicePrincipal('polly.amazonaws.com')],
      }),
    );

    // ── Batch Audio Lambda ─────────────────────────────────
    const batchLambda = new lambda.Function(this, 'AudioBatchFn', {
      functionName: `chiselgrid-${config.stage}-audio-batch`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handlers/audio-batch.handler',
      code: lambda.Code.fromAsset('../apps/api/dist'),
      timeout: Duration.minutes(5),
      memorySize: 256,
      environment: {
        AUDIO_QUEUE_URL: audioQueue.queueUrl,
      },
    });

    audioQueue.grantSendMessages(batchLambda);

    // ── Outputs ────────────────────────────────────────────
    new CfnOutput(this, 'AudioQueueUrl', {
      value: audioQueue.queueUrl,
      description: 'SQS queue URL for audio generation jobs',
    });

    new CfnOutput(this, 'AudioDLQUrl', {
      value: dlq.queueUrl,
      description: 'Dead letter queue URL for failed audio jobs',
    });

    new CfnOutput(this, 'EventBusName', {
      value: eventBus.eventBusName,
      description: 'EventBridge bus for ChiselGrid events',
    });
  }
}
