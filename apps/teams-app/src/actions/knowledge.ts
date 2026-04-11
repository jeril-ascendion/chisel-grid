/**
 * T-20.3 Knowledge Bot AI Actions
 *
 * Registers AI actions for the knowledge bot:
 * - searchKnowledge: RAG search over published articles via Bedrock Knowledge Base
 * - getRelatedArticles: Find related content from Aurora
 * - bookmarkArticle: Save to user bookmarks
 * - checkKnowledgeGap: Query knowledge_gaps view
 * - getMyDrafts: List user's pending drafts
 */

import type { Application, TurnState } from '@microsoft/teams-ai';
import type { AppConfig } from '../config.js';

interface KnowledgeSearchResult {
  articleId: string;
  title: string;
  excerpt: string;
  author: string;
  slug: string;
  score: number;
}

interface ArticleResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  author: string;
  publishedAt: string;
  readTime: number;
  tags: string[];
}

async function callChiselGridApi(
  config: AppConfig,
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  const response = await fetch(`${config.chiselGridApiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`ChiselGrid API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export function registerKnowledgeActions(
  app: Application<TurnState>,
  config: AppConfig,
): void {
  /**
   * searchKnowledge — Searches Bedrock Knowledge Base, returns top 3 articles.
   */
  app.ai.action('searchKnowledge', async (context, state, params: { query: string }) => {
    const { query } = params;

    const results = await callChiselGridApi(config, '/api/knowledge/search', {
      method: 'POST',
      body: JSON.stringify({ query, limit: 3 }),
    }) as KnowledgeSearchResult[];

    if (!results.length) {
      await context.sendActivity(
        `No articles found for "${query}". Would you like to create a draft on this topic?`,
      );
      return 'No results found. Suggest creating content on this topic.';
    }

    const formatted = results
      .map(
        (r, i) =>
          `${i + 1}. **${r.title}** by ${r.author}\n   ${r.excerpt}\n   Score: ${(r.score * 100).toFixed(0)}%`,
      )
      .join('\n\n');

    return `Found ${results.length} articles:\n\n${formatted}`;
  });

  /**
   * getRelatedArticles — Finds related content from Aurora by article ID.
   */
  app.ai.action('getRelatedArticles', async (context, state, params: { articleId: string }) => {
    const { articleId } = params;

    const results = await callChiselGridApi(
      config,
      `/api/content/${articleId}/related`,
    ) as ArticleResult[];

    if (!results.length) {
      return 'No related articles found.';
    }

    const formatted = results
      .map((r) => `- **${r.title}** by ${r.author} (${r.readTime} min read)`)
      .join('\n');

    return `Related articles:\n${formatted}`;
  });

  /**
   * bookmarkArticle — Saves article to user's bookmarks table.
   */
  app.ai.action('bookmarkArticle', async (context, state, params: { articleId: string }) => {
    const { articleId } = params;
    const userId = context.activity.from?.aadObjectId ?? context.activity.from?.id;

    await callChiselGridApi(config, '/api/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ articleId, userId }),
    });

    return `Article bookmarked successfully.`;
  });

  /**
   * checkKnowledgeGap — Queries knowledge_gaps view in Aurora.
   */
  app.ai.action('checkKnowledgeGap', async (context, state, params: { topic: string }) => {
    const { topic } = params;

    const result = await callChiselGridApi(
      config,
      `/api/knowledge/gaps?topic=${encodeURIComponent(topic)}`,
    ) as { exists: boolean; searchCount: number; relatedTopics: string[] };

    if (result.exists) {
      return `Knowledge gap detected for "${topic}". This topic has been searched ${result.searchCount} times with no matching articles. Related topics: ${result.relatedTopics.join(', ')}`;
    }

    return `No significant knowledge gap for "${topic}". Content exists or demand is low.`;
  });

  /**
   * getMyDrafts — Lists user's pending drafts from Aurora.
   */
  app.ai.action('getMyDrafts', async (context, state) => {
    const userId = context.activity.from?.aadObjectId ?? context.activity.from?.id;

    const drafts = await callChiselGridApi(
      config,
      `/api/content?status=draft&authorId=${userId}`,
    ) as ArticleResult[];

    if (!drafts.length) {
      return 'You have no pending drafts.';
    }

    const formatted = drafts
      .map((d) => `- **${d.title}** (${d.tags.join(', ')})`)
      .join('\n');

    return `Your pending drafts:\n${formatted}`;
  });
}
