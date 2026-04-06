import { type z } from 'zod';
import { BedrockClient, type BedrockResponse, type InvokeOptions } from '../bedrock-client.js';
import { type PromptTemplate } from '../prompts.js';

export interface AgentResult<T> {
  data: T;
  usage: { inputTokens: number; outputTokens: number };
  modelId: string;
  durationMs: number;
}

export abstract class BaseAgent<TOutput> {
  protected readonly bedrock: BedrockClient;
  protected readonly prompt: PromptTemplate;
  protected abstract readonly outputSchema: z.ZodType<TOutput>;
  protected abstract readonly agentName: string;

  constructor(bedrock: BedrockClient, prompt: PromptTemplate) {
    this.bedrock = bedrock;
    this.prompt = prompt;
  }

  async run(vars: Record<string, string>, options?: InvokeOptions): Promise<AgentResult<TOutput>> {
    const start = Date.now();
    const userMessage = this.prompt.buildUserMessage(vars);

    const response = await this.bedrock.invoke(
      [{ role: 'user', content: userMessage }],
      {
        system: this.prompt.system,
        maxTokens: options?.maxTokens ?? 8192,
        temperature: options?.temperature ?? 0.3,
        ...options,
      },
    );

    const parsed = this.parseResponse(response);
    const durationMs = Date.now() - start;

    return {
      data: parsed,
      usage: {
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
      },
      modelId: response.modelId,
      durationMs,
    };
  }

  protected parseResponse(response: BedrockResponse): TOutput {
    const jsonStr = this.extractJson(response.content);
    const raw: unknown = JSON.parse(jsonStr);
    const result = this.outputSchema.safeParse(raw);

    if (!result.success) {
      throw new AgentValidationError(
        this.agentName,
        result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      );
    }

    return result.data;
  }

  protected extractJson(text: string): string {
    // Try to find JSON in markdown code fences first
    const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (fenceMatch?.[1]) {
      return fenceMatch[1].trim();
    }

    // Try to find raw JSON (array or object)
    const jsonMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (jsonMatch?.[1]) {
      return jsonMatch[1].trim();
    }

    return text.trim();
  }
}

export class AgentValidationError extends Error {
  readonly agentName: string;
  readonly validationDetails: string;

  constructor(agentName: string, details: string) {
    super(`${agentName} output validation failed: ${details}`);
    this.name = 'AgentValidationError';
    this.agentName = agentName;
    this.validationDetails = details;
  }
}
