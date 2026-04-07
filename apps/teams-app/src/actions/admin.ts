/**
 * T-20.5 Admin Bot AI Actions
 *
 * Registers AI actions for admin workflow:
 * - getPendingReviews: Lists in_review content from Aurora
 * - approveArticle: Calls ChiselGrid approve API
 * - rejectArticle: Calls ChiselGrid reject API with feedback
 */

import type { Application, TurnState } from '@microsoft/teams-ai';
import type { AppConfig } from '../config';

interface ReviewItem {
  id: string;
  title: string;
  author: string;
  submittedAt: string;
  qualityScore: number;
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

export function registerAdminActions(
  app: Application<TurnState>,
  config: AppConfig,
): void {
  /**
   * getPendingReviews — Queries Aurora content table where status=in_review.
   */
  app.ai.action('getPendingReviews', async (context, state) => {
    const reviews = await callChiselGridApi(
      config,
      '/api/content?status=in_review',
    ) as ReviewItem[];

    if (!reviews.length) {
      return 'No pending reviews. All caught up! 🎉';
    }

    const formatted = reviews
      .map(
        (r) =>
          `- **${r.title}** by ${r.author} — Score: ${r.qualityScore}/100 (submitted ${r.submittedAt})`,
      )
      .join('\n');

    return `Pending reviews (${reviews.length}):\n${formatted}`;
  });

  /**
   * approveArticle — Calls ChiselGrid approve API endpoint.
   */
  app.ai.action('approveArticle', async (context, state, params: { contentId: string }) => {
    const { contentId } = params;
    const reviewerId = context.activity.from?.aadObjectId ?? context.activity.from?.id;

    await callChiselGridApi(config, `/api/content/${contentId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ reviewerId }),
    });

    await context.sendActivity(
      `✅ Article approved and queued for publication! Content ID: \`${contentId}\``,
    );

    return `Article ${contentId} approved.`;
  });

  /**
   * rejectArticle — Calls ChiselGrid reject API with feedback.
   */
  app.ai.action(
    'rejectArticle',
    async (context, state, params: { contentId: string; feedback: string }) => {
      const { contentId, feedback } = params;
      const reviewerId = context.activity.from?.aadObjectId ?? context.activity.from?.id;

      await callChiselGridApi(config, `/api/content/${contentId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reviewerId, feedback }),
      });

      await context.sendActivity(
        `❌ Article rejected with feedback. The author will be notified.\n\nFeedback: ${feedback}`,
      );

      return `Article ${contentId} rejected with feedback: ${feedback}`;
    },
  );
}
