import { z } from 'zod';
import { type BedrockClient } from '../bedrock-client.js';
import { PROMPT_TEMPLATES } from '../prompts.js';
import { BaseAgent, type AgentResult } from './base-agent.js';

const DiagramOutputSchema = z.string().min(10);

export class DiagramAgent extends BaseAgent<string> {
  protected readonly outputSchema: z.ZodType<string> = DiagramOutputSchema;
  protected readonly agentName = 'DiagramAgent';

  constructor(bedrock: BedrockClient) {
    super(bedrock, PROMPT_TEMPLATES.generateDiagram);
  }

  async generate(params: {
    description: string;
    diagramType?: string;
  }): Promise<AgentResult<string>> {
    return this.run({
      description: params.description,
      diagramType: params.diagramType ?? 'flowchart',
    });
  }

  protected override parseResponse(response: { content: string; stopReason: string; usage: { inputTokens: number; outputTokens: number; totalTokens: number }; modelId: string }): string {
    // Diagram agent returns raw Mermaid code, not JSON
    let code = response.content.trim();

    // Strip markdown fences if present
    const fenceMatch = code.match(/```(?:mermaid)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (fenceMatch?.[1]) {
      code = fenceMatch[1].trim();
    }

    const result = this.outputSchema.safeParse(code);
    if (!result.success) {
      throw new Error(`DiagramAgent output too short: ${code.length} chars`);
    }

    return result.data;
  }
}
