/**
 * T-20.4 Creator Bot AI Actions
 *
 * Registers AI actions for content creation:
 * - startArticleDraft: Triggers ChiselGrid Step Functions pipeline
 * - getDraftStatus: Checks Step Functions execution status
 * - submitDraftForReview: Updates content status to in_review
 */

import type { Application, TurnState } from '@microsoft/teams-ai';
import type { AppConfig } from '../config.js';
import { SFNClient, StartExecutionCommand, DescribeExecutionCommand } from '@aws-sdk/client-sfn';

const sfnClient = new SFNClient({
  region: process.env.AWS_REGION ?? 'ap-southeast-1',
});

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

export function registerCreatorActions(
  app: Application<TurnState>,
  config: AppConfig,
): void {
  /**
   * startArticleDraft — Calls ChiselGrid Step Functions pipeline, returns jobId.
   */
  app.ai.action(
    'startArticleDraft',
    async (context, state, params: { topic: string; contentType?: string }) => {
      const { topic, contentType = 'standard_doc' } = params;
      const userId = context.activity.from?.aadObjectId ?? context.activity.from?.id;

      const stateMachineArn = process.env.CONTENT_PIPELINE_ARN;
      if (!stateMachineArn) {
        return 'Content pipeline is not configured. Contact an administrator.';
      }

      const execution = await sfnClient.send(
        new StartExecutionCommand({
          stateMachineArn,
          input: JSON.stringify({
            topic,
            contentType,
            authorId: userId,
            source: 'teams_bot',
            tenantId: 'default',
          }),
        }),
      );

      const jobId = execution.executionArn?.split(':').pop() ?? 'unknown';

      await context.sendActivity(
        `🚀 Draft generation started for "${topic}"!\n\nJob ID: \`${jobId}\`\n\nI'll notify you when the AI agents complete. Use \`getDraftStatus\` to check progress.`,
      );

      return `Draft generation started. Job ID: ${jobId}. Execution ARN: ${execution.executionArn}`;
    },
  );

  /**
   * getDraftStatus — Checks Step Functions execution status.
   */
  app.ai.action('getDraftStatus', async (context, state, params: { jobId: string }) => {
    const { jobId } = params;

    // jobId may be the execution name or full ARN
    const executionArn = jobId.startsWith('arn:')
      ? jobId
      : `arn:aws:states:${config.awsRegion}:*:execution:ChiselGridContentPipeline:${jobId}`;

    try {
      const execution = await sfnClient.send(
        new DescribeExecutionCommand({ executionArn }),
      );

      const status = execution.status ?? 'UNKNOWN';
      const startDate = execution.startDate?.toISOString() ?? 'N/A';

      let detail = `Status: **${status}**\nStarted: ${startDate}`;

      if (execution.status === 'SUCCEEDED' && execution.output) {
        const output = JSON.parse(execution.output);
        detail += `\nDraft ID: ${output.contentId ?? 'N/A'}`;
        detail += `\nQuality Score: ${output.reviewReport?.overallScore ?? 'N/A'}`;
      } else if (execution.status === 'FAILED') {
        detail += `\nError: ${execution.error ?? 'Unknown error'}`;
      } else if (execution.status === 'RUNNING') {
        detail += '\nThe AI agents are still working on your draft.';
      }

      return detail;
    } catch {
      return `Could not find execution for job ID: ${jobId}`;
    }
  });

  /**
   * submitDraftForReview — Updates content status in Aurora to in_review.
   */
  app.ai.action('submitDraftForReview', async (context, state, params: { draftId: string }) => {
    const { draftId } = params;

    await callChiselGridApi(config, `/api/content/${draftId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'in_review' }),
    });

    await context.sendActivity(
      `✅ Draft submitted for review! Admins will be notified. Draft ID: \`${draftId}\``,
    );

    return `Draft ${draftId} submitted for review.`;
  });
}
