import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export interface UserContext {
  userId: string;
  email: string;
  role: 'admin' | 'creator' | 'reader';
  tenantId: string;
  groups: string[];
}

export function extractUserContext(event: APIGatewayProxyEvent): UserContext {
  const ctx = event.requestContext.authorizer ?? {};
  return {
    userId: String(ctx['userId'] ?? ''),
    email: String(ctx['email'] ?? ''),
    role: (ctx['role'] as UserContext['role']) ?? 'reader',
    tenantId: String(ctx['tenantId'] ?? 'default'),
    groups: String(ctx['groups'] ?? '').split(',').filter(Boolean),
  };
}

export function jsonResponse(
  statusCode: number,
  body: unknown,
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}
