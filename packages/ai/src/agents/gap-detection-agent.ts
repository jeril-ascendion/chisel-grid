/**
 * T-17.3: Gap Detection Agent
 *
 * Analyzes transcripts for unresolved references and knowledge gaps.
 * Compares against Bedrock Knowledge Base context when available.
 * Flags vague references like "the standard pattern we use" and suggests resolutions.
 */

import { type z } from 'zod';
import { type BedrockClient } from '../bedrock-client.js';
import { PROMPT_TEMPLATES } from '../prompts.js';
import { GapDetectionResultSchema, type GapDetectionResult } from '../schemas.js';
import { BaseAgent, type AgentResult } from './base-agent.js';

export class GapDetectionAgent extends BaseAgent<GapDetectionResult> {
  protected readonly outputSchema: z.ZodType<GapDetectionResult> =
    GapDetectionResultSchema;
  protected readonly agentName = 'GapDetectionAgent';

  constructor(bedrock: BedrockClient) {
    super(bedrock, PROMPT_TEMPLATES.detectGaps);
  }

  /**
   * Detect gaps in a transcript.
   * Optionally compare against knowledge base context for resolution.
   */
  async detect(params: {
    transcript: string;
    knowledgeContext?: string;
  }): Promise<AgentResult<GapDetectionResult>> {
    return this.run({
      transcript: params.transcript,
      knowledgeContext: params.knowledgeContext ?? '',
    });
  }
}
