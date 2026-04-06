/**
 * T-17.1: Structure Agent
 *
 * Processes raw transcripts into clean, structured outlines.
 * - Removes filler words via regex + AI
 * - Identifies sections by topic shift detection
 * - Extracts key points per section
 * - Suggests article title
 */

import { type z } from 'zod';
import { type BedrockClient } from '../bedrock-client.js';
import { PROMPT_TEMPLATES } from '../prompts.js';
import { StructuredTranscriptOutputSchema, type StructuredTranscriptOutput } from '../schemas.js';
import { BaseAgent, type AgentResult } from './base-agent.js';

// Common filler words and phrases to remove before AI processing
const FILLER_PATTERNS = [
  /\b(um|uh|er|ah|eh|hmm|hm|mm)\b/gi,
  /\b(you know|I mean|like|basically|actually|literally|right|okay so|so yeah)\b/gi,
  /\b(kind of|sort of|I guess|I think|I suppose)\b/gi,
  /\b(well|anyway|anyways|anyhow)\b(?=\s*,?\s*(?:so|the|we|I|it|this|that))/gi,
  /\b(let me think|let me see|how do I say this)\b/gi,
];

export class StructureAgent extends BaseAgent<StructuredTranscriptOutput> {
  protected readonly outputSchema: z.ZodType<StructuredTranscriptOutput> =
    StructuredTranscriptOutputSchema;
  protected readonly agentName = 'StructureAgent';

  constructor(bedrock: BedrockClient) {
    super(bedrock, PROMPT_TEMPLATES.structureTranscript);
  }

  /**
   * Pre-process transcript: remove filler words via regex
   * Returns cleaned text and count of removed fillers
   */
  private removeFillerWords(text: string): { cleaned: string; removedCount: number } {
    let cleaned = text;
    let removedCount = 0;

    for (const pattern of FILLER_PATTERNS) {
      const matches = cleaned.match(pattern);
      if (matches) {
        removedCount += matches.length;
      }
      cleaned = cleaned.replace(pattern, '');
    }

    // Clean up extra spaces and punctuation artifacts
    cleaned = cleaned
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([,.])/g, '$1')
      .replace(/,\s*,/g, ',')
      .replace(/\.\s*\./g, '.')
      .trim();

    return { cleaned, removedCount };
  }

  async structure(params: {
    transcript: string;
    languageCode?: string;
    durationMs?: number;
  }): Promise<AgentResult<StructuredTranscriptOutput> & { fillerWordsRemoved: number }> {
    // Step 1: Remove filler words via regex
    const { cleaned, removedCount } = this.removeFillerWords(params.transcript);

    // Step 2: Send to AI for deeper structuring
    const result = await this.run({
      transcript: cleaned,
      languageCode: params.languageCode ?? 'en-US',
      durationSeconds: String(Math.round((params.durationMs ?? 0) / 1000)),
    });

    return {
      ...result,
      fillerWordsRemoved: removedCount + (result.data.fillerWordsRemoved ?? 0),
    };
  }
}
