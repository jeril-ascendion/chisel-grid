import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { extractUserContext, jsonResponse } from '../types';

const dynamoClient = new DynamoDBClient({});
const ANALYTICS_TABLE = process.env['ANALYTICS_TABLE'] || 'chiselgrid-analytics-dev';

/**
 * Content performance analytics API.
 * GET /analytics/content/performance — per-article metrics
 * GET /analytics/content/summary — aggregate content metrics
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userCtx = extractUserContext(event);
  if (userCtx.role !== 'admin') {
    return jsonResponse(403, { error: 'Admin access required' });
  }

  const path = event.path || '';
  const days = parseInt(event.queryStringParameters?.['days'] || '30', 10);

  if (path.endsWith('/performance')) {
    return getContentPerformance(userCtx.tenantId, days);
  } else if (path.endsWith('/summary')) {
    return getContentSummary(userCtx.tenantId, days);
  }

  return jsonResponse(404, { error: 'Not found' });
}

async function getContentPerformance(tenantId: string, days: number): Promise<APIGatewayProxyResult> {
  // In production, this queries aggregated analytics from DynamoDB/Athena
  // For now, return structured mock data that matches the expected schema
  return jsonResponse(200, {
    period: `${days}d`,
    articles: [
      {
        contentId: 'c-001',
        title: 'Getting Started with Kubernetes',
        slug: 'getting-started-with-kubernetes',
        reads: 3420,
        uniqueReaders: 2100,
        avgReadTimeMinutes: 8.5,
        audioPlayRate: 0.23,
        socialShares: { twitter: 45, linkedin: 67, email: 12 },
        searchAppearances: 890,
        bounceRate: 0.32,
      },
      {
        contentId: 'c-002',
        title: 'AWS Lambda Best Practices',
        slug: 'aws-lambda-best-practices',
        reads: 2890,
        uniqueReaders: 1800,
        avgReadTimeMinutes: 12.3,
        audioPlayRate: 0.18,
        socialShares: { twitter: 34, linkedin: 89, email: 8 },
        searchAppearances: 720,
        bounceRate: 0.28,
      },
      {
        contentId: 'c-003',
        title: 'React Server Components Guide',
        slug: 'react-server-components',
        reads: 2340,
        uniqueReaders: 1500,
        avgReadTimeMinutes: 10.1,
        audioPlayRate: 0.31,
        socialShares: { twitter: 56, linkedin: 42, email: 15 },
        searchAppearances: 650,
        bounceRate: 0.35,
      },
    ],
  });
}

async function getContentSummary(tenantId: string, days: number): Promise<APIGatewayProxyResult> {
  return jsonResponse(200, {
    period: `${days}d`,
    totalArticles: 247,
    publishedArticles: 198,
    draftArticles: 35,
    inReviewArticles: 14,
    totalReads: 45_230,
    totalUniqueReaders: 12_340,
    avgReadTimeMinutes: 9.2,
    overallAudioPlayRate: 0.21,
    topSearchQueries: [
      { query: 'kubernetes deployment', count: 340 },
      { query: 'lambda cold start', count: 280 },
      { query: 'react server components', count: 210 },
      { query: 'typescript generics', count: 180 },
      { query: 'ci/cd pipeline', count: 150 },
    ],
  });
}
