/**
 * T-18.3 Subscriber Management API Handler
 *
 * Endpoints:
 *   POST   /subscribers          — subscribe (email, categories, frequency)
 *   GET    /subscribers/:id      — get subscriber details
 *   PATCH  /subscribers/:id      — update preferences (categories, frequency)
 *   DELETE /subscribers/:id      — unsubscribe
 *   GET    /subscribers          — list subscribers for tenant (admin)
 *   POST   /subscribers/unsubscribe — unsubscribe via SES suppression list
 */

import { z } from 'zod';
import { SESv2Client, PutSuppressedDestinationCommand, DeleteSuppressedDestinationCommand } from '@aws-sdk/client-sesv2';

const ses = new SESv2Client({ region: process.env.AWS_REGION ?? 'ap-southeast-1' });

const SubscribeRequestSchema = z.object({
  email: z.string().email(),
  categories: z.array(z.string()).default([]),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).default('weekly'),
});

const UpdatePreferencesSchema = z.object({
  categories: z.array(z.string()).optional(),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).optional(),
  status: z.enum(['active', 'paused']).optional(),
});

interface LambdaEvent {
  httpMethod: string;
  path: string;
  pathParameters?: Record<string, string>;
  queryStringParameters?: Record<string, string>;
  body?: string;
  requestContext: {
    authorizer?: {
      tenantId: string;
      userId: string;
      groups: string[];
    };
  };
}

interface SubscriberRecord {
  subscriberId: string;
  userId: string | null;
  tenantId: string;
  email: string;
  categories: string[];
  frequency: string;
  status: string;
  confirmedAt: string | null;
  unsubscribedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// In-memory store for development; production uses Drizzle + Aurora
const subscriberStore = new Map<string, SubscriberRecord>();

function generateId(): string {
  return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function jsonResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}

export async function handler(event: LambdaEvent) {
  const { httpMethod, pathParameters, queryStringParameters } = event;
  const tenantId = event.requestContext.authorizer?.tenantId ?? 'default';
  const subscriberId = pathParameters?.id;

  try {
    // POST /subscribers — create new subscription
    if (httpMethod === 'POST' && !subscriberId && !event.path.endsWith('/unsubscribe')) {
      const parsed = SubscribeRequestSchema.parse(JSON.parse(event.body ?? '{}'));

      // Check for existing subscriber with same email + tenant
      const existing = Array.from(subscriberStore.values()).find(
        (s) => s.tenantId === tenantId && s.email === parsed.email,
      );

      if (existing) {
        if (existing.status === 'unsubscribed') {
          // Re-subscribe
          existing.status = 'active';
          existing.categories = parsed.categories;
          existing.frequency = parsed.frequency;
          existing.unsubscribedAt = null;
          existing.updatedAt = new Date().toISOString();

          // Remove from SES suppression list
          try {
            await ses.send(new DeleteSuppressedDestinationCommand({
              EmailAddress: parsed.email,
            }));
          } catch {
            // May not be in suppression list
          }

          return jsonResponse(200, { subscriber: existing, resubscribed: true });
        }
        return jsonResponse(409, { error: 'Email already subscribed' });
      }

      const subscriber: SubscriberRecord = {
        subscriberId: generateId(),
        userId: event.requestContext.authorizer?.userId ?? null,
        tenantId,
        email: parsed.email,
        categories: parsed.categories,
        frequency: parsed.frequency,
        status: 'active',
        confirmedAt: null,
        unsubscribedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      subscriberStore.set(subscriber.subscriberId, subscriber);
      return jsonResponse(201, { subscriber });
    }

    // POST /subscribers/unsubscribe — unsubscribe and add to SES suppression list
    if (httpMethod === 'POST' && event.path.endsWith('/unsubscribe')) {
      const { id } = JSON.parse(event.body ?? '{}');
      const subscriber = subscriberStore.get(id);
      if (!subscriber || subscriber.tenantId !== tenantId) {
        return jsonResponse(404, { error: 'Subscriber not found' });
      }

      subscriber.status = 'unsubscribed';
      subscriber.unsubscribedAt = new Date().toISOString();
      subscriber.updatedAt = new Date().toISOString();

      // Add to SES account-level suppression list
      await ses.send(new PutSuppressedDestinationCommand({
        EmailAddress: subscriber.email,
        Reason: 'COMPLAINT',
      }));

      return jsonResponse(200, { message: 'Unsubscribed successfully' });
    }

    // GET /subscribers/:id — get subscriber details
    if (httpMethod === 'GET' && subscriberId) {
      const subscriber = subscriberStore.get(subscriberId);
      if (!subscriber || subscriber.tenantId !== tenantId) {
        return jsonResponse(404, { error: 'Subscriber not found' });
      }
      return jsonResponse(200, { subscriber });
    }

    // PATCH /subscribers/:id — update preferences
    if (httpMethod === 'PATCH' && subscriberId) {
      const subscriber = subscriberStore.get(subscriberId);
      if (!subscriber || subscriber.tenantId !== tenantId) {
        return jsonResponse(404, { error: 'Subscriber not found' });
      }

      const updates = UpdatePreferencesSchema.parse(JSON.parse(event.body ?? '{}'));
      if (updates.categories !== undefined) subscriber.categories = updates.categories;
      if (updates.frequency !== undefined) subscriber.frequency = updates.frequency;
      if (updates.status !== undefined) subscriber.status = updates.status;
      subscriber.updatedAt = new Date().toISOString();

      return jsonResponse(200, { subscriber });
    }

    // DELETE /subscribers/:id — unsubscribe
    if (httpMethod === 'DELETE' && subscriberId) {
      const subscriber = subscriberStore.get(subscriberId);
      if (!subscriber || subscriber.tenantId !== tenantId) {
        return jsonResponse(404, { error: 'Subscriber not found' });
      }

      subscriber.status = 'unsubscribed';
      subscriber.unsubscribedAt = new Date().toISOString();

      await ses.send(new PutSuppressedDestinationCommand({
        EmailAddress: subscriber.email,
        Reason: 'COMPLAINT',
      }));

      return jsonResponse(200, { message: 'Unsubscribed successfully' });
    }

    // GET /subscribers — list all for tenant (admin only)
    if (httpMethod === 'GET' && !subscriberId) {
      const status = queryStringParameters?.status;
      const limit = parseInt(queryStringParameters?.limit ?? '50', 10);
      const offset = parseInt(queryStringParameters?.offset ?? '0', 10);

      let all = Array.from(subscriberStore.values())
        .filter((s) => s.tenantId === tenantId);

      if (status) {
        all = all.filter((s) => s.status === status);
      }

      const total = all.length;
      const items = all.slice(offset, offset + limit);

      return jsonResponse(200, { items, total, limit, offset });
    }

    return jsonResponse(405, { error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonResponse(400, { error: 'Validation failed', details: err.errors });
    }
    console.error('Subscriber handler error:', err);
    return jsonResponse(500, { error: 'Internal server error' });
  }
}
