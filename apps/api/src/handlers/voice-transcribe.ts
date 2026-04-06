/**
 * T-16.3: Amazon Transcribe integration
 *
 * SQS handler triggered when a voice recording is uploaded to S3.
 * 1. Starts an async Amazon Transcribe job
 * 2. Polls for completion (or receives EventBridge notification)
 * 3. Stores transcript JSON in S3
 * 4. Sends completion event to trigger the voice content pipeline
 */

import type { SQSHandler, SQSRecord } from 'aws-lambda';
import {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
  type TranscriptionJob,
  type LanguageCode,
} from '@aws-sdk/client-transcribe';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';

const transcribe = new TranscribeClient({
  region: process.env.AWS_REGION ?? 'ap-southeast-1',
});
const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'ap-southeast-1' });
const eventBridge = new EventBridgeClient({
  region: process.env.AWS_REGION ?? 'ap-southeast-1',
});

const MEDIA_BUCKET = process.env.MEDIA_BUCKET ?? 'chiselgrid-media';
const TRANSCRIPT_BUCKET = process.env.TRANSCRIPT_BUCKET ?? 'chiselgrid-media';
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME ?? 'chiselgrid-dev-events';
const CUSTOM_VOCABULARY_PREFIX = process.env.CUSTOM_VOCABULARY_PREFIX ?? 'chiselgrid-vocab-';

interface TranscriptionJobMessage {
  voiceId: string;
  tenantId: string;
  s3Key: string;
  durationMs: number;
  uploadedBy: string;
  bucket: string;
  timestamp: string;
  languageCode?: string;
}

export interface TranscriptSegment {
  startTime: number;
  endTime: number;
  content: string;
  type: 'pronunciation' | 'punctuation';
  confidence: number;
}

export interface TranscriptResult {
  voiceId: string;
  tenantId: string;
  fullText: string;
  segments: TranscriptSegment[];
  languageCode: string;
  durationMs: number;
  s3TranscriptKey: string;
}

export const handler: SQSHandler = async (event) => {
  const results: { voiceId: string; success: boolean; error?: string }[] = [];

  for (const record of event.Records) {
    const result = await processTranscriptionJob(record);
    results.push(result);
  }

  const failed = results.filter((r) => !r.success);
  if (failed.length > 0) {
    console.error('Transcription failures:', JSON.stringify(failed));
    throw new Error(`${failed.length}/${results.length} transcription jobs failed`);
  }

  console.log(`Successfully processed ${results.length} transcription jobs`);
};

