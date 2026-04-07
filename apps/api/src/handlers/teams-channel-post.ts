/**
 * T-20.9 Channel Auto-Post Handler
 *
 * Triggered by EventBridge article.published event.
 * Reads channel mappings from DynamoDB tenant_config table,
 * posts article-result Adaptive Card to configured Teams channels
 * via incoming webhook URL.
 */

import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION ?? 'ap-southeast-1',
});

interface ChannelMapping {
  tenantId: string;
  categoryId: string;
  teamsChannelId: string;
  webhookUrl: string;
  enabled: boolean;
}

interface ArticlePublishedEvent {
  detail: {
    contentId: string;
    tenantId: string;
    title: string;
    slug: string;
    excerpt: string;
    author: string;
    categoryId: string;
    publishedAt: string;
    readTime: number;
    aiScore: number;
    audioUrl?: string;
  };
  'detail-type': string;
  source: string;
}

function buildArticleCard(article: ArticlePublishedEvent['detail']) {
  const baseUrl = process.env.CHISELGRID_WEB_URL ?? 'https://chiselgrid.com';

  return {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.5',
    body: [
      {
        type: 'Container',
        items: [
          {
            type: 'TextBlock',
            text: '📄 New Article Published',
            size: 'Small',
            weight: 'Bolder',
            color: 'Good',
          },
          {
            type: 'TextBlock',
            text: article.title,
            size: 'Large',
            weight: 'Bolder',
            wrap: true,
          },
          {
            type: 'ColumnSet',
            columns: [
              {
                type: 'Column',
                width: 'auto',
                items: [
                  {
                    type: 'TextBlock',
                    text: `by ${article.author}`,
                    size: 'Small',
                    isSubtle: true,
                  },
                ],
              },
              {
                type: 'Column',
                width: 'auto',
                items: [
                  {
                    type: 'TextBlock',
                    text: `${article.readTime} min read`,
                    size: 'Small',
                    isSubtle: true,
                  },
                ],
              },
              {
                type: 'Column',
                width: 'auto',
                items: [
                  {
                    type: 'TextBlock',
                    text: `AI Score: ${article.aiScore}/100`,
                    size: 'Small',
                    weight: 'Bolder',
                    color: 'Good',
                  },
                ],
              },
            ],
          },
          {
            type: 'TextBlock',
            text: article.excerpt,
            wrap: true,
            maxLines: 3,
          },
        ],
      },
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'Read Article',
        url: `${baseUrl}/articles/${article.slug}`,
      },
      ...(article.audioUrl
        ? [
            {
              type: 'Action.OpenUrl',
              title: 'Listen',
              url: article.audioUrl,
            },
          ]
        : []),
    ],
  };
}

export async function handler(event: ArticlePublishedEvent): Promise<{
  statusCode: number;
  body: string;
}> {
  const { tenantId, categoryId } = event.detail;
  const tableName = process.env.CHANNEL_MAPPING_TABLE ?? 'chiselgrid-teams-channel-mappings';

  try {
    // Query channel mappings for this tenant + category
    const mappingsResult = await dynamoClient.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'tenantId = :tid',
        FilterExpression: '(categoryId = :cid OR categoryId = :all) AND enabled = :enabled',
        ExpressionAttributeValues: {
          ':tid': { S: tenantId },
          ':cid': { S: categoryId },
          ':all': { S: '*' },
          ':enabled': { BOOL: true },
        },
      }),
    );

    const mappings = (mappingsResult.Items ?? []).map(
      (item) => unmarshall(item) as unknown as ChannelMapping,
    );

    if (!mappings.length) {
      console.log(`[ChannelPost] No channel mappings for tenant=${tenantId} category=${categoryId}`);
      return { statusCode: 200, body: 'No channels configured' };
    }

    const card = buildArticleCard(event.detail);

    // Post to each mapped channel
    const results = await Promise.allSettled(
      mappings.map(async (mapping) => {
        const response = await fetch(mapping.webhookUrl, {
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

        if (!response.ok) {
          throw new Error(`Webhook ${mapping.teamsChannelId}: ${response.status}`);
        }

        return mapping.teamsChannelId;
      }),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log(`[ChannelPost] Posted to ${succeeded} channels, ${failed} failed`);
    return { statusCode: 200, body: `Posted to ${succeeded} channels` };
  } catch (error) {
    console.error('[ChannelPost] Error:', error);
    return { statusCode: 500, body: 'Internal error' };
  }
}
