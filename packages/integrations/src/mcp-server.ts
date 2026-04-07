/**
 * T-20.2 ChiselGrid MCP Server
 *
 * Exposes ChiselGrid knowledge tools via Model Context Protocol (MCP):
 * - search_knowledge: RAG search over published articles via Bedrock Knowledge Base
 * - get_article: Full article content and metadata
 * - list_knowledge_gaps: Topics with no articles from Aurora query
 * - create_draft: Trigger Step Functions AI pipeline
 * - get_team_expertise: Author expertise by category
 *
 * Hosted as Lambda function at /api/mcp endpoint.
 */

import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const bedrockAgentClient = new BedrockAgentRuntimeClient({
  region: process.env.AWS_REGION ?? 'ap-southeast-1',
});

const sfnClient = new SFNClient({
  region: process.env.AWS_REGION ?? 'ap-southeast-1',
});

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION ?? 'ap-southeast-1',
});

// MCP Tool definitions
export const MCP_TOOLS = [
  {
    name: 'search_knowledge',
    description: 'Search the ChiselGrid engineering knowledge base using RAG over published articles',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query text' },
        tenantId: { type: 'string', description: 'Tenant identifier' },
      },
      required: ['query', 'tenantId'],
    },
  },
  {
    name: 'get_article',
    description: 'Get full article content and metadata by slug',
    inputSchema: {
      type: 'object' as const,
      properties: {
        slug: { type: 'string', description: 'Article URL slug' },
        tenantId: { type: 'string', description: 'Tenant identifier' },
      },
      required: ['slug', 'tenantId'],
    },
  },
  {
    name: 'list_knowledge_gaps',
    description: 'List topics that have no published articles — potential content opportunities',
    inputSchema: {
      type: 'object' as const,
      properties: {
        tenantId: { type: 'string', description: 'Tenant identifier' },
      },
      required: ['tenantId'],
    },
  },
  {
    name: 'create_draft',
    description: 'Trigger the AI content generation pipeline to create a new article draft',
    inputSchema: {
      type: 'object' as const,
      properties: {
        topic: { type: 'string', description: 'Article topic to generate' },
        contentType: { type: 'string', description: 'Content type: standard_doc, tutorial, case_study' },
        tenantId: { type: 'string', description: 'Tenant identifier' },
      },
      required: ['topic', 'contentType', 'tenantId'],
    },
  },
  {
    name: 'get_team_expertise',
    description: 'Get author expertise breakdown by domain category',
    inputSchema: {
      type: 'object' as const,
      properties: {
        domain: { type: 'string', description: 'Engineering domain to query (e.g., cloud, frontend, devops)' },
        tenantId: { type: 'string', description: 'Tenant identifier' },
      },
      required: ['domain', 'tenantId'],
    },
  },
] as const;

/**
 * Execute an MCP tool by name.
 */
export async function executeTool(
  toolName: string,
  params: Record<string, string>,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  switch (toolName) {
    case 'search_knowledge':
      return searchKnowledge(params.query, params.tenantId);
    case 'get_article':
      return getArticle(params.slug, params.tenantId);
    case 'list_knowledge_gaps':
      return listKnowledgeGaps(params.tenantId);
    case 'create_draft':
      return createDraft(params.topic, params.contentType, params.tenantId);
    case 'get_team_expertise':
      return getTeamExpertise(params.domain, params.tenantId);
    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${toolName}` }] };
  }
}

async function searchKnowledge(query: string, tenantId: string) {
  const knowledgeBaseId = process.env.KNOWLEDGE_BASE_ID;
  if (!knowledgeBaseId) {
    return { content: [{ type: 'text' as const, text: 'Knowledge base not configured' }] };
  }

  const response = await bedrockAgentClient.send(
    new RetrieveCommand({
      knowledgeBaseId,
      retrievalQuery: { text: query },
      retrievalConfiguration: {
        vectorSearchConfiguration: {
          numberOfResults: 5,
          filter: {
            equals: { key: 'tenantId', value: tenantId },
          },
        },
      },
    }),
  );

  const results = (response.retrievalResults ?? []).map((r) => ({
    text: r.content?.text ?? '',
    score: r.score ?? 0,
    source: r.location?.s3Location?.uri ?? '',
    metadata: r.metadata ?? {},
  }));

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ results, query, tenantId }, null, 2),
      },
    ],
  };
}

async function getArticle(slug: string, tenantId: string) {
  const apiUrl = process.env.CHISELGRID_API_URL ?? 'https://api.chiselgrid.com';
  const response = await fetch(`${apiUrl}/api/content/by-slug/${slug}?tenantId=${tenantId}`);
  const article = await response.json();

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(article, null, 2) }],
  };
}

async function listKnowledgeGaps(tenantId: string) {
  const tableName = process.env.KNOWLEDGE_GAPS_TABLE ?? 'chiselgrid-knowledge-gaps';

  const response = await dynamoClient.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'tenantId = :tid',
      ExpressionAttributeValues: { ':tid': { S: tenantId } },
      ScanIndexForward: false,
      Limit: 20,
    }),
  );

  const gaps = (response.Items ?? []).map((item) => unmarshall(item));

  return {
    content: [{ type: 'text' as const, text: JSON.stringify({ gaps, tenantId }, null, 2) }],
  };
}

async function createDraft(topic: string, contentType: string, tenantId: string) {
  const stateMachineArn = process.env.CONTENT_PIPELINE_ARN;
  if (!stateMachineArn) {
    return { content: [{ type: 'text' as const, text: 'Content pipeline not configured' }] };
  }

  const execution = await sfnClient.send(
    new StartExecutionCommand({
      stateMachineArn,
      input: JSON.stringify({ topic, contentType, tenantId, source: 'mcp' }),
    }),
  );

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          executionArn: execution.executionArn,
          topic,
          contentType,
          status: 'STARTED',
        }),
      },
    ],
  };
}

async function getTeamExpertise(domain: string, tenantId: string) {
  const apiUrl = process.env.CHISELGRID_API_URL ?? 'https://api.chiselgrid.com';
  const response = await fetch(
    `${apiUrl}/api/analytics/creators?domain=${encodeURIComponent(domain)}&tenantId=${tenantId}`,
  );
  const expertise = await response.json();

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(expertise, null, 2) }],
  };
}

/**
 * Lambda handler for /api/mcp endpoint.
 * Implements MCP JSON-RPC protocol.
 */
export async function handler(event: {
  body?: string;
  httpMethod?: string;
}): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const request = JSON.parse(event.body ?? '{}');
  const { method, params, id } = request;

  try {
    let result: unknown;

    switch (method) {
      case 'initialize':
        result = {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'chiselgrid-mcp', version: '1.0.0' },
        };
        break;

      case 'tools/list':
        result = { tools: MCP_TOOLS };
        break;

      case 'tools/call':
        result = await executeTool(params.name, params.arguments ?? {});
        break;

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32601, message: `Unknown method: ${method}` },
            id,
          }),
        };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', result, id }),
    };
  } catch (error) {
    console.error('[MCP] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal error' },
        id,
      }),
    };
  }
}
