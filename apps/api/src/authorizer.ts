import type {
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerResult,
  PolicyDocument,
} from 'aws-lambda';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// 5-minute JWKS cache
const client = jwksClient({
  jwksUri: `${process.env.COGNITO_ISSUER!}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 300_000,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
});

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

function getSigningKey(kid: string): Promise<string> {
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

  // Decode header to get kid
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === 'string') {
    throw new Error('Invalid token format');
  }

  const kid = decoded.header.kid;
  if (!kid) throw new Error('Token missing kid header');

  const signingKey = await getSigningKey(kid);

  const payload = jwt.verify(token, signingKey, {
    issuer: process.env.COGNITO_ISSUER!,
    algorithms: ['RS256'],
  }) as CognitoJwtPayload;

  // Validate token_use
  if (payload.token_use !== 'access' && payload.token_use !== 'id') {
    throw new Error('Invalid token_use claim');
  }

  // Cache the verified token
  verifyCache.set(token, {
    payload,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  // Clean expired entries periodically
  if (verifyCache.size > 100) {
    const now = Date.now();
    for (const [key, val] of verifyCache) {
      if (val.expiresAt <= now) verifyCache.delete(key);
    }
  }

  return payload;
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
