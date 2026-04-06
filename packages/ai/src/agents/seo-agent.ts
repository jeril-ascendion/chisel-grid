import { type z } from 'zod';
import { type BedrockClient } from '../bedrock-client.js';
import { PROMPT_TEMPLATES } from '../prompts.js';
import { SEOReportSchema, type SEOReport } from '../schemas.js';
import { BaseAgent, type AgentResult } from './base-agent.js';

export class SEOAgent extends BaseAgent<SEOReport> {
  protected readonly outputSchema: z.ZodType<SEOReport> = SEOReportSchema;
  protected readonly agentName = 'SEOAgent';

  constructor(bedrock: BedrockClient) {
    super(bedrock, PROMPT_TEMPLATES.generateSEO);
  }

  async analyze(params: {
    title: string;
    blocks: string;
    slug: string;
  }): Promise<AgentResult<SEOReport>> {
    return this.run({
      title: params.title,
      blocks: params.blocks,
      slug: params.slug,
    });
  }
}
