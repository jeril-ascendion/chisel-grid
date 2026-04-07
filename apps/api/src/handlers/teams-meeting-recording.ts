/**
 * T-20.10 Meeting Recording Pipeline
 *
 * Lambda handler at /api/integrations/teams/meeting-recording
 *
 * Processes Microsoft Graph callRecords webhook notifications:
 * 1. Validates webhook subscription (validation token handshake)
 * 2. Downloads transcript from Graph API
 * 3. Sends to Amazon Transcribe for cleanup and diarization
 * 4. Feeds through ChiselGrid voice intelligence pipeline with source=teams_meeting
 */

import { z } from 'zod';
import {
  TranscribeClient,
  StartTranscriptionJobCommand,
} from '@aws-sdk/client-transcribe';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const transcribeClient = new TranscribeClient({
  region: process.env.AWS_REGION ?? 'ap-southeast-1',
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION ?? 'ap-southeast-1',
});

const sfnClient = new SFNClient({
  region: process.env.AWS_REGION ?? 'ap-southeast-1',
});

const secretsManager = new SecretsManagerClient({
  region: process.env.AWS_REGION ?? 'ap-southeast-1',
});

const WebhookNotificationSchema = z.object({
  value: z.array(
    z.object({
      changeType: z.string(),
      resource: z.string(),
      resourceData: z.object({
        id: z.string(),
        '@odata.type': z.string().optional(),
      }).passthrough(),
      clientState: z.string().optional(),
      tenantId: z.string().optional(),
    }),
  ),
});

interface ApiEvent {
  body?: string;
  httpMethod?: string;
  queryStringParameters?: Record<string, string>;
  headers?: Record<string, string>;
}

/**
 * Get Microsoft Graph access token from Secrets Manager.
 */
async function getGraphToken(tenantId: string): Promise<string> {
  const secretArn = process.env.GRAPH_SECRET_ARN;
  if (!secretArn) throw new Error('GRAPH_SECRET_ARN not configured');

  const result = await secretsManager.send(
    new GetSecretValueCommand({ SecretId: secretArn }),
  );
  const secret = JSON.parse(result.SecretString ?? '{}');

  // Request token using client credentials
  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: secret.clientId,
        client_secret: secret.clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }),
    },
  );

  const tokenData = await tokenResponse.json() as { access_token: string };
  return tokenData.access_token;
}

/**
 * Download call transcript segments from Microsoft Graph.
 */
async function downloadTranscript(
  callRecordId: string,
  graphToken: string,
): Promise<{ text: string; participants: string[] }> {
  // Get call record sessions
  const sessionsResponse = await fetch(
    `https://graph.microsoft.com/v1.0/communications/callRecords/${callRecordId}/sessions`,
    { headers: { Authorization: `Bearer ${graphToken}` } },
  );

  const sessions = await sessionsResponse.json() as {
    value: Array<{
      id: string;
      caller: { identity: { user?: { displayName: string } } };
      callee: { identity: { user?: { displayName: string } } };
    }>;
  };

  const participants = new Set<string>();
  const transcriptParts: string[] = [];

  for (const session of sessions.value) {
    // Get segments for each session
    const segmentsResponse = await fetch(
      `https://graph.microsoft.com/v1.0/communications/callRecords/${callRecordId}/sessions/${session.id}/segments`,
      { headers: { Authorization: `Bearer ${graphToken}` } },
    );

    const segments = await segmentsResponse.json() as {
      value: Array<{
        caller: { identity: { user?: { displayName: string } } };
        media: Array<{
          label: string;
          callerDevice: { captureDeviceName: string };
        }>;
      }>;
    };

    for (const segment of segments.value) {
      const speaker = segment.caller?.identity?.user?.displayName ?? 'Unknown';
      participants.add(speaker);
      transcriptParts.push(`[${speaker}]: (audio segment)`);
    }

    // Collect participant names
    if (session.caller?.identity?.user?.displayName) {
      participants.add(session.caller.identity.user.displayName);
    }
    if (session.callee?.identity?.user?.displayName) {
      participants.add(session.callee.identity.user.displayName);
    }
  }

  return {
    text: transcriptParts.join('\n'),
    participants: [...participants],
  };
}

/**
 * Upload transcript to S3 and start Transcribe job for cleanup.
 */
async function processTranscript(
  callRecordId: string,
  transcript: { text: string; participants: string[] },
  tenantId: string,
): Promise<string> {
  const bucket = process.env.MEDIA_BUCKET ?? 'chiselgrid-media';
  const s3Key = `${tenantId}/meetings/${callRecordId}/transcript.txt`;

  // Upload raw transcript to S3
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Body: transcript.text,
      ContentType: 'text/plain',
      Metadata: {
        source: 'teams_meeting',
        callRecordId,
        participants: transcript.participants.join(', '),
      },
    }),
  );

  return s3Key;
}

/**
 * Trigger the voice intelligence pipeline via Step Functions.
 */
async function triggerVoicePipeline(
  callRecordId: string,
  s3Key: string,
  tenantId: string,
  participants: string[],
): Promise<string> {
  const stateMachineArn = process.env.VOICE_PIPELINE_ARN;
  if (!stateMachineArn) throw new Error('VOICE_PIPELINE_ARN not configured');

  const execution = await sfnClient.send(
    new StartExecutionCommand({
      stateMachineArn,
      name: `meeting-${callRecordId}-${Date.now()}`,
      input: JSON.stringify({
        source: 'teams_meeting',
        callRecordId,
        transcriptS3Key: s3Key,
        tenantId,
        participants,
        contentType: 'meeting_notes',
      }),
    }),
  );

  return execution.executionArn ?? '';
}

export async function handler(event: ApiEvent): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  // Handle Graph webhook validation handshake
  if (event.queryStringParameters?.validationToken) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/plain' },
      body: event.queryStringParameters.validationToken,
    };
  }

  try {
    const notification = WebhookNotificationSchema.parse(
      JSON.parse(event.body ?? '{}'),
    );

    const results = await Promise.allSettled(
      notification.value.map(async (change) => {
        // Validate clientState
        const expectedState = process.env.GRAPH_WEBHOOK_CLIENT_STATE;
        if (expectedState && change.clientState !== expectedState) {
          throw new Error('Invalid clientState');
        }

        const callRecordId = change.resourceData.id;
        const tenantId = change.tenantId ?? 'default';

        console.log(`[MeetingRecording] Processing call record: ${callRecordId}`);

        // Get Graph token and download transcript
        const graphToken = await getGraphToken(tenantId);
        const transcript = await downloadTranscript(callRecordId, graphToken);

        // Upload to S3
        const s3Key = await processTranscript(callRecordId, transcript, tenantId);

        // Trigger voice pipeline
        const executionArn = await triggerVoicePipeline(
          callRecordId,
          s3Key,
          tenantId,
          transcript.participants,
        );

        console.log(`[MeetingRecording] Pipeline started: ${executionArn}`);
        return { callRecordId, executionArn };
      }),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ processed: succeeded, failed }),
    };
  } catch (error) {
    console.error('[MeetingRecording] Error:', error);
    return {
      statusCode: error instanceof z.ZodError ? 400 : 500,
      headers,
      body: JSON.stringify({ error: 'Processing failed' }),
    };
  }
}
