import type {
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerResult,
  PolicyDocument,
} from 'aws-lambda';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// Primary (platform) JWKS client — 5-minute cache
const primaryIssuer = process.env.COGNITO_ISSUER!;
const primaryClient = jwksClient({
  jwksUri: `${primaryIssuer}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 300_000,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
});

// Per-tenant JWKS client cache (keyed by issuer URL)
const tenantClients = new Map<string, jwksClient.JwksClient>();

function getJwksClient(issuer: string): jwksClient.JwksClient {
  if (issuer === primaryIssuer) return primaryClient;

  let client = tenantClients.get(issuer);
  if (!client) {
    client = jwksClient({
      jwksUri: `${issuer}/.well-known/jwks.json`,
      cache: true,
      cacheMaxAge: 300_000,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
    });
    tenantClients.set(issuer, client);

    // Evict old clients if cache grows too large
    if (tenantClients.size > 50) {
      const firstKey = tenantClients.keys().next().value;
      if (firstKey) tenantClients.delete(firstKey);
    }
  }
  return client;
}

interface CognitoJwtPayload extends jwt.JwtPayload {
  'cognito:groups'?: string[];
  'custom:tenantId'?: string;
  email?: string;
  token_use?: 'access' | 'id';
}

// Token verification cache — 5 min TTL
const verifyCache = new Map<
  string,
  { payload: CognitoJwtPayload; expiresAt: number }
>();
const CACHE_TTL_MS = 300_000;

// Allowed issuer prefixes — all Cognito User Pools in our region
const ALLOWED_ISSUER_PREFIX = `https://cognito-idp.${process.env.AWS_REGION || 'ap-southeast-1'}.amazonaws.com/`;

function getSigningKey(client: jwksClient.JwksClient, kid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err || !key) return reject(err ?? new Error('No key found'));
      resolve(key.getPublicKey());
    });
  });
}

async function verifyToken(token: string): Promise<CognitoJwtPayload> {
  // Check cache
  const cached = verifyCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  // Decode header to get kid and extract issuer
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === 'string') {
    throw new Error('Invalid token format');
  }

  const kid = decoded.header.kid;
  if (!kid) throw new Error('Token missing kid header');

  // Extract issuer from payload to determine which JWKS endpoint to use
  const payload = decoded.payload as CognitoJwtPayload;
  const issuer = payload.iss;

  if (!issuer) throw new Error('Token missing issuer claim');

  // Validate issuer is a Cognito User Pool in our region
  if (issuer !== primaryIssuer && !issuer.startsWith(ALLOWED_ISSUER_PREFIX)) {
    throw new Error('Token issuer not trusted');
  }

  const client = getJwksClient(issuer);
  const signingKey = await getSigningKey(client, kid);

  const verified = jwt.verify(token, signingKey, {
    issuer,
    algorithms: ['RS256'],
  }) as CognitoJwtPayload;

  // Validate token_use
  if (verified.token_use !== 'access' && verified.token_use !== 'id') {
    throw new Error('Invalid token_use claim');
  }

  // Cache the verified token
  verifyCache.set(token, {
    payload: verified,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  // Clean expired entries periodically
  if (verifyCache.size > 100) {
    const now = Date.now();
    for (const [key, val] of verifyCache) {
      if (val.expiresAt <= now) verifyCache.delete(key);
    }
  }

  return verified;
}

function generatePolicy(
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string,
  context: Record<string, string | number | boolean>,
): APIGatewayAuthorizerResult {
  const policyDocument: PolicyDocument = {
    Version: '2012-10-17',
    Statement: [
      {
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: resource,
      },
    ],
  };

  return {
    principalId,
    policyDocument,
    context,
  };
}

export async function handler(
  event: APIGatewayTokenAuthorizerEvent,
): Promise<APIGatewayAuthorizerResult> {
  const token = event.authorizationToken?.replace(/^Bearer\s+/i, '');

  if (!token) {
    throw new Error('Unauthorized');
  }

  try {
    const payload = await verifyToken(token);

    const groups = payload['cognito:groups'] ?? [];
    const tenantId = payload['custom:tenantId'] ?? 'default';
    const email = payload.email ?? '';
    const userId = payload.sub ?? '';

    // Derive role from groups
    let role = 'reader';
    if (groups.includes('admins')) role = 'admin';
    else if (groups.includes('creators')) role = 'creator';

    return generatePolicy(userId, 'Allow', event.methodArn, {
      userId,
      email,
      role,
      tenantId,
      groups: groups.join(','),
    });
  } catch {
    throw new Error('Unauthorized');
  }
}
