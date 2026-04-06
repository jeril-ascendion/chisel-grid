/**
 * T-16.6: Push notification for voice pipeline completion
 *
 * Sends Expo push notifications when the voice content pipeline
 * reaches the Human Review Gate in Step Functions.
 *
 * Triggered by EventBridge event: voice.human_review_ready
 */

import type { EventBridgeHandler } from 'aws-lambda';
import {
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const dynamodb = new DynamoDBClient({
  region: process.env.AWS_REGION ?? 'ap-southeast-1',
});

const USERS_TABLE = process.env.USERS_TABLE ?? 'chiselgrid-users';
const PUSH_TOKENS_TABLE = process.env.PUSH_TOKENS_TABLE ?? 'chiselgrid-push-tokens';
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface VoiceReviewReadyEvent {
  voiceId: string;
  tenantId: string;
  uploadedBy: string;
  contentId: string;
  title: string;
  taskToken: string;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
}

export const handler: EventBridgeHandler<
  'voice.human_review_ready',
  VoiceReviewReadyEvent,
  void
> = async (event) => {
  const detail = event.detail;
  const { voiceId, tenantId, uploadedBy, contentId, title } = detail;

  console.log(
    `Voice review ready notification for voice ${voiceId}, content ${contentId}`,
  );

  try {
    // Get push tokens for all admins in this tenant
    const adminTokens = await getAdminPushTokens(tenantId);

    // Also notify the creator who uploaded
    const creatorToken = await getUserPushToken(uploadedBy);
    if (creatorToken) {
      adminTokens.push(creatorToken);
    }

    if (adminTokens.length === 0) {
      console.log('No push tokens found for notification');
      return;
    }

    // Build notification messages
    const messages: ExpoPushMessage[] = adminTokens.map((token) => ({
      to: token,
      title: 'Voice Draft Ready for Review',
      body: `"${title}" has been generated from a voice recording and is ready for review.`,
      data: {
        type: 'voice_review',
        voiceId,
        contentId,
        tenantId,
      },
      sound: 'default',
      priority: 'high',
      channelId: 'voice-reviews',
    }));

    // Send via Expo Push API (batch)
    const chunks = chunkArray(messages, 100); // Expo allows max 100 per request

    for (const chunk of chunks) {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      if (!response.ok) {
        console.error(
          `Expo push failed: ${response.status} ${response.statusText}`,
        );
      } else {
        const result = await response.json();
        console.log(
          `Push notifications sent: ${chunk.length} messages`,
          JSON.stringify(result),
        );
      }
    }
  } catch (error) {
    console.error('Failed to send voice review notification:', error);
    // Don't throw — notification failure shouldn't block the pipeline
  }
};

async function getAdminPushTokens(tenantId: string): Promise<string[]> {
  try {
    const result = await dynamodb.send(
      new QueryCommand({
        TableName: PUSH_TOKENS_TABLE,
        IndexName: 'tenant-role-index',
        KeyConditionExpression: 'tenantId = :tid AND #role = :role',
        ExpressionAttributeNames: { '#role': 'role' },
        ExpressionAttributeValues: marshall({
          ':tid': tenantId,
          ':role': 'admin',
        }),
      }),
    );

    return (result.Items ?? [])
      .map((item) => unmarshall(item))
      .map((item) => item.pushToken as string)
      .filter(Boolean);
  } catch (error) {
    console.error('Failed to query admin push tokens:', error);
    return [];
  }
}

async function getUserPushToken(userId: string): Promise<string | null> {
  try {
    const result = await dynamodb.send(
      new GetItemCommand({
        TableName: PUSH_TOKENS_TABLE,
        Key: marshall({ userId }),
      }),
    );

    if (!result.Item) return null;
    const item = unmarshall(result.Item);
    return (item.pushToken as string) ?? null;
  } catch (error) {
    console.error('Failed to get user push token:', error);
    return null;
  }
}

function chunkArray<T>(arr: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize));
  }
  return chunks;
}
