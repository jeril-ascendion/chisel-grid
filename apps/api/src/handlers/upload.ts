/**
 * File upload handler — generates presigned S3 URLs for client-side uploads.
 */
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';
import { extractUserContext, jsonResponse } from '../types.js';

const s3Client = new S3Client({});

const MEDIA_BUCKET = process.env['MEDIA_BUCKET'] ?? 'chiselgrid-media-dev-storage';

const UploadRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1),
  fileSizeBytes: z.number().min(1).max(100 * 1024 * 1024), // 100MB max
});

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const user = extractUserContext(event);
  if (!user) {
    return jsonResponse(401, { error: 'Unauthorized' });
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const bodyParsed = UploadRequestSchema.safeParse(
    event.body ? JSON.parse(event.body) : {},
  );

  if (!bodyParsed.success) {
    return jsonResponse(400, {
      error: 'Validation failed',
      details: bodyParsed.error.issues,
    });
  }

  const { fileName, contentType, fileSizeBytes } = bodyParsed.data;

  // Generate unique S3 key
  const ext = fileName.split('.').pop() ?? 'bin';
  const timestamp = Date.now();
  const s3Key = `uploads/${user.tenantId}/${timestamp}-${sanitizeFileName(fileName)}`;

  // Generate presigned URL (valid 15 minutes)
  const command = new PutObjectCommand({
    Bucket: MEDIA_BUCKET,
    Key: s3Key,
    ContentType: contentType,
    ContentLength: fileSizeBytes,
    Metadata: {
      'uploaded-by': user.userId,
      'tenant-id': user.tenantId,
      'original-name': fileName,
    },
  });

  const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

  return jsonResponse(200, {
    presignedUrl,
    s3Key,
    bucket: MEDIA_BUCKET,
    expiresIn: 900,
  });
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}
