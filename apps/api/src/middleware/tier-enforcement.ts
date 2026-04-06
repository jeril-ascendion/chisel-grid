import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { extractUserContext, jsonResponse } from '../types';

const dynamoClient = new DynamoDBClient({});
const TENANT_POOLS_TABLE = process.env['TENANT_POOLS_TABLE'] || 'chiselgrid-tenant-pools-dev';

/** Plan limits configuration */
interface PlanLimits {
  maxContentItems: number;
  maxUsersCount: number;
  maxAiTokensPerMonth: number;
  maxStorageMb: number;
  features: {
    aiContentGeneration: boolean;
    audioNarration: boolean;
    customDomain: boolean;
    ssoIntegration: boolean;
    apiAccess: boolean;
    advancedAnalytics: boolean;
    whiteLabel: boolean;
  };
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  internal: {
    maxContentItems: 999_999,
    maxUsersCount: 999_999,
    maxAiTokensPerMonth: 999_999_999,
    maxStorageMb: 999_999,
    features: {
      aiContentGeneration: true,
      audioNarration: true,
      customDomain: true,
      ssoIntegration: true,
      apiAccess: true,
      advancedAnalytics: true,
      whiteLabel: true,
    },
  },
  starter: {
    maxContentItems: 100,
    maxUsersCount: 5,
    maxAiTokensPerMonth: 500_000,
    maxStorageMb: 1_000,
    features: {
      aiContentGeneration: true,
      audioNarration: false,
      customDomain: false,
      ssoIntegration: false,
      apiAccess: false,
      advancedAnalytics: false,
      whiteLabel: false,
    },
  },
  professional: {
    maxContentItems: 1_000,
    maxUsersCount: 25,
    maxAiTokensPerMonth: 5_000_000,
    maxStorageMb: 10_000,
    features: {
      aiContentGeneration: true,
      audioNarration: true,
      customDomain: true,
      ssoIntegration: false,
      apiAccess: true,
      advancedAnalytics: true,
      whiteLabel: false,
    },
  },
  enterprise: {
    maxContentItems: 999_999,
    maxUsersCount: 999_999,
    maxAiTokensPerMonth: 999_999_999,
    maxStorageMb: 999_999,
    features: {
      aiContentGeneration: true,
      audioNarration: true,
      customDomain: true,
      ssoIntegration: true,
      apiAccess: true,
      advancedAnalytics: true,
      whiteLabel: true,
    },
  },
};

// Cache tenant plan info (5 min TTL)
const planCache = new Map<string, { plan: string; expiresAt: number }>();
const CACHE_TTL_MS = 300_000;

async function getTenantPlan(subdomain: string): Promise<string> {
  const cached = planCache.get(subdomain);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.plan;
  }

  const result = await dynamoClient.send(new GetItemCommand({
    TableName: TENANT_POOLS_TABLE,
    Key: { subdomain: { S: subdomain } },
    ProjectionExpression: '#p',
    ExpressionAttributeNames: { '#p': 'plan' },
  }));

  const plan = result.Item?.['plan']?.S || 'starter';
  planCache.set(subdomain, { plan, expiresAt: Date.now() + CACHE_TTL_MS });
  return plan;
}

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS['starter']!;
}

/**
 * Middleware that checks if a feature is enabled for the tenant's plan.
 * Returns a 403 response if the feature is not available.
 */
export async function enforceFeature(
  event: APIGatewayProxyEvent,
  feature: keyof PlanLimits['features'],
): Promise<APIGatewayProxyResult | null> {
  const userCtx = extractUserContext(event);
  const plan = await getTenantPlan(userCtx.tenantId);
  const limits = getPlanLimits(plan);

  if (!limits.features[feature]) {
    return jsonResponse(403, {
      error: 'Feature not available',
      feature,
      currentPlan: plan,
      message: `The "${feature}" feature is not available on the ${plan} plan. Please upgrade to access this feature.`,
      upgradeUrl: '/admin/tenant?tab=billing',
    });
  }

  return null; // Feature is allowed
}

/**
 * Checks if a numeric limit has been reached.
 * Returns a 429 response if the limit is exceeded.
 */
export async function enforceLimit(
  event: APIGatewayProxyEvent,
  limitType: 'maxContentItems' | 'maxUsersCount' | 'maxAiTokensPerMonth' | 'maxStorageMb',
  currentUsage: number,
): Promise<APIGatewayProxyResult | null> {
  const userCtx = extractUserContext(event);
  const plan = await getTenantPlan(userCtx.tenantId);
  const limits = getPlanLimits(plan);

  const limit = limits[limitType];
  if (currentUsage >= limit) {
    return jsonResponse(429, {
      error: 'Plan limit reached',
      limitType,
      currentUsage,
      limit,
      currentPlan: plan,
      message: `You have reached the ${limitType} limit (${currentUsage}/${limit}) for the ${plan} plan.`,
      upgradeUrl: '/admin/tenant?tab=billing',
    });
  }

  return null; // Under limit
}

/**
 * Returns the full plan limits and current usage summary for a tenant.
 */
export async function getTenantUsageSummary(subdomain: string): Promise<{
  plan: string;
  limits: PlanLimits;
}> {
  const plan = await getTenantPlan(subdomain);
  return {
    plan,
    limits: getPlanLimits(plan),
  };
}
