import {
  Stack,
  type StackProps,
  Tags,
  Duration,
  RemovalPolicy,
  CfnOutput,
} from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as logs from 'aws-cdk-lib/aws-logs';
import type { Construct } from 'constructs';
import type { EnvConfig } from '../config';

export class AiStack extends Stack {
  public readonly pipelineLambda: lambda.Function;
  public readonly humanReviewLambda: lambda.Function;
  public readonly stateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, config: EnvConfig, props?: StackProps) {
    super(scope, id, props);
    Tags.of(this).add('Project', 'ChiselGrid');
    Tags.of(this).add('ManagedBy', 'CDK');

    const envPrefix = id.split('-')[1] ?? 'dev';

    // --- Pipeline Lambda (handles all AI steps) ---
    this.pipelineLambda = new lambda.Function(this, 'PipelineLambda', {
      functionName: `chiselgrid-${envPrefix}-ai-pipeline`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('// Bundled at deploy time by esbuild'),
      memorySize: 1024,
      timeout: Duration.minutes(5),
      environment: {
        AWS_BEDROCK_REGION: config.region,
        NODE_OPTIONS: '--enable-source-maps',
      },
    });

    // Bedrock invoke permissions
    this.pipelineLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: ['*'],
      }),
    );

    // --- Human Review Lambda (handles approve/reject callback) ---
    this.humanReviewLambda = new lambda.Function(this, 'HumanReviewLambda', {
      functionName: `chiselgrid-${envPrefix}-human-review`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('// Bundled at deploy time by esbuild'),
      memorySize: 256,
      timeout: Duration.seconds(30),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
      },
    });

    // --- Step Functions State Machine ---

    // Step 1: Writer
    const writerTask = new tasks.LambdaInvoke(this, 'WriterStep', {
      lambdaFunction: this.pipelineLambda,
      payload: sfn.TaskInput.fromObject({
        step: 'writer',
        payload: sfn.JsonPath.entirePayload,
      }),
      outputPath: '$.Payload',
      resultPath: '$',
    });

    // Step 2: Review
    const reviewTask = new tasks.LambdaInvoke(this, 'ReviewStep', {
      lambdaFunction: this.pipelineLambda,
      payload: sfn.TaskInput.fromObject({
        step: 'review',
        payload: sfn.JsonPath.entirePayload,
      }),
      outputPath: '$.Payload',
      resultPath: '$',
    });

    // Step 3: Revision Decision
    const revisionDecisionTask = new tasks.LambdaInvoke(this, 'RevisionDecisionStep', {
      lambdaFunction: this.pipelineLambda,
      payload: sfn.TaskInput.fromObject({
        step: 'revisionDecision',
        payload: sfn.JsonPath.entirePayload,
      }),
      outputPath: '$.Payload',
      resultPath: '$',
    });

    // Step 4: SEO
    const seoTask = new tasks.LambdaInvoke(this, 'SEOStep', {
      lambdaFunction: this.pipelineLambda,
      payload: sfn.TaskInput.fromObject({
        step: 'seo',
        payload: sfn.JsonPath.entirePayload,
      }),
      outputPath: '$.Payload',
      resultPath: '$',
    });

    // Step 5: Human Review (waitForTaskToken)
    const humanReviewWait = new tasks.LambdaInvoke(this, 'HumanReviewGate', {
      lambdaFunction: this.humanReviewLambda,
      integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
      payload: sfn.TaskInput.fromObject({
        taskToken: sfn.JsonPath.taskToken,
        contentId: sfn.JsonPath.stringAt('$.contentId'),
        review: sfn.JsonPath.objectAt('$.review'),
        seo: sfn.JsonPath.objectAt('$.seo'),
        blocks: sfn.JsonPath.objectAt('$.blocks'),
      }),
      resultPath: '$.humanDecision',
      heartbeatTimeout: sfn.Timeout.duration(Duration.days(7)),
    });

    // Step 6: Publish
    const publishTask = new tasks.LambdaInvoke(this, 'PublishStep', {
      lambdaFunction: this.pipelineLambda,
      payload: sfn.TaskInput.fromObject({
        step: 'publish',
        payload: sfn.JsonPath.entirePayload,
      }),
      outputPath: '$.Payload',
      resultPath: '$',
    });

    // Revision loop choice
    const needsRevisionChoice = new sfn.Choice(this, 'NeedsRevision?')
      .when(
        sfn.Condition.booleanEquals('$.needsRevision', true),
        writerTask,
      )
      .otherwise(seoTask);

    // Chain: Writer → Review → Decision → (loop or SEO) → Human Gate → Publish
    const definition = writerTask
      .next(reviewTask)
      .next(revisionDecisionTask)
      .next(needsRevisionChoice);

    seoTask.next(humanReviewWait);
    humanReviewWait.next(publishTask);

    // Log group for state machine
    const logGroup = new logs.LogGroup(this, 'PipelineLogGroup', {
      logGroupName: `/aws/states/chiselgrid-${envPrefix}-content-pipeline`,
      removalPolicy: config.enableDeletion ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
      retention: logs.RetentionDays.ONE_MONTH,
    });

    this.stateMachine = new sfn.StateMachine(this, 'ContentPipeline', {
      stateMachineName: `chiselgrid-${envPrefix}-content-pipeline`,
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      timeout: Duration.days(14),
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ERROR,
      },
    });

    // Grant human review Lambda permission to send task success/failure
    this.stateMachine.grantTaskResponse(this.humanReviewLambda);

    // SES permissions for human review notifications
    this.humanReviewLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendEmail', 'ses:SendRawEmail'],
        resources: ['*'],
      }),
    );

    // --- Outputs ---
    new CfnOutput(this, 'StateMachineArn', {
      value: this.stateMachine.stateMachineArn,
      exportName: `ChiselGrid-${envPrefix}-ContentPipelineArn`,
    });

    new CfnOutput(this, 'PipelineLambdaArn', {
      value: this.pipelineLambda.functionArn,
      exportName: `ChiselGrid-${envPrefix}-PipelineLambdaArn`,
    });
  }
}
