/**
 * T-17.2: Fidelity Agent
 *
 * Compares AI-generated article against original transcript to measure
 * how faithfully the article represents the source material.
 * - Checks that key facts from transcript are preserved
 * - Detects additions not present in original recording
 * - Computes a fidelity score (0-100)
 */

import { type z } from 'zod';
import { type BedrockClient } from '../bedrock-client.js';
import { PROMPT_TEMPLATES } from '../prompts.js';
import { FidelityReportSchema, type FidelityReport } from '../schemas.js';
import { BaseAgent, type AgentResult } from './base-agent.js';

export class FidelityAgent extends BaseAgent<FidelityReport> {
  protected readonly outputSchema: z.ZodType<FidelityReport> = FidelityReportSchema;
  protected readonly agentName = 'FidelityAgent';

  constructor(bedrock: BedrockClient) {
    super(bedrock, PROMPT_TEMPLATES.checkFidelity);
  }

  async check(params: {
    transcript: string;
    articleBlocks: string;
  }): Promise<AgentResult<FidelityReport>> {
    return this.run({
      transcript: params.transcript,
      article: params.articleBlocks,
    });
  }
}
