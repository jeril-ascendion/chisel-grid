/**
 * T-18.4 Email Voice Attachment Ingest Lambda
 *
 * Triggered by SES inbound rule for voice@{tenantId}.chiselgrid.com.
 * Receives raw email via S3, parses MIME to extract audio attachments,
 * stores audio in S3, and triggers the transcription pipeline.
 */

import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'ap-southeast-1' });
const sfn = new SFNClient({ region: process.env.AWS_REGION ?? 'ap-southeast-1' });
const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'ap-southeast-1' });

const MEDIA_BUCKET = process.env.MEDIA_BUCKET ?? 'chiselgrid-media';
const EMAIL_BUCKET = process.env.EMAIL_BUCKET ?? 'chiselgrid-ses-inbound';
const VOICE_PIPELINE_ARN = process.env.VOICE_PIPELINE_ARN ?? '';
const TENANT_TABLE = process.env.TENANT_TABLE ?? 'chiselgrid-tenants';

const AUDIO_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/wav',
  'audio/ogg',
  'audio/aac',
  'audio/webm',
]);

interface SESEvent {
  Records: Array<{
    ses: {
      mail: {
        messageId: string;
        source: string;
        destination: string[];
        commonHeaders: {
          from: string[];
          to: string[];
          subject: string;
          date: string;
        };
      };
      receipt: {
        action: {
          type: string;
          bucketName: string;
          objectKey: string;
        };
      };
    };
  }>;
}

interface MIMEPart {
  contentType: string;
  filename: string;
  content: Buffer;
}

/**
 * Parse MIME boundaries from raw email to extract audio attachments.
 * Simple boundary-based parser for handling multipart MIME messages.
 */
function parseMIMEAttachments(rawEmail: string): MIMEPart[] {
  const parts: MIMEPart[] = [];

  // Find boundary
  const boundaryMatch = rawEmail.match(/boundary="?([^"\r\n;]+)"?/i);
  if (!boundaryMatch) return parts;

  const boundary = boundaryMatch[1];
  const sections = rawEmail.split(`--${boundary}`);

  for (const section of sections) {
    if (section.trim() === '--' || section.trim() === '') continue;

    const headerBodySplit = section.indexOf('\r\n\r\n');
    if (headerBodySplit === -1) continue;

    const headers = section.slice(0, headerBodySplit).toLowerCase();
    const body = section.slice(headerBodySplit + 4);

    // Check if this part is an audio attachment
    const contentTypeMatch = headers.match(/content-type:\s*([^\r\n;]+)/i);
    if (!contentTypeMatch) continue;

    const contentType = contentTypeMatch[1]!.trim();
    if (!AUDIO_MIME_TYPES.has(contentType)) continue;

    // Extract filename
    const filenameMatch = headers.match(/filename="?([^"\r\n;]+)"?/i);
    const filename = filenameMatch ? filenameMatch[1]!.trim() : `attachment.${contentType.split('/')[1]}`;

    // Check transfer encoding
    const encodingMatch = headers.match(/content-transfer-encoding:\s*([^\r\n]+)/i);
    const encoding = encodingMatch ? encodingMatch[1]!.trim() : '7bit';

    let content: Buffer;
    if (encoding === 'base64') {
      const base64Data = body.replace(/[\r\n\s]/g, '');
      content = Buffer.from(base64Data, 'base64');
    } else {
      content = Buffer.from(body, 'binary');
    }

    parts.push({ contentType, filename, content });
  }

  return parts;
}

/**
 * Resolve tenant from the destination email address.
 * voice@{tenantId}.chiselgrid.com → tenantId
 */
function extractTenantFromEmail(destinationEmail: string): string | null {
  const match = destinationEmail.match(/voice@([^.]+)\.chiselgrid\.com/i);
  return match ? match[1]! : null;
}

/**
 * Map sender email to ChiselGrid user account via DynamoDB lookup.
 */
