import { DynamoDBClient, GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';

export interface TenantPoolConfig {
  subdomain: string;
  tenantId: string;
  tenantName: string;
  userPoolId: string;
  userPoolClientId: string;
  userPoolClientSecret: string;
  customDomain: string | null;
  plan: string;
  cognitoIssuerUrl: string;
  createdAt: string;
}

const dynamoClient = new DynamoDBClient({});
const TABLE_NAME = process.env['TENANT_POOLS_TABLE'] || 'chiselgrid-tenant-pools-dev';

// In-memory cache with TTL for tenant resolution (5 minutes)
const cache = new Map<string, { config: TenantPoolConfig; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCached(key: string): TenantPoolConfig | null {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.config;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, config: TenantPoolConfig): void {
  cache.set(key, { config, expiresAt: Date.now() + CACHE_TTL_MS });
}

function parseItem(item: Record<string, any>): TenantPoolConfig {
  return {
    subdomain: item['subdomain']?.S || '',
    tenantId: item['tenantId']?.S || '',
    tenantName: item['tenantName']?.S || '',
    userPoolId: item['userPoolId']?.S || '',
    userPoolClientId: item['userPoolClientId']?.S || '',
    userPoolClientSecret: item['userPoolClientSecret']?.S || '',
    customDomain: item['customDomain']?.S || null,
    plan: item['plan']?.S || 'starter',
    cognitoIssuerUrl: item['cognitoIssuerUrl']?.S || '',
    createdAt: item['createdAt']?.S || '',
  };
}

/**
 * Resolves tenant configuration from subdomain.
 */
export async function resolveTenantBySubdomain(subdomain: string): Promise<TenantPoolConfig | null> {
  const cached = getCached(`sub:${subdomain}`);
  if (cached) return cached;

  const result = await dynamoClient.send(new GetItemCommand({
    TableName: TABLE_NAME,
    Key: { subdomain: { S: subdomain } },
  }));

  if (!result.Item) return null;

  const config = parseItem(result.Item);
  setCache(`sub:${subdomain}`, config);
  return config;
}

/**
 * Resolves tenant configuration from custom domain.
 */
export async function resolveTenantByCustomDomain(domain: string): Promise<TenantPoolConfig | null> {
  const cached = getCached(`dom:${domain}`);
  if (cached) return cached;

  const result = await dynamoClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'customDomain-index',
    KeyConditionExpression: 'customDomain = :domain',
    ExpressionAttributeValues: { ':domain': { S: domain } },
    Limit: 1,
  }));

  if (!result.Items || result.Items.length === 0) return null;

  const config = parseItem(result.Items[0]!);
  setCache(`dom:${domain}`, config);
  return config;
}

/**
 * Resolves tenant configuration from tenantId.
 */
export async function resolveTenantById(tenantId: string): Promise<TenantPoolConfig | null> {
  const cached = getCached(`id:${tenantId}`);
  if (cached) return cached;

  const result = await dynamoClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'tenantId-index',
    KeyConditionExpression: 'tenantId = :id',
    ExpressionAttributeValues: { ':id': { S: tenantId } },
    Limit: 1,
  }));

  if (!result.Items || result.Items.length === 0) return null;

  const config = parseItem(result.Items[0]!);
  setCache(`id:${tenantId}`, config);
  return config;
}

/**
 * Resolves tenant from hostname — handles both subdomain and custom domain patterns.
 * Returns null if the hostname is the platform root (no tenant context).
 */
export async function resolveTenantFromHostname(
  hostname: string,
  baseDomain: string,
): Promise<TenantPoolConfig | null> {
  // Check if it's a subdomain of the base domain
  if (hostname.endsWith(`.${baseDomain}`)) {
    const subdomain = hostname.replace(`.${baseDomain}`, '');
    if (subdomain && !subdomain.includes('.')) {
      return resolveTenantBySubdomain(subdomain);
    }
  }

  // Check if it's a custom domain
  if (hostname !== baseDomain) {
    return resolveTenantByCustomDomain(hostname);
  }

  return null;
}

/** Clears the in-memory cache (for testing). */
export function clearTenantCache(): void {
  cache.clear();
}
