/**
 * T-18.4 Voice Distribution CDK Stack
 *
 * Provisions:
 * - SES inbound rule for voice@{tenantId}.chiselgrid.com
 * - S3 bucket for SES inbound emails
 * - Lambda for MIME parsing and audio extraction
 * - SES email identity and configuration for newsletters
 */

import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as sesActions from 'aws-cdk-lib/aws-ses-actions';
import { Construct } from 'constructs';

interface VoiceDistributionStackProps extends cdk.StackProps {
  mediaBucketArn: string;
  voicePipelineArn: string;
  tenantTableName: string;
}

export class VoiceDistributionStack extends cdk.Stack {
  public readonly emailBucket: s3.Bucket;
  public readonly voiceIngestFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: VoiceDistributionStackProps) {
    super(scope, id, props);

    // S3 bucket for SES inbound emails
    this.emailBucket = new s3.Bucket(this, 'SesInboundBucket', {
      bucketName: `chiselgrid-ses-inbound-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(7), // Raw emails cleaned up after 7 days
          id: 'cleanup-raw-emails',
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Allow SES to write to the bucket
    this.emailBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'AllowSESPuts',
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('ses.amazonaws.com')],
        actions: ['s3:PutObject'],
        resources: [this.emailBucket.arnForObjects('*')],
        conditions: {
          StringEquals: {
            'aws:Referer': this.account,
          },
        },
      }),
    );

    // Lambda for processing inbound voice emails
    this.voiceIngestFunction = new lambda.Function(this, 'VoiceIngestFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'voice-ingest.handler',
      code: lambda.Code.fromAsset('dist/handlers'),
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      environment: {
        MEDIA_BUCKET: cdk.Fn.select(5, cdk.Fn.split(':', props.mediaBucketArn)),
        EMAIL_BUCKET: this.emailBucket.bucketName,
        VOICE_PIPELINE_ARN: props.voicePipelineArn,
        TENANT_TABLE: props.tenantTableName,
        AWS_REGION_NAME: this.region,
      },
    });

    // Grant read from email bucket
    this.emailBucket.grantRead(this.voiceIngestFunction);

    // Grant write to media bucket
    this.voiceIngestFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['s3:PutObject'],
        resources: [`${props.mediaBucketArn}/*`],
      }),
    );

    // Grant Step Functions start execution
    this.voiceIngestFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['states:StartExecution'],
        resources: [props.voicePipelineArn],
      }),
    );

    // Grant DynamoDB read for user resolution
    this.voiceIngestFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:GetItem'],
        resources: [`arn:aws:dynamodb:${this.region}:${this.account}:table/${props.tenantTableName}`],
      }),
    );

    // Grant SES suppression list management
    this.voiceIngestFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'ses:PutSuppressedDestination',
          'ses:DeleteSuppressedDestination',
          'ses:GetSuppressedDestination',
        ],
        resources: ['*'],
      }),
    );

    // SES Receipt Rule Set for voice inbound
    const ruleSet = new ses.ReceiptRuleSet(this, 'VoiceInboundRuleSet', {
      receiptRuleSetName: 'chiselgrid-voice-inbound',
    });

    ruleSet.addRule('VoiceEmailRule', {
      recipients: ['voice.chiselgrid.com'],
      actions: [
        new sesActions.S3({
          bucket: this.emailBucket,
          objectKeyPrefix: 'inbound/',
        }),
        new sesActions.Lambda({
          function: this.voiceIngestFunction,
          invocationType: sesActions.LambdaInvocationType.EVENT,
        }),
      ],
      scanEnabled: true,
    });

    // Outputs
    new cdk.CfnOutput(this, 'EmailBucketName', {
      value: this.emailBucket.bucketName,
    });
    new cdk.CfnOutput(this, 'VoiceIngestFunctionArn', {
      value: this.voiceIngestFunction.functionArn,
    });
  }
}
