/**
 * WebSocket handler for real-time agent streaming.
 * API Gateway WebSocket routes: $connect, $disconnect, sendMessage
 */
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi';

const connections = new Map<string, { tenantId: string; userId: string }>();

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const routeKey = event.requestContext.routeKey;
  const connectionId = event.requestContext.connectionId;

  if (!connectionId) {
    return { statusCode: 400, body: 'Missing connectionId' };
  }

  switch (routeKey) {
    case '$connect':
      return handleConnect(connectionId, event);
    case '$disconnect':
      return handleDisconnect(connectionId);
    case 'sendMessage':
      return handleMessage(connectionId, event);
    default:
      return { statusCode: 400, body: `Unknown route: ${routeKey}` };
  }
}

function handleConnect(
  connectionId: string,
  event: APIGatewayProxyEvent,
): APIGatewayProxyResult {
  const tenantId = event.queryStringParameters?.['tenantId'] ?? '';
  const userId = event.queryStringParameters?.['userId'] ?? '';

  connections.set(connectionId, { tenantId, userId });

  return { statusCode: 200, body: 'Connected' };
}

function handleDisconnect(connectionId: string): APIGatewayProxyResult {
  connections.delete(connectionId);
  return { statusCode: 200, body: 'Disconnected' };
}

async function handleMessage(
  connectionId: string,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const body = event.body ? (JSON.parse(event.body) as { action?: string; contentId?: string }) : {};

  // Subscribe to content pipeline events
  if (body.action === 'subscribe' && body.contentId) {
    const conn = connections.get(connectionId);
    if (conn) {
      connections.set(connectionId, { ...conn });
    }
  }

  return { statusCode: 200, body: 'OK' };
}

/**
 * Utility to broadcast agent events to connected WebSocket clients.
 * Called from Step Functions Lambda handlers.
 */
export async function broadcastAgentEvent(
  apiEndpoint: string,
  contentId: string,
  event: {
    agentName: string;
    status: 'running' | 'completed' | 'failed';
    message: string;
    data?: unknown;
  },
): Promise<void> {
  const client = new ApiGatewayManagementApiClient({
    endpoint: apiEndpoint,
  });

  const payload = JSON.stringify({
    type: 'agent_event',
    contentId,
    ...event,
    timestamp: Date.now(),
  });

  const staleConnections: string[] = [];

  for (const [connId] of connections) {
    try {
      await client.send(
        new PostToConnectionCommand({
          ConnectionId: connId,
          Data: new TextEncoder().encode(payload),
        }),
      );
    } catch (err: unknown) {
      const statusCode = (err as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode;
      if (statusCode === 410) {
        staleConnections.push(connId);
      }
    }
  }

  for (const connId of staleConnections) {
    connections.delete(connId);
  }
}
