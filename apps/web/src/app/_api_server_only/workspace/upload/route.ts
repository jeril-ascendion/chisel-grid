import { NextResponse } from 'next/server';
import { z } from 'zod';

const UploadRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1),
  fileSizeBytes: z.number().min(1).max(100 * 1024 * 1024),
});

/**
 * POST /api/workspace/upload
 * Generate a presigned S3 URL for file upload.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json();
  const parsed = UploadRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { fileName, contentType, fileSizeBytes } = parsed.data;

  // TODO: In production, call the Lambda upload handler or use S3 SDK directly
  // For now, return a mock presigned URL
  const s3Key = `uploads/dev/${Date.now()}-${fileName.toLowerCase().replace(/[^a-z0-9._-]/g, '-')}`;

  return NextResponse.json({
    presignedUrl: `https://chiselgrid-media-dev-storage.s3.ap-southeast-1.amazonaws.com/${s3Key}?X-Amz-Signature=mock`,
    s3Key,
    bucket: 'chiselgrid-media-dev-storage',
    expiresIn: 900,
  });
}
