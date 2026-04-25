import { type z } from 'zod';
import { type BedrockClient } from '../bedrock-client.js';
import { PROMPT_TEMPLATES } from '../prompts.js';
import { WriterOutputSchema, type WriterOutput } from '../schemas.js';
import { BaseAgent, type AgentResult } from './base-agent.js';

export class WriterAgent extends BaseAgent<WriterOutput> {
  protected readonly outputSchema: z.ZodType<WriterOutput> = WriterOutputSchema;
  protected readonly agentName = 'WriterAgent';

  constructor(bedrock: BedrockClient) {
    super(bedrock, PROMPT_TEMPLATES.writeArticle);
  }

  async write(params: {
    topic: string;
    contentType?: string;
    categoryContext?: string;
    additionalInstructions?: string;
  }): Promise<AgentResult<WriterOutput>> {
    return this.run({
      topic: params.topic,
      contentType: params.contentType ?? 'article',
      categoryContext: params.categoryContext ?? '',
      additionalInstructions: params.additionalInstructions ?? '',
    });
  }

  async revise(params: {
    originalBlocks: string;
    reviewFeedback: string;
    revisionInstructions: string;
  }): Promise<AgentResult<WriterOutput>> {
    const prompt = PROMPT_TEMPLATES.reviseArticle;
    const userMessage = prompt.buildUserMessage({
      originalBlocks: params.originalBlocks,
      reviewFeedback: params.reviewFeedback,
      revisionInstructions: params.revisionInstructions,
    });

    const start = Date.now();
    const response = await this.bedrock.invoke(
      [{ role: 'user', content: userMessage }],
      { system: prompt.system, maxTokens: 8192, temperature: 0.3 },
    );

    const parsed = this.parseResponse(response);

    return {
      data: parsed,
      usage: {
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
      },
      modelId: response.modelId,
      durationMs: Date.now() - start,
    };
  }
}
