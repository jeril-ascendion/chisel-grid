import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { ScheduledEvent } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand, UpdateItemCommand, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { extractUserContext, jsonResponse } from '../types';

const dynamoClient = new DynamoDBClient({});
const TENANT_POOLS_TABLE = process.env['TENANT_POOLS_TABLE'] || 'chiselgrid-tenant-pools-dev';
const USAGE_TABLE = process.env['USAGE_TABLE'] || 'chiselgrid-usage-dev';

interface MonthlyUsage {
  tenantId: string;
  month: string; // YYYY-MM
  aiTokensUsed: number;
  contentItemsCreated: number;
  storageUsedMb: number;
  audioGenerations: number;
  apiCalls: number;
}

/**
 * API handler for usage queries.
 * GET /usage/current — Current month usage for tenant
 * GET /usage/history — Historical usage (last 12 months)
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userCtx = extractUserContext(event);
  if (userCtx.role !== 'admin') {
    return jsonResponse(403, { error: 'Admin access required' });
  }

  const path = event.path || '';

  if (path.endsWith('/current')) {
    return getCurrentUsage(userCtx.tenantId);
  } else if (path.endsWith('/history')) {
    return getUsageHistory(userCtx.tenantId);
  }

  return jsonResponse(404, { error: 'Not found' });
}

async function getCurrentUsage(tenantId: string): Promise<APIGatewayProxyResult> {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  const result = await dynamoClient.send(new GetItemCommand({
    TableName: USAGE_TABLE,
    Key: {
      tenantId: { S: tenantId },
      month: { S: currentMonth },
    },
  }));

  if (!result.Item) {
    return jsonResponse(200, {
      tenantId,
      month: currentMonth,
      aiTokensUsed: 0,
      contentItemsCreated: 0,
      storageUsedMb: 0,
      audioGenerations: 0,
      apiCalls: 0,
    });
  }

  return jsonResponse(200, {
    tenantId,
    month: currentMonth,
    aiTokensUsed: Number(result.Item['aiTokensUsed']?.N || '0'),
    contentItemsCreated: Number(result.Item['contentItemsCreated']?.N || '0'),
    storageUsedMb: Number(result.Item['storageUsedMb']?.N || '0'),
    audioGenerations: Number(result.Item['audioGenerations']?.N || '0'),
    apiCalls: Number(result.Item['apiCalls']?.N || '0'),
  });
}

async function getUsageHistory(tenantId: string): Promise<APIGatewayProxyResult> {
  const result = await dynamoClient.send(new QueryCommand({
    TableName: USAGE_TABLE,
    KeyConditionExpression: 'tenantId = :tid',
    ExpressionAttributeValues: {
      ':tid': { S: tenantId },
    },
    ScanIndexForward: false, // Most recent first
    Limit: 12,
  }));

  const history = (result.Items || []).map((item) => ({
    month: item['month']?.S || '',
    aiTokensUsed: Number(item['aiTokensUsed']?.N || '0'),
    contentItemsCreated: Number(item['contentItemsCreated']?.N || '0'),
    storageUsedMb: Number(item['storageUsedMb']?.N || '0'),
    audioGenerations: Number(item['audioGenerations']?.N || '0'),
    apiCalls: Number(item['apiCalls']?.N || '0'),
  }));

  return jsonResponse(200, { tenantId, history });
}

/**
 * Increments a usage counter for a tenant.
 * Called internally when AI tokens are consumed, content is created, etc.
 */
export async function incrementUsage(
  tenantId: string,
  metric: 'aiTokensUsed' | 'contentItemsCreated' | 'storageUsedMb' | 'audioGenerations' | 'apiCalls',
  amount: number,
): Promise<void> {
  const currentMonth = new Date().toISOString().slice(0, 7);

  await dynamoClient.send(new UpdateItemCommand({
    TableName: USAGE_TABLE,
    Key: {
      tenantId: { S: tenantId },
      month: { S: currentMonth },
    },
    UpdateExpression: `ADD ${metric} :amount`,
    ExpressionAttributeValues: {
      ':amount': { N: String(amount) },
    },
  }));
}

/**
 * Monthly billing aggregation Lambda.
 * Triggered by EventBridge schedule (1st of each month).
 * Calculates overage charges and reports to Stripe.
 */
export async function billingAggregation(event: ScheduledEvent): Promise<void> {
  const previousMonth = getPreviousMonth();
  console.log(`Running billing aggregation for ${previousMonth}`);

  // Scan all tenants with active subscriptions
  // In production, this would paginate through all tenants
  const result = await dynamoClient.send(new QueryCommand({
    TableName: USAGE_TABLE,
    IndexName: 'month-index',
    KeyConditionExpression: '#m = :month',
    ExpressionAttributeNames: { '#m': 'month' },
    ExpressionAttributeValues: { ':month': { S: previousMonth } },
  }));

  for (const item of result.Items || []) {
    const tenantId = item['tenantId']?.S || '';
    const aiTokensUsed = Number(item['aiTokensUsed']?.N || '0');

    // Look up tenant plan limits
    const tenantResult = await dynamoClient.send(new GetItemCommand({
      TableName: TENANT_POOLS_TABLE,
      Key: { subdomain: { S: tenantId } }, // Would use GSI in production
      ProjectionExpression: '#p, stripeSubscriptionId',
      ExpressionAttributeNames: { '#p': 'plan' },
    }));

    const plan = tenantResult.Item?.['plan']?.S || 'starter';
    const subscriptionId = tenantResult.Item?.['stripeSubscriptionId']?.S;

    // Calculate overage
    const planTokenLimit = getPlanTokenLimit(plan);
    const overage = Math.max(0, aiTokensUsed - planTokenLimit);

    if (overage > 0 && subscriptionId) {
      console.log(`Tenant ${tenantId}: ${overage} overage tokens on ${plan} plan`);
      // In production: Report overage to Stripe as metered usage
      // await reportOverageToStripe(subscriptionId, overage);
    }

    console.log(`Tenant ${tenantId}: ${aiTokensUsed} tokens used, ${plan} plan, ${overage} overage`);
  }
}

function getPlanTokenLimit(plan: string): number {
  const limits: Record<string, number> = {
    internal: 999_999_999,
    starter: 500_000,
    professional: 5_000_000,
    enterprise: 999_999_999,
  };
  return limits[plan] || 500_000;
}

function getPreviousMonth(): string {
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  return now.toISOString().slice(0, 7);
}
