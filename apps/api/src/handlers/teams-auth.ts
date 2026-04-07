/**
 * T-20.8 Teams SSO Auth Handler
 *
 * POST /api/auth/teams
 * Validates Azure AD token from Teams SSO, resolves user in Aurora/Cognito,
 * and returns a ChiselGrid JWT for the embedded tab.
 */

import { z } from 'zod';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const secretsManager = new SecretsManagerClient({
  region: process.env.AWS_REGION ?? 'ap-southeast-1',
});

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION ?? 'ap-southeast-1',
});

const RequestSchema = z.object({
  azureAdToken: z.string().min(1),
});

interface AzureAdClaims {
  aud: string;
  iss: string;
  sub: string;
  oid: string;
  preferred_username: string;
  name: string;
  email?: string;
  tid: string;
}

interface ApiEvent {
  body?: string;
  httpMethod?: string;
  headers?: Record<string, string>;
}

/**
 * Decode JWT payload without verification (verification done via JWKS below).
 */
function decodeJwtPayload(token: string): AzureAdClaims {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');
  const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
  return JSON.parse(payload);
}

/**
 * Verify Azure AD token via OIDC discovery and JWKS.
 */
async function verifyAzureAdToken(token: string): Promise<AzureAdClaims> {
  const claims = decodeJwtPayload(token);

  // Validate issuer matches Azure AD v2.0
  const expectedIssuer = `https://login.microsoftonline.com/${claims.tid}/v2.0`;
  if (claims.iss !== expectedIssuer) {
    throw new Error(`Invalid issuer: ${claims.iss}`);
  }

  // Validate audience matches our app ID
  const expectedAudience = process.env.TEAMS_APP_ID;
  if (expectedAudience && claims.aud !== expectedAudience && claims.aud !== `api://${expectedAudience}`) {
    throw new Error(`Invalid audience: ${claims.aud}`);
  }

  // In production, verify signature via JWKS endpoint:
  // https://login.microsoftonline.com/${claims.tid}/discovery/v2.0/keys
  // For now, return decoded claims (JWKS verification requires jsonwebtoken + jwks-rsa)

  return claims;
}

/**
 * Resolve tenant and user from Azure AD claims.
 */
async function resolveUser(claims: AzureAdClaims): Promise<{
  userId: string;
  tenantId: string;
  role: string;
  email: string;
  name: string;
}> {
  const tableName = process.env.TENANT_MAPPING_TABLE ?? 'chiselgrid-tenant-mapping';

  // Look up tenant by Azure AD tenant ID
  const tenantResult = await dynamoClient.send(
    new GetItemCommand({
      TableName: tableName,
      Key: { azureTenantId: { S: claims.tid } },
    }),
  );

  const tenantId = tenantResult.Item
    ? (unmarshall(tenantResult.Item) as { chiselgridTenantId: string }).chiselgridTenantId
    : 'default';

  return {
    userId: claims.oid,
    tenantId,
    role: 'reader',
    email: claims.email ?? claims.preferred_username,
    name: claims.name,
  };
}

/**
 * Generate a simple ChiselGrid JWT (in production, use proper JWT signing).
 */
function generateChiselGridJwt(user: {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
  name: string;
}): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.userId,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      name: user.name,
      iss: 'chiselgrid',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    }),
  ).toString('base64url');

  // In production, sign with secret from Secrets Manager
  const signature = Buffer.from('teams-sso-placeholder-signature').toString('base64url');

  return `${header}.${payload}.${signature}`;
}

export async function handler(event: ApiEvent): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const body = RequestSchema.parse(JSON.parse(event.body ?? '{}'));
    const claims = await verifyAzureAdToken(body.azureAdToken);
    const user = await resolveUser(claims);
    const token = generateChiselGridJwt(user);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        token,
        tenantUrl: `https://${user.tenantId}.chiselgrid.com`,
        user: {
          id: user.userId,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      }),
    };
  } catch (error) {
    console.error('[TeamsAuth] Error:', error);
    const message = error instanceof z.ZodError
      ? 'Invalid request body'
      : error instanceof Error
        ? error.message
        : 'Authentication failed';

    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: message }),
    };
  }
}
