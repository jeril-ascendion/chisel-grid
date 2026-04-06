/**
 * T-16.4: Custom vocabulary per tenant
 *
 * Endpoints:
 * - GET /api/voice/vocabulary — Get tenant's custom vocabulary
 * - PUT /api/voice/vocabulary — Update tenant's custom vocabulary
 * - POST /api/voice/vocabulary/sync — Sync vocabulary to Amazon Transcribe
 *
 * Stores vocabulary in DynamoDB. Syncs to Transcribe custom vocabulary on update.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
  TranscribeClient,
  CreateVocabularyCommand,
  UpdateVocabularyCommand,
  GetVocabularyCommand,
} from '@aws-sdk/client-transcribe';
import { z } from 'zod';

const dynamodb = new DynamoDBClient({
  region: process.env.AWS_REGION ?? 'ap-southeast-1',
});
const transcribe = new TranscribeClient({
  region: process.env.AWS_REGION ?? 'ap-southeast-1',
});

const VOCABULARY_TABLE = process.env.VOCABULARY_TABLE ?? 'chiselgrid-vocabulary';
const CUSTOM_VOCABULARY_PREFIX = process.env.CUSTOM_VOCABULARY_PREFIX ?? 'chiselgrid-vocab-';

// --- Schemas ---

const VocabularyEntrySchema = z.object({
  phrase: z.string().min(1).max(256),
  soundsLike: z.string().optional(),
  ipa: z.string().optional(),
  displayAs: z.string().optional(),
});

const UpdateVocabularySchema = z.object({
  tenantId: z.string().uuid(),
  languageCode: z.string().default('en-US'),
  entries: z.array(VocabularyEntrySchema).min(1).max(500),
});

type VocabularyEntry = z.infer<typeof VocabularyEntrySchema>;

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

function extractUserContext(event: APIGatewayProxyEvent) {
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
    if (method === 'GET' && path.endsWith('/voice/vocabulary')) {
      return handleGetVocabulary(event);
    }

    if (method === 'PUT' && path.endsWith('/voice/vocabulary')) {
      return handleUpdateVocabulary(event);
    }

    if (method === 'POST' && path.endsWith('/voice/vocabulary/sync')) {
      return handleSyncVocabulary(event);
    }

    return jsonResponse(404, { error: 'Not found' });
  } catch (err) {
    console.error('Vocabulary handler error:', err);
    return jsonResponse(500, {
      error: 'Internal server error',
      message: err instanceof Error ? err.message : String(err),
    });
  }
};

async function handleGetVocabulary(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const user = extractUserContext(event);

  if (!['admin', 'creator'].includes(user.role)) {
    return jsonResponse(403, { error: 'Insufficient permissions' });
  }

  const tenantId = user.tenantId || (event.queryStringParameters?.['tenantId'] ?? '');

  const result = await dynamodb.send(
    new GetItemCommand({
      TableName: VOCABULARY_TABLE,
      Key: marshall({ tenantId }),
    }),
  );

  if (!result.Item) {
    return jsonResponse(200, { tenantId, entries: [], languageCode: 'en-US' });
  }

  const item = unmarshall(result.Item);
  return jsonResponse(200, {
    tenantId,
    entries: item.entries ?? [],
    languageCode: item.languageCode ?? 'en-US',
    lastSynced: item.lastSynced ?? null,
    updatedAt: item.updatedAt ?? null,
  });
}

async function handleUpdateVocabulary(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const user = extractUserContext(event);

  if (user.role !== 'admin') {
    return jsonResponse(403, { error: 'Only admins can manage vocabulary' });
  }

  const body = JSON.parse(event.body ?? '{}');
  const parsed = UpdateVocabularySchema.safeParse(body);

  if (!parsed.success) {
    return jsonResponse(400, {
      error: 'Validation failed',
      details: parsed.error.issues,
    });
  }

  const { tenantId, entries, languageCode } = parsed.data;
  const now = new Date().toISOString();

  // Store in DynamoDB
  await dynamodb.send(
    new PutItemCommand({
      TableName: VOCABULARY_TABLE,
      Item: marshall({
        tenantId,
        entries,
        languageCode,
        updatedAt: now,
        updatedBy: user.userId,
      }),
    }),
  );

  // Auto-sync to Transcribe
  await syncToTranscribe(tenantId, entries, languageCode);

  return jsonResponse(200, {
    message: 'Vocabulary updated and synced to Transcribe',
    tenantId,
    entryCount: entries.length,
    updatedAt: now,
  });
}

async function handleSyncVocabulary(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const user = extractUserContext(event);

  if (user.role !== 'admin') {
    return jsonResponse(403, { error: 'Only admins can sync vocabulary' });
  }

  const tenantId = user.tenantId || JSON.parse(event.body ?? '{}').tenantId;

  // Fetch from DynamoDB
  const result = await dynamodb.send(
    new GetItemCommand({
      TableName: VOCABULARY_TABLE,
      Key: marshall({ tenantId }),
    }),
  );

  if (!result.Item) {
    return jsonResponse(404, { error: 'No vocabulary found for this tenant' });
  }

  const item = unmarshall(result.Item);
  const entries = item.entries as VocabularyEntry[];
  const languageCode = (item.languageCode as string) ?? 'en-US';

  await syncToTranscribe(tenantId, entries, languageCode);

  // Update lastSynced
  await dynamodb.send(
    new PutItemCommand({
      TableName: VOCABULARY_TABLE,
      Item: marshall({
        ...item,
        lastSynced: new Date().toISOString(),
      }),
    }),
  );

  return jsonResponse(200, {
    message: 'Vocabulary synced to Amazon Transcribe',
    vocabularyName: `${CUSTOM_VOCABULARY_PREFIX}${tenantId}`,
    entryCount: entries.length,
  });
}

async function syncToTranscribe(
  tenantId: string,
  entries: VocabularyEntry[],
  languageCode: string,
): Promise<void> {
  const vocabularyName = `${CUSTOM_VOCABULARY_PREFIX}${tenantId}`;

  // Build vocabulary table format for Transcribe
  // Format: Phrase\tSoundsLike\tIPA\tDisplayAs
  const phrases = entries.map((entry) => ({
    Phrase: entry.phrase,
    SoundsLike: entry.soundsLike,
    IPA: entry.ipa,
    DisplayAs: entry.displayAs ?? entry.phrase,
  }));

  try {
    // Check if vocabulary exists
    await transcribe.send(
      new GetVocabularyCommand({ VocabularyName: vocabularyName }),
    );

    // Update existing vocabulary
    await transcribe.send(
      new UpdateVocabularyCommand({
        VocabularyName: vocabularyName,
        LanguageCode: languageCode as 'en-US',
        Phrases: phrases.map((p) => p.Phrase),
      }),
    );

    console.log(`Updated custom vocabulary: ${vocabularyName}`);
  } catch (err: unknown) {
    const error = err as { name?: string };
    if (error.name === 'BadRequestException' || error.name === 'NotFoundException') {
      // Create new vocabulary
      await transcribe.send(
        new CreateVocabularyCommand({
          VocabularyName: vocabularyName,
          LanguageCode: languageCode as 'en-US',
          Phrases: phrases.map((p) => p.Phrase),
        }),
      );

      console.log(`Created custom vocabulary: ${vocabularyName}`);
    } else {
      throw err;
    }
  }
}
