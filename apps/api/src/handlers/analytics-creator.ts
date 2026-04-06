import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { extractUserContext, jsonResponse } from '../types';

/**
 * Creator analytics API.
 * GET /analytics/creators/leaderboard — top contributors ranked by output and quality
 * GET /analytics/creators/:userId — individual creator metrics
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userCtx = extractUserContext(event);
  if (userCtx.role !== 'admin') {
    return jsonResponse(403, { error: 'Admin access required' });
  }

  const path = event.path || '';
  const days = parseInt(event.queryStringParameters?.['days'] || '30', 10);

  if (path.endsWith('/leaderboard')) {
    return getLeaderboard(userCtx.tenantId, days);
  } else if (path.includes('/creators/')) {
    const userId = path.split('/creators/')[1];
    return getCreatorMetrics(userCtx.tenantId, userId || '', days);
  }

  return jsonResponse(404, { error: 'Not found' });
}

async function getLeaderboard(tenantId: string, days: number): Promise<APIGatewayProxyResult> {
  // In production, aggregates from content + ai_jobs tables
  return jsonResponse(200, {
    period: `${days}d`,
    creators: [
      {
        userId: 'u-001',
        name: 'Alice Chen',
        email: 'alice@example.com',
        articlesSubmitted: 18,
        articlesApproved: 15,
        articlesRejected: 2,
        articlesInReview: 1,
        approvalRate: 0.83,
        avgQualityScore: 87.5,
        totalReads: 12_400,
        avgReadTime: 9.8,
      },
      {
        userId: 'u-002',
        name: 'Bob Wilson',
        email: 'bob@example.com',
        articlesSubmitted: 12,
        articlesApproved: 10,
        articlesRejected: 1,
        articlesInReview: 1,
        approvalRate: 0.83,
        avgQualityScore: 82.3,
        totalReads: 8_900,
        avgReadTime: 7.2,
      },
      {
        userId: 'u-003',
        name: 'Carol Liu',
        email: 'carol@example.com',
        articlesSubmitted: 8,
        articlesApproved: 7,
        articlesRejected: 0,
        articlesInReview: 1,
        approvalRate: 0.88,
        avgQualityScore: 91.2,
        totalReads: 6_100,
        avgReadTime: 11.5,
      },
    ],
  });
}

async function getCreatorMetrics(tenantId: string, userId: string, days: number): Promise<APIGatewayProxyResult> {
  return jsonResponse(200, {
    period: `${days}d`,
    userId,
    summary: {
      articlesSubmitted: 18,
      articlesApproved: 15,
      articlesRejected: 2,
      articlesInReview: 1,
      approvalRate: 0.83,
      avgQualityScore: 87.5,
    },
    qualityScores: {
      accuracy: 89,
      completeness: 85,
      readability: 91,
      seo: 84,
      depth: 88,
    },
    recentArticles: [
      { title: 'Kubernetes Networking Deep Dive', status: 'published', qualityScore: 92, reads: 1240, date: '2026-04-05' },
      { title: 'Service Mesh Comparison', status: 'in_review', qualityScore: 85, reads: 0, date: '2026-04-03' },
      { title: 'Container Security Best Practices', status: 'published', qualityScore: 88, reads: 890, date: '2026-03-28' },
    ],
    monthlyTrend: [
      { month: '2026-01', submitted: 3, approved: 3, avgScore: 84 },
      { month: '2026-02', submitted: 4, approved: 3, avgScore: 86 },
      { month: '2026-03', submitted: 5, approved: 4, avgScore: 88 },
      { month: '2026-04', submitted: 6, approved: 5, avgScore: 90 },
    ],
  });
}
