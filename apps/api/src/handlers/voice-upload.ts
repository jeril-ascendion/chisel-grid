/**
 * T-16.2: Voice upload API handler
 *
 * Endpoints:
 * - POST /api/voice/presign — Generate presigned URL for direct S3 upload
 * - POST /api/voice/uploaded — Notify that upload is complete, trigger transcription
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { randomUUID } from 'crypto';
import { z } from 'zod';

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'ap-southeast-1' });
const sqs = new SQSClient({ region: process.env.AWS_REGION ?? 'ap-southeast-1' });

const MEDIA_BUCKET = process.env.MEDIA_BUCKET ?? 'chiselgrid-media';
const TRANSCRIPTION_QUEUE_URL = process.env.TRANSCRIPTION_QUEUE_URL ?? '';

// --- Request schemas ---

const PresignRequestSchema = z.object({
  tenantId: z.string().uuid(),
  fileExtension: z.string().regex(/^\.\w+$/).default('.m4a'),
  contentType: z.string().default('audio/mp4'),
});

const UploadedRequestSchema = z.object({
  tenantId: z.string().uuid(),
  voiceId: z.string().uuid(),
  s3Key: z.string(),
  durationMs: z.number().positive(),
});

// --- Helpers ---

function jsonResponse(
  statusCode: number,
  body: Record<string, unknown>,
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

function extractUserContext(event: APIGatewayProxyEvent): {
  userId: string;
  tenantId: string;
  role: string;
} {
  const ctx = event.requestContext.authorizer ?? {};
  return {
    userId: (ctx['userId'] as string) ?? '',
    tenantId: (ctx['tenantId'] as string) ?? '',
    role: (ctx['role'] as string) ?? 'reader',
  };
}

// --- Handler ---

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const path = event.path;
  const method = event.httpMethod;

  try {
    if (method === 'POST' && path.endsWith('/voice/presign')) {
      return handlePresign(event);
    }

    if (method === 'POST' && path.endsWith('/voice/uploaded')) {
      return handleUploaded(event);
    }

    return jsonResponse(404, { error: 'Not found' });
  } catch (err) {
    console.error('Voice upload handler error:', err);
    return jsonResponse(500, {
      error: 'Internal server error',
      message: err instanceof Error ? err.message : String(err),
    });
  }
};

async function handlePresign(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const user = extractUserContext(event);

  if (!['admin', 'creator'].includes(user.role)) {
    return jsonResponse(403, { error: 'Only creators and admins can upload voice recordings' });
  }

  const body = JSON.parse(event.body ?? '{}');
  const parsed = PresignRequestSchema.safeParse(body);

  if (!parsed.success) {
    return jsonResponse(400, {
      error: 'Validation failed',
      details: parsed.error.issues,
    });
  }

  const { tenantId, fileExtension, contentType } = parsed.data;
  const voiceId = randomUUID();
  const s3Key = `${tenantId}/voice/${voiceId}${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: MEDIA_BUCKET,
    Key: s3Key,
    ContentType: contentType,
    Metadata: {
      'tenant-id': tenantId,
      'voice-id': voiceId,
      'uploaded-by': user.userId,
    },
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

  return jsonResponse(200, {
    uploadUrl,
    s3Key,
    voiceId,
    bucket: MEDIA_BUCKET,
  });
}

async function handleUploaded(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const user = extractUserContext(event);

  if (!['admin', 'creator'].includes(user.role)) {
    return jsonResponse(403, { error: 'Insufficient permissions' });
  }

  const body = JSON.parse(event.body ?? '{}');
  const parsed = UploadedRequestSchema.safeParse(body);

  if (!parsed.success) {
    return jsonResponse(400, {
      error: 'Validation failed',
      details: parsed.error.issues,
    });
  }

  const { tenantId, voiceId, s3Key, durationMs } = parsed.data;

  // Send message to transcription queue to trigger Amazon Transcribe
  if (TRANSCRIPTION_QUEUE_URL) {
    await sqs.send(
      new SendMessageCommand({
        QueueUrl: TRANSCRIPTION_QUEUE_URL,
        MessageBody: JSON.stringify({
          voiceId,
          tenantId,
          s3Key,
          durationMs,
          uploadedBy: user.userId,
          bucket: MEDIA_BUCKET,
          timestamp: new Date().toISOString(),
        }),
        MessageGroupId: tenantId,
        MessageDeduplicationId: voiceId,
      }),
    );
  }

  return jsonResponse(200, {
    message: 'Upload confirmed, transcription initiated',
    voiceId,
    status: 'transcribing',
  });
}
