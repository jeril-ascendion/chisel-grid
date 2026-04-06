/**
 * Lambda@Edge Origin Request handler for multi-tenant routing.
 * Runs at CloudFront edge to:
 * 1. Extract hostname from request
 * 2. Resolve tenant from DynamoDB (subdomain or custom domain)
 * 3. Inject x-tenant-id and x-tenant-config headers into origin request
 *
 * This function runs in us-east-1 (Lambda@Edge requirement) but reads from
 * a DynamoDB Global Table replicated to the edge region.
 */

import { DynamoDBClient, GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const TABLE_NAME = process.env['TENANT_POOLS_TABLE'] || 'chiselgrid-tenant-pools-dev';
const BASE_DOMAIN = process.env['BASE_DOMAIN'] || 'chiselgrid.com';

// In-memory cache for edge function (persists across invocations on same container)
const tenantCache = new Map<string, { tenantId: string; config: string; expiresAt: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute at edge

interface CloudFrontRequest {
  uri: string;
  headers: Record<string, Array<{ key: string; value: string }>>;
  origin?: {
    s3?: { customHeaders: Record<string, Array<{ key: string; value: string }>> };
    custom?: { customHeaders: Record<string, Array<{ key: string; value: string }>> };
  };
}

interface CloudFrontEvent {
  Records: Array<{
    cf: {
      request: CloudFrontRequest;
    };
  }>;
}

async function resolveTenant(hostname: string): Promise<{ tenantId: string; config: string } | null> {
  // Check cache
  const cached = tenantCache.get(hostname);
  if (cached && cached.expiresAt > Date.now()) {
    return { tenantId: cached.tenantId, config: cached.config };
  }

  let tenantData: Record<string, any> | undefined;

  // Try subdomain resolution first
  if (hostname.endsWith(`.${BASE_DOMAIN}`)) {
    const subdomain = hostname.replace(`.${BASE_DOMAIN}`, '');
    if (subdomain && !subdomain.includes('.')) {
      const result = await dynamoClient.send(new GetItemCommand({
        TableName: TABLE_NAME,
        Key: { subdomain: { S: subdomain } },
      }));
      tenantData = result.Item;
    }
  }

  // Fall back to custom domain lookup
  if (!tenantData && hostname !== BASE_DOMAIN) {
    const result = await dynamoClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'customDomain-index',
      KeyConditionExpression: 'customDomain = :domain',
      ExpressionAttributeValues: { ':domain': { S: hostname } },
      Limit: 1,
    }));
    tenantData = result.Items?.[0];
  }

  if (!tenantData) return null;

  const tenantId = tenantData['tenantId']?.S || '';
  const config = JSON.stringify({
    tenantId,
    subdomain: tenantData['subdomain']?.S || '',
    tenantName: tenantData['tenantName']?.S || '',
    plan: tenantData['plan']?.S || 'starter',
    userPoolId: tenantData['userPoolId']?.S || '',
    userPoolClientId: tenantData['userPoolClientId']?.S || '',
  });

  // Cache the result
  tenantCache.set(hostname, { tenantId, config, expiresAt: Date.now() + CACHE_TTL_MS });

  return { tenantId, config };
}

export async function handler(event: CloudFrontEvent): Promise<CloudFrontRequest> {
  const request = event.Records[0]!.cf.request;

  // Extract hostname from Host header
  const hostHeader = request.headers['host']?.[0]?.value || '';
  const hostname = hostHeader.split(':')[0]!; // Remove port if present

  // Resolve tenant
  const tenant = await resolveTenant(hostname);

  if (tenant) {
    // Inject tenant headers into the origin request
    request.headers['x-tenant-id'] = [{ key: 'X-Tenant-Id', value: tenant.tenantId }];
    request.headers['x-tenant-config'] = [{ key: 'X-Tenant-Config', value: tenant.config }];
  } else {
    // Default/platform tenant — use 'default' tenantId
    request.headers['x-tenant-id'] = [{ key: 'X-Tenant-Id', value: 'default' }];
  }

  return request;
}
