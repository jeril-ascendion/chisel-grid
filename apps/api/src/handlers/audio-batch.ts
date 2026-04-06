/**
 * T-08.5: Audio generation for migrated content
 * Batch script that triggers audio generation for all published articles
 * that don't yet have an audioUrl.
 *
 * Invoked manually or via scheduled Lambda.
 * Sends messages to the audio SQS queue for each article needing audio.
 */

import type { Handler } from 'aws-lambda';
import { SQSClient, SendMessageBatchCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({ region: process.env.AWS_REGION ?? 'ap-southeast-1' });
const AUDIO_QUEUE_URL = process.env.AUDIO_QUEUE_URL ?? '';

interface ContentRecord {
  contentId: string;
  tenantId: string;
  title: string;
  blocks: unknown[];
  audioUrl: string | null;
}

interface BatchEvent {
  /** If provided, only process articles from this tenant */
  tenantId?: string;
  /** If provided, process these specific content IDs */
  contentIds?: string[];
  /** Dry run — log what would be queued without actually sending */
  dryRun?: boolean;
}

export const handler: Handler<BatchEvent> = async (event) => {
  const { tenantId, contentIds, dryRun = false } = event;

  console.log('Audio batch generation started', { tenantId, contentIds, dryRun });

  // In production, this queries the DB for published articles without audioUrl.
  // For now, we accept contentIds from the event or query all.
  // This handler is invoked by the migration pipeline (EPIC-09) or manually.

  // Placeholder: In production, fetch from DB
  const articles: ContentRecord[] = [];

  if (contentIds && contentIds.length > 0) {
    console.log(`Processing ${contentIds.length} specific articles`);
    // Fetch specific articles from DB
    // articles = await contentRepo.findByIds(contentIds);
  } else {
    console.log('Processing all published articles without audio');
    // articles = await contentRepo.listWithoutAudio(tenantId);
  }

  // Filter to only articles without audio
  const needsAudio = articles.filter((a) => !a.audioUrl);
  console.log(`Found ${needsAudio.length} articles needing audio generation`);

  if (dryRun) {
    console.log('Dry run — would queue:', needsAudio.map((a) => a.contentId));
    return {
      statusCode: 200,
      body: { message: 'Dry run complete', count: needsAudio.length },
    };
  }

  // Send in batches of 10 (SQS batch limit)
  let queued = 0;
  for (let i = 0; i < needsAudio.length; i += 10) {
    const batch = needsAudio.slice(i, i + 10);

    await sqs.send(
      new SendMessageBatchCommand({
        QueueUrl: AUDIO_QUEUE_URL,
        Entries: batch.map((article, idx) => ({
          Id: `${i + idx}`,
          MessageBody: JSON.stringify({
            contentId: article.contentId,
            tenantId: article.tenantId,
            title: article.title,
            blocks: article.blocks,
          }),
        })),
      }),
    );

    queued += batch.length;
  }

  console.log(`Queued ${queued} audio generation jobs`);

  return {
    statusCode: 200,
    body: { message: `Queued ${queued} audio jobs`, count: queued },
  };
};
