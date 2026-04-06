import { type z } from 'zod';
import { type BedrockClient } from '../bedrock-client.js';
import { PROMPT_TEMPLATES } from '../prompts.js';
import { ReviewReportSchema, type ReviewReport } from '../schemas.js';
import { BaseAgent, type AgentResult } from './base-agent.js';

export class ReviewAgent extends BaseAgent<ReviewReport> {
  protected readonly outputSchema: z.ZodType<ReviewReport> = ReviewReportSchema;
  protected readonly agentName = 'ReviewAgent';

  constructor(bedrock: BedrockClient) {
    super(bedrock, PROMPT_TEMPLATES.reviewArticle);
  }

  async review(params: {
    title: string;
    blocks: string;
    revisionNumber?: number;
  }): Promise<AgentResult<ReviewReport>> {
    return this.run({
      title: params.title,
      blocks: params.blocks,
      revisionNumber: String(params.revisionNumber ?? 1),
    });
  }
}
