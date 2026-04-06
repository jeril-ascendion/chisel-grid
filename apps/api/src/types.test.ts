import { describe, it, expect } from 'vitest';
import { extractUserContext, jsonResponse } from './types';
import type { APIGatewayProxyEvent } from 'aws-lambda';

describe('extractUserContext', () => {
  it('extracts user context from authorizer context', () => {
    const event = {
      requestContext: {
        authorizer: {
          userId: 'user-123',
          email: 'test@example.com',
          role: 'admin',
          tenantId: 'tenant-1',
          groups: 'admins,creators',
        },
      },
    } as unknown as APIGatewayProxyEvent;

    const ctx = extractUserContext(event);

    expect(ctx.userId).toBe('user-123');
    expect(ctx.email).toBe('test@example.com');
    expect(ctx.role).toBe('admin');
    expect(ctx.tenantId).toBe('tenant-1');
    expect(ctx.groups).toEqual(['admins', 'creators']);
  });

  it('defaults to reader role when not specified', () => {
    const event = {
      requestContext: { authorizer: {} },
    } as unknown as APIGatewayProxyEvent;

    const ctx = extractUserContext(event);

    expect(ctx.role).toBe('reader');
  });

  it('defaults tenantId to "default"', () => {
    const event = {
      requestContext: { authorizer: {} },
    } as unknown as APIGatewayProxyEvent;

    const ctx = extractUserContext(event);

    expect(ctx.tenantId).toBe('default');
  });

  it('handles null authorizer', () => {
    const event = {
      requestContext: { authorizer: null },
    } as unknown as APIGatewayProxyEvent;

    const ctx = extractUserContext(event);

    expect(ctx.userId).toBe('');
    expect(ctx.role).toBe('reader');
  });

  it('filters empty strings from groups', () => {
    const event = {
      requestContext: {
        authorizer: { groups: '' },
      },
    } as unknown as APIGatewayProxyEvent;

    const ctx = extractUserContext(event);

    expect(ctx.groups).toEqual([]);
  });
});

describe('jsonResponse', () => {
  it('returns proper API Gateway response format', () => {
    const response = jsonResponse(200, { message: 'OK' });

    expect(response.statusCode).toBe(200);
    expect(response.headers!['Content-Type']).toBe('application/json');
    expect(response.headers!['Access-Control-Allow-Origin']).toBe('*');
    expect(JSON.parse(response.body)).toEqual({ message: 'OK' });
  });

  it('serializes error responses', () => {
    const response = jsonResponse(400, { error: 'Bad request' });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({ error: 'Bad request' });
  });

  it('serializes arrays', () => {
    const response = jsonResponse(200, [1, 2, 3]);

    expect(JSON.parse(response.body)).toEqual([1, 2, 3]);
  });
});
