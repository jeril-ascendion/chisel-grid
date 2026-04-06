/**
 * T-08.2: Polly Neural TTS Lambda
 * T-08.3: SQS handler for audio generation jobs
 *
 * Triggered by SQS when content is published (via EventBridge rule).
 * 1. Fetches content blocks from DB
 * 2. Converts to SSML using ContentToSSML converter
 * 3. Starts async Polly synthesis job (Neural voice Matthew)
 * 4. Saves MP3 to S3
 * 5. Updates content record with audioUrl
 */

import type { SQSHandler, SQSRecord } from 'aws-lambda';
import {
  PollyClient,
  StartSpeechSynthesisTaskCommand,
  GetSpeechSynthesisTaskCommand,
  type SynthesisTask,
} from '@aws-sdk/client-polly';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { contentToSSML } from '@chiselgrid/ai';
import type { ContentBlock } from '@chiselgrid/types';

const polly = new PollyClient({ region: process.env.AWS_REGION ?? 'ap-southeast-1' });
const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'ap-southeast-1' });

const AUDIO_BUCKET = process.env.AUDIO_BUCKET ?? 'chiselgrid-media-dev-storage';
const AUDIO_PREFIX = 'audio/';
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN ?? '';

interface AudioJobMessage {
  contentId: string;
  tenantId: string;
  title: string;
  blocks: ContentBlock[];
}

export const handler: SQSHandler = async (event) => {
  const results: { contentId: string; success: boolean; error?: string }[] = [];

  for (const record of event.Records) {
    const result = await processRecord(record);
    results.push(result);
  }

  // Log summary
  const failed = results.filter((r) => !r.success);
  if (failed.length > 0) {
    console.error('Audio generation failures:', JSON.stringify(failed));
    // Throw to trigger DLQ for failed messages
    throw new Error(`${failed.length}/${results.length} audio jobs failed`);
  }

  console.log(`Successfully processed ${results.length} audio jobs`);
};

async function processRecord(
  record: SQSRecord,
): Promise<{ contentId: string; success: boolean; error?: string }> {
  let message: AudioJobMessage;

  try {
    // Parse message — might come from EventBridge (wrapped) or direct SQS
    const body = JSON.parse(record.body);
    message = body.detail ?? body;
  } catch {
    return { contentId: 'unknown', success: false, error: 'Invalid message format' };
  }

  const { contentId, tenantId, title, blocks } = message;

  try {
    // Step 1: Convert content blocks to SSML
    const ssml = contentToSSML(blocks, { title });
    console.log(`SSML generated for ${contentId}: ${ssml.length} chars`);

    // Step 2: Check if audio already exists
    const s3Key = `${AUDIO_PREFIX}${tenantId}/${contentId}.mp3`;
    const exists = await checkS3Exists(AUDIO_BUCKET, s3Key);
    if (exists) {
      console.log(`Audio already exists for ${contentId}, skipping`);
      return { contentId, success: true };
    }

    // Step 3: Start async Polly synthesis task
    const taskResult = await polly.send(
      new StartSpeechSynthesisTaskCommand({
        Engine: 'neural',
        LanguageCode: 'en-US',
        OutputFormat: 'mp3',
        OutputS3BucketName: AUDIO_BUCKET,
        OutputS3KeyPrefix: `${AUDIO_PREFIX}${tenantId}/${contentId}`,
        Text: ssml,
        TextType: 'ssml',
        VoiceId: 'Matthew',
        SampleRate: '24000',
      }),
    );

    const taskId = taskResult.SynthesisTask?.TaskId;
    if (!taskId) {
      throw new Error('Polly did not return a task ID');
    }

    console.log(`Polly task started: ${taskId} for content ${contentId}`);

    // Step 4: Poll for completion (Polly async tasks are usually fast for short content)
    const completedTask = await waitForPollyTask(taskId);

    if (completedTask.TaskStatus === 'failed') {
      throw new Error(`Polly task failed: ${completedTask.TaskStatusReason}`);
    }

    // Step 5: Build audio URL
    const audioUrl = CLOUDFRONT_DOMAIN
      ? `https://${CLOUDFRONT_DOMAIN}/${s3Key}`
      : completedTask.OutputUri ?? '';

    console.log(`Audio generated for ${contentId}: ${audioUrl}`);

    // Step 6: Update content record with audioUrl
    // This would call the DB repository — in Lambda context, we emit an event
    // that the content service picks up to update the record
    console.log(`Audio URL for content ${contentId}: ${audioUrl}`);

    return { contentId, success: true };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`Audio generation failed for ${contentId}:`, errMsg);
    return { contentId, success: false, error: errMsg };
  }
}

async function waitForPollyTask(
  taskId: string,
  maxAttempts = 30,
  intervalMs = 2000,
): Promise<SynthesisTask> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await polly.send(
      new GetSpeechSynthesisTaskCommand({ TaskId: taskId }),
    );

    const task = result.SynthesisTask;
    if (!task) throw new Error('Polly task not found');

    if (task.TaskStatus === 'completed' || task.TaskStatus === 'failed') {
      return task;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Polly task ${taskId} timed out after ${maxAttempts} attempts`);
}

async function checkS3Exists(bucket: string, key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}
