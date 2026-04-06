/**
 * T-17.5: Voice pipeline Lambda handler
 *
 * Step Functions handler for the voice content pipeline.
 * Triggered by EventBridge event: voice.transcribed
 *
 * Orchestrates: Structure → Gap Detection → Write → Fidelity → Review
 * Then emits voice.human_review_ready for notification.
 */

import type { EventBridgeHandler } from 'aws-lambda';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';
import { BedrockClient, VoiceContentPipeline } from '@chiselgrid/ai';

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'ap-southeast-1' });
const eventBridge = new EventBridgeClient({
  region: process.env.AWS_REGION ?? 'ap-southeast-1',
});

const TRANSCRIPT_BUCKET = process.env.TRANSCRIPT_BUCKET ?? 'chiselgrid-media';
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME ?? 'chiselgrid-dev-events';
const BEDROCK_MODEL_ID =
  process.env.BEDROCK_MODEL_ID ?? 'anthropic.claude-3-5-sonnet-20241022-v2:0';

interface VoiceTranscribedEvent {
  voiceId: string;
  tenantId: string;
  uploadedBy: string;
  transcriptKey: string;
  fullText: string;
  languageCode: string;
  durationMs: number;
  segmentCount: number;
}

export const handler: EventBridgeHandler<
  'voice.transcribed',
  VoiceTranscribedEvent,
  void
> = async (event) => {
  const detail = event.detail;
  const { voiceId, tenantId, uploadedBy, transcriptKey, fullText, languageCode, durationMs } =
    detail;

  console.log(
    `Voice pipeline triggered for ${voiceId}: ${fullText.length} chars, language: ${languageCode}`,
  );

  try {
    // Initialize Bedrock client and pipeline
    const bedrock = new BedrockClient({
      region: process.env.AWS_REGION ?? 'ap-southeast-1',
      modelId: BEDROCK_MODEL_ID,
    });

    const pipeline = new VoiceContentPipeline(bedrock);

    // Run the full pipeline
    const result = await pipeline.run({
      voiceId,
      tenantId,
      uploadedBy,
      transcriptText: fullText,
      languageCode,
      durationMs,
    });

    // Store pipeline result in S3
    const resultKey = `${tenantId}/voice-drafts/${voiceId}-result.json`;
    await s3.send(
      new PutObjectCommand({
        Bucket: TRANSCRIPT_BUCKET,
        Key: resultKey,
        ContentType: 'application/json',
        Body: JSON.stringify(result),
        Metadata: {
          'tenant-id': tenantId,
          'voice-id': voiceId,
          'fidelity-score': String(result.fidelityReport.fidelityScore),
          'review-score': String(result.reviewReport.overallScore),
        },
      }),
    );

    // Emit event for human review notification
    await eventBridge.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: 'chiselgrid.voice',
            DetailType: 'voice.human_review_ready',
            EventBusName: EVENT_BUS_NAME,
            Detail: JSON.stringify({
              voiceId,
              tenantId,
              uploadedBy,
              contentId: voiceId, // Using voiceId as contentId until DB record created
              title: result.suggestedTitle,
              fidelityScore: result.fidelityReport.fidelityScore,
              reviewScore: result.reviewReport.overallScore,
              gapCount: result.gapDetection.unresolvedCount,
              languageCode,
              resultKey,
            }),
          },
        ],
      }),
    );

    console.log(
      `Voice pipeline complete for ${voiceId}: ` +
        `fidelity=${result.fidelityReport.fidelityScore}, ` +
        `review=${result.reviewReport.overallScore}, ` +
        `gaps=${result.gapDetection.unresolvedCount}, ` +
        `tokens=${result.totalTokensUsed.input}+${result.totalTokensUsed.output}`,
    );
  } catch (error) {
    console.error(`Voice pipeline failed for ${voiceId}:`, error);

    // Emit failure event
    await eventBridge.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: 'chiselgrid.voice',
            DetailType: 'voice.pipeline_failed',
            EventBusName: EVENT_BUS_NAME,
            Detail: JSON.stringify({
              voiceId,
              tenantId,
              uploadedBy,
              error: error instanceof Error ? error.message : String(error),
            }),
          },
        ],
      }),
    );

    throw error;
  }
};