async function processTranscriptionJob(
  record: SQSRecord,
): Promise<{ voiceId: string; success: boolean; error?: string }> {
  let message: TranscriptionJobMessage;

  try {
    const body = JSON.parse(record.body);
    message = body.detail ?? body;
  } catch {
    return { voiceId: 'unknown', success: false, error: 'Invalid message format' };
  }

  const { voiceId, tenantId, s3Key, durationMs, uploadedBy } = message;
  const jobName = `chiselgrid-${voiceId}`;

  try {
    // Check if a custom vocabulary exists for this tenant
    const vocabularyName = `${CUSTOM_VOCABULARY_PREFIX}${tenantId}`;

    // Start transcription job
    const mediaUri = `s3://${message.bucket ?? MEDIA_BUCKET}/${s3Key}`;

    // Build transcription job params
    // If tenant specified a language, use custom vocab; otherwise auto-detect
    if (message.languageCode) {
      await transcribe.send(
        new StartTranscriptionJobCommand({
          TranscriptionJobName: jobName,
          Media: { MediaFileUri: mediaUri },
          OutputBucketName: TRANSCRIPT_BUCKET,
          OutputKey: `${tenantId}/transcripts/${voiceId}.json`,
          LanguageCode: message.languageCode as LanguageCode,
          Settings: {
            VocabularyName: vocabularyName,
          },
        }),
      );
    } else {
      await transcribe.send(
        new StartTranscriptionJobCommand({
          TranscriptionJobName: jobName,
          Media: { MediaFileUri: mediaUri },
          OutputBucketName: TRANSCRIPT_BUCKET,
          OutputKey: `${tenantId}/transcripts/${voiceId}.json`,
          IdentifyLanguage: true,
        }),
      );
    }

    console.log(`Transcription job started: ${jobName} for voice ${voiceId}`);

    // Poll for completion
    const completedJob = await waitForTranscriptionJob(jobName);

    if (completedJob.TranscriptionJobStatus === 'FAILED') {
      throw new Error(
        `Transcription failed: ${completedJob.FailureReason}`,
      );
    }

    // Fetch the transcript from S3
    const transcriptKey = `${tenantId}/transcripts/${voiceId}.json`;
    const transcriptObj = await s3.send(
      new GetObjectCommand({
        Bucket: TRANSCRIPT_BUCKET,
        Key: transcriptKey,
      }),
    );

    const transcriptRaw = await transcriptObj.Body?.transformToString();
    if (!transcriptRaw) {
      throw new Error('Empty transcript response');
    }

    const transcriptData = JSON.parse(transcriptRaw) as {
      results: {
        transcripts: Array<{ transcript: string }>;
        items: Array<{
          start_time?: string;
          end_time?: string;
          alternatives: Array<{ content: string; confidence: string }>;
          type: string;
        }>;
        language_code?: string;
      };
    };

    // Extract full text and segments
    const fullText =
      transcriptData.results.transcripts
        .map((t) => t.transcript)
        .join(' ') ?? '';

    const segments: TranscriptSegment[] =
      transcriptData.results.items.map((item) => ({
        startTime: parseFloat(item.start_time ?? '0'),
        endTime: parseFloat(item.end_time ?? '0'),
        content: item.alternatives[0]?.content ?? '',
        type: item.type as 'pronunciation' | 'punctuation',
        confidence: parseFloat(item.alternatives[0]?.confidence ?? '0'),
      }));

    const detectedLanguage =
      completedJob.LanguageCode ??
      transcriptData.results.language_code ??
      'en-US';

    // Store processed transcript
    const processedTranscript: TranscriptResult = {
      voiceId,
      tenantId,
      fullText,
      segments,
      languageCode: detectedLanguage,
      durationMs,
      s3TranscriptKey: transcriptKey,
    };

    const processedKey = `${tenantId}/transcripts/${voiceId}-processed.json`;
    await s3.send(
      new PutObjectCommand({
        Bucket: TRANSCRIPT_BUCKET,
        Key: processedKey,
        ContentType: 'application/json',
        Body: JSON.stringify(processedTranscript),
        Metadata: {
          'tenant-id': tenantId,
          'voice-id': voiceId,
          'language-code': detectedLanguage,
        },
      }),
    );

    // Emit event to trigger voice content pipeline
    await eventBridge.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: 'chiselgrid.voice',
            DetailType: 'voice.transcribed',
            EventBusName: EVENT_BUS_NAME,
            Detail: JSON.stringify({
              voiceId,
              tenantId,
              uploadedBy,
              transcriptKey: processedKey,
              fullText,
              languageCode: detectedLanguage,
              durationMs,
              segmentCount: segments.length,
            }),
          },
        ],
      }),
    );

    console.log(
      `Transcription complete for ${voiceId}: ${fullText.length} chars, ${segments.length} segments, language: ${detectedLanguage}`,
    );

    return { voiceId, success: true };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`Transcription failed for ${voiceId}:`, errMsg);
    return { voiceId, success: false, error: errMsg };
  }
}

async function waitForTranscriptionJob(
  jobName: string,
  maxAttempts = 60,
  intervalMs = 5000,
): Promise<TranscriptionJob> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await transcribe.send(
      new GetTranscriptionJobCommand({
        TranscriptionJobName: jobName,
      }),
    );

    const job = result.TranscriptionJob;
    if (!job) throw new Error('Transcription job not found');

    if (
      job.TranscriptionJobStatus === 'COMPLETED' ||
      job.TranscriptionJobStatus === 'FAILED'
    ) {
      return job;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `Transcription job ${jobName} timed out after ${maxAttempts} attempts`,
  );
}
