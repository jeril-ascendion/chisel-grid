import { describe, it, expect, vi } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({})),
  PutObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://s3.amazonaws.com/presigned-url'),
}));

import { handler } from './upload';

function createEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'POST',
    path: '/upload',
    body: JSON.stringify({
      fileName: 'test-image.png',
      contentType: 'image/png',
      fileSizeBytes: 1024,
    }),
    headers: {},
    multiValueHeaders: {},
    isBase64Encoded: false,
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    resource: '',
    requestContext: {
      authorizer: {
        userId: 'user-1',
        email: 'user@test.com',
        role: 'creator',
        tenantId: 'tenant-1',
        groups: 'creators',
      },
      accountId: '',
      apiId: '',
      httpMethod: 'POST',
      identity: {} as any,
      path: '/upload',
      protocol: '',
      requestId: '',
      requestTimeEpoch: 0,
      resourceId: '',
      resourcePath: '',
      stage: '',
    },
    ...overrides,
  } as APIGatewayProxyEvent;
}

describe('upload handler', () => {
  it('returns presigned URL for valid upload request', async () => {
    const event = createEvent();
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.presignedUrl).toBe('https://s3.amazonaws.com/presigned-url');
    expect(body.s3Key).toContain('uploads/tenant-1/');
    expect(body.s3Key).toContain('test-image.png');
    expect(body.expiresIn).toBe(900);
  });

  it('returns 405 for non-POST methods', async () => {
    const event = createEvent({ httpMethod: 'GET' });
    const result = await handler(event);

    expect(result.statusCode).toBe(405);
  });

  it('returns 400 for missing fileName', async () => {
    const event = createEvent({
      body: JSON.stringify({ contentType: 'image/png', fileSizeBytes: 1024 }),
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
  });

  it('returns 400 for file exceeding 100MB', async () => {
    const event = createEvent({
      body: JSON.stringify({
        fileName: 'huge.bin',
        contentType: 'application/octet-stream',
        fileSizeBytes: 200 * 1024 * 1024, // 200MB
      }),
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
  });

  it('sanitizes file names in S3 key', async () => {
    const event = createEvent({
      body: JSON.stringify({
        fileName: 'my file (1).PNG',
        contentType: 'image/png',
        fileSizeBytes: 1024,
      }),
    });
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    // Should be sanitized: no spaces, no parens, lowercase
    expect(body.s3Key).toMatch(/my-file-1-.png/);
  });
});
