/**
 * T-20.5 Monday Morning Digest Lambda
 *
 * EventBridge scheduled rule fires every Monday 9am SGT (Sunday 1am UTC).
 * Fetches pending reviews from ChiselGrid API and sends an Adaptive Card
 * summary to the configured admin Teams channel.
 */

import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION ?? 'ap-southeast-1',
});

interface PendingReview {
  id: string;
  title: string;
  author: string;
  submittedAt: string;
  qualityScore: number;
}

interface TenantTeamsConfig {
  tenantId: string;
  adminChannelWebhookUrl: string;
  adminChannelId: string;
}

/**
 * Build Adaptive Card for weekly digest.
 */
function buildDigestCard(reviews: PendingReview[], weekOf: string) {
  return {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.5',
    body: [
      {
        type: 'TextBlock',
        text: `📋 Weekly Review Digest — ${weekOf}`,
        size: 'Large',
        weight: 'Bolder',
        wrap: true,
      },
      {
        type: 'TextBlock',
        text: `${reviews.length} article${reviews.length === 1 ? '' : 's'} pending review`,
        size: 'Medium',
        color: reviews.length > 5 ? 'Attention' : 'Default',
        wrap: true,
      },
      ...reviews.slice(0, 10).map((r) => ({
        type: 'Container',
        items: [
          {
            type: 'ColumnSet',
            columns: [
              {
                type: 'Column',
                width: 'stretch',
                items: [
                  {
                    type: 'TextBlock',
                    text: r.title,
                    weight: 'Bolder',
                    wrap: true,
                  },
                  {
                    type: 'TextBlock',
                    text: `by ${r.author} — Score: ${r.qualityScore}/100`,
                    size: 'Small',
                    isSubtle: true,
                    wrap: true,
                  },
                ],
              },
              {
                type: 'Column',
                width: 'auto',
                items: [
                  {
                    type: 'ActionSet',
                    actions: [
                      {
                        type: 'Action.Execute',
                        title: 'Review',
                        verb: 'openReview',
                        data: { contentId: r.id },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        separator: true,
      })),
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'Open Review Dashboard',
        url: `${process.env.CHISELGRID_WEB_URL ?? 'https://chiselgrid.com'}/admin/content?status=in_review`,
      },
    ],
  };
}

/**
 * Lambda handler — triggered by EventBridge schedule rule.
 */
export async function handler(): Promise<{ statusCode: number; body: string }> {
  const apiUrl = process.env.CHISELGRID_API_URL ?? 'https://api.chiselgrid.com';
  const tableName = process.env.TENANT_CONFIG_TABLE ?? 'chiselgrid-tenant-config';

  try {
    // Fetch pending reviews
    const reviewsResponse = await fetch(`${apiUrl}/api/content?status=in_review`);
    const reviews = (await reviewsResponse.json()) as PendingReview[];

    if (!reviews.length) {
      console.log('[MondayDigest] No pending reviews, skipping digest.');
      return { statusCode: 200, body: 'No pending reviews' };
    }

    // Get tenant Teams config from DynamoDB
    const configResult = await dynamoClient.send(
      new GetItemCommand({
        TableName: tableName,
        Key: { tenantId: { S: 'default' }, configKey: { S: 'teams_admin_channel' } },
      }),
    );

    if (!configResult.Item) {
      console.log('[MondayDigest] No admin channel configured.');
      return { statusCode: 200, body: 'No admin channel configured' };
    }

    const tenantConfig = unmarshall(configResult.Item) as unknown as TenantTeamsConfig;
    const webhookUrl = tenantConfig.adminChannelWebhookUrl;

    if (!webhookUrl) {
      console.log('[MondayDigest] No webhook URL configured.');
      return { statusCode: 200, body: 'No webhook URL' };
    }

    // Build and send Adaptive Card
    const weekOf = new Date().toISOString().split('T')[0];
    const card = buildDigestCard(reviews, weekOf);

    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'message',
        attachments: [
          {
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: card,
          },
        ],
      }),
    });

    if (!webhookResponse.ok) {
      throw new Error(`Webhook failed: ${webhookResponse.status}`);
    }

    console.log(`[MondayDigest] Sent digest with ${reviews.length} reviews.`);
    return { statusCode: 200, body: `Sent ${reviews.length} reviews` };
  } catch (error) {
    console.error('[MondayDigest] Error:', error);
    return { statusCode: 500, body: 'Internal error' };
  }
}