async function resolveUserBySenderEmail(
  senderEmail: string,
  tenantId: string,
): Promise<{ userId: string; displayName: string } | null> {
  try {
    const result = await dynamodb.send(
      new GetItemCommand({
        TableName: TENANT_TABLE,
        Key: {
          PK: { S: `TENANT#${tenantId}#USER_EMAIL` },
          SK: { S: senderEmail.toLowerCase() },
        },
      }),
    );

    if (result.Item) {
      return {
        userId: result.Item.userId?.S ?? '',
        displayName: result.Item.displayName?.S ?? senderEmail,
      };
    }
  } catch (err) {
    console.warn('Failed to resolve user by email:', err);
  }
  return null;
}

export async function handler(event: SESEvent) {
  const results: Array<{ messageId: string; audioFiles: number; status: string }> = [];

  for (const record of event.Records) {
    const { mail, receipt } = record.ses;
    const messageId = mail.messageId;
    const senderEmail = mail.source;
    const destinations = mail.destination;
    const subject = mail.commonHeaders.subject || 'Voice submission';

    console.log(`Processing email ${messageId} from ${senderEmail}`);

    // Resolve tenant from destination address
    let tenantId: string | null = null;
    for (const dest of destinations) {
      tenantId = extractTenantFromEmail(dest);
      if (tenantId) break;
    }

    if (!tenantId) {
      console.warn(`No tenant resolved from destinations: ${destinations.join(', ')}`);
      results.push({ messageId, audioFiles: 0, status: 'no_tenant' });
      continue;
    }

    // Fetch raw email from S3
    const emailObject = await s3.send(
      new GetObjectCommand({
        Bucket: receipt.action.bucketName || EMAIL_BUCKET,
        Key: receipt.action.objectKey,
      }),
    );

    const rawEmail = await emailObject.Body?.transformToString('utf-8');
    if (!rawEmail) {
      console.error(`Empty email body for ${messageId}`);
      results.push({ messageId, audioFiles: 0, status: 'empty_email' });
      continue;
    }

    // Parse MIME and extract audio attachments
    const audioParts = parseMIMEAttachments(rawEmail);

    if (audioParts.length === 0) {
      console.log(`No audio attachments found in ${messageId}`);
      results.push({ messageId, audioFiles: 0, status: 'no_audio' });
      continue;
    }

    // Resolve sender to ChiselGrid user
    const user = await resolveUserBySenderEmail(senderEmail, tenantId);

    // Store each audio file in S3 and trigger transcription
    for (const part of audioParts) {
      const audioId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const extension = part.filename.split('.').pop() ?? 'mp3';
      const s3Key = `${tenantId}/voice/${audioId}.${extension}`;

      // Upload audio to media bucket
      await s3.send(
        new PutObjectCommand({
          Bucket: MEDIA_BUCKET,
          Key: s3Key,
          Body: part.content,
          ContentType: part.contentType,
          Metadata: {
            'sender-email': senderEmail,
            'original-filename': part.filename,
            'email-subject': subject,
            'tenant-id': tenantId,
            ...(user ? { 'user-id': user.userId } : {}),
          },
        }),
      );

      console.log(`Stored audio: s3://${MEDIA_BUCKET}/${s3Key}`);

      // Trigger voice transcription pipeline
      if (VOICE_PIPELINE_ARN) {
        await sfn.send(
          new StartExecutionCommand({
            stateMachineArn: VOICE_PIPELINE_ARN,
            name: `voice-email-${audioId}`,
            input: JSON.stringify({
              tenantId,
              audioS3Key: s3Key,
              audioS3Bucket: MEDIA_BUCKET,
              senderEmail,
              userId: user?.userId ?? null,
              displayName: user?.displayName ?? senderEmail,
              title: subject,
              source: 'email-ingest',
              contentType: part.contentType,
              originalFilename: part.filename,
            }),
          }),
        );

        console.log(`Triggered voice pipeline for ${s3Key}`);
      }
    }

    results.push({
      messageId,
      audioFiles: audioParts.length,
      status: 'processed',
    });
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ results }),
  };
}
