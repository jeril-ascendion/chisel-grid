import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { extractUserContext, jsonResponse } from '../types';

// Token costs per model (approximate $/1M tokens)
const TOKEN_COSTS: Record<string, number> = {
  'anthropic.claude-3-sonnet': 3.0,
  'anthropic.claude-3-haiku': 0.25,
  'amazon.titan-text-express': 0.80,
};

/**
 * AI pipeline analytics API.
 * GET /analytics/ai/overview — token usage, costs, pipeline stats
 * GET /analytics/ai/agents — per-agent breakdown
 * GET /analytics/ai/trends — daily trends
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userCtx = extractUserContext(event);
  if (userCtx.role !== 'admin') {
    return jsonResponse(403, { error: 'Admin access required' });
  }

  const path = event.path || '';
  const days = parseInt(event.queryStringParameters?.['days'] || '30', 10);

  if (path.endsWith('/overview')) {
    return getAiOverview(userCtx.tenantId, days);
  } else if (path.endsWith('/agents')) {
    return getAgentBreakdown(userCtx.tenantId, days);
  } else if (path.endsWith('/trends')) {
    return getAiTrends(userCtx.tenantId, days);
  }

  return jsonResponse(404, { error: 'Not found' });
}

async function getAiOverview(tenantId: string, days: number): Promise<APIGatewayProxyResult> {
  // In production, aggregates from ai_jobs table
  return jsonResponse(200, {
    period: `${days}d`,
    totalTokensUsed: 1_234_567,
    totalCostUsd: 4.82,
    totalPipelineRuns: 89,
    avgTokensPerArticle: 13_870,
    avgCostPerArticle: 0.054,
    avgGenerationTimeSeconds: 42,
    revisionRate: 0.35, // 35% of articles need revisions
    avgRevisionsPerArticle: 1.4,
    avgQualityScore: 86.3,
    humanApprovalRate: 0.92,
  });
}

async function getAgentBreakdown(tenantId: string, days: number): Promise<APIGatewayProxyResult> {
  return jsonResponse(200, {
    period: `${days}d`,
    agents: [
      {
        agent: 'writer',
        totalRuns: 124,
        totalTokens: 680_000,
        avgTokens: 5_484,
        avgTimeSeconds: 18,
        costUsd: 2.04,
        successRate: 0.98,
      },
      {
        agent: 'reviewer',
        totalRuns: 145,
        totalTokens: 290_000,
        avgTokens: 2_000,
        avgTimeSeconds: 8,
        costUsd: 0.87,
        successRate: 0.99,
      },
      {
        agent: 'seo',
        totalRuns: 89,
        totalTokens: 178_000,
        avgTokens: 2_000,
        avgTimeSeconds: 6,
        costUsd: 0.53,
        successRate: 1.0,
      },
      {
        agent: 'diagram',
        totalRuns: 34,
        totalTokens: 68_000,
        avgTokens: 2_000,
        avgTimeSeconds: 5,
        costUsd: 0.20,
        successRate: 0.94,
      },
      {
        agent: 'audio',
        totalRuns: 89,
        totalTokens: 0,
        avgTokens: 0,
        avgTimeSeconds: 35,
        costUsd: 1.18, // Polly costs
        successRate: 0.97,
      },
    ],
  });
}

async function getAiTrends(tenantId: string, days: number): Promise<APIGatewayProxyResult> {
  // Generate daily trend data for the requested period
  const trends = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);

    // Simulate realistic daily variation
    const basePipelines = 3;
    const variation = Math.floor(Math.random() * 4) - 1;
    const pipelineRuns = Math.max(0, basePipelines + variation);

    trends.push({
      date: dateStr,
      pipelineRuns,
      tokensUsed: pipelineRuns * (12_000 + Math.floor(Math.random() * 6_000)),
      costUsd: parseFloat((pipelineRuns * 0.05 + Math.random() * 0.02).toFixed(3)),
      avgQualityScore: 82 + Math.floor(Math.random() * 12),
      revisionsNeeded: Math.floor(pipelineRuns * 0.35),
    });
  }

  return jsonResponse(200, {
    period: `${days}d`,
    daily: trends,
    summary: {
      totalPipelineRuns: trends.reduce((sum, t) => sum + t.pipelineRuns, 0),
      totalTokens: trends.reduce((sum, t) => sum + t.tokensUsed, 0),
      totalCostUsd: parseFloat(trends.reduce((sum, t) => sum + t.costUsd, 0).toFixed(2)),
      avgDailyQuality: parseFloat(
        (trends.reduce((sum, t) => sum + t.avgQualityScore, 0) / trends.length).toFixed(1),
      ),
    },
  });
}
