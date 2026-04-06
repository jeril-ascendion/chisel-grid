import { describe, it, expect, vi } from 'vitest';
import { DiagramAgent } from './diagram-agent';
import type { BedrockClient } from '../bedrock-client';

function createMockBedrock(content: string): BedrockClient {
  return {
    invoke: vi.fn().mockResolvedValue({
      content,
      stopReason: 'end_turn',
      usage: { inputTokens: 200, outputTokens: 100, totalTokens: 300 },
      modelId: 'anthropic.claude-3-5-sonnet',
    }),
  } as unknown as BedrockClient;
}

describe('DiagramAgent', () => {
  describe('generate', () => {
    it('returns raw Mermaid code', async () => {
      const mermaidCode = 'graph TD\n  A[Start] --> B[End]';
      const bedrock = createMockBedrock(mermaidCode);
      const agent = new DiagramAgent(bedrock);

      const result = await agent.generate({ description: 'Simple flow' });

      expect(result.data).toBe(mermaidCode);
    });

    it('strips mermaid code fences', async () => {
      const wrapped = '```mermaid\ngraph TD\n  A --> B\n```';
      const bedrock = createMockBedrock(wrapped);
      const agent = new DiagramAgent(bedrock);

      const result = await agent.generate({ description: 'Flow' });

      expect(result.data).toBe('graph TD\n  A --> B');
    });

    it('strips plain code fences', async () => {
      const wrapped = '```\nsequenceDiagram\n  Alice->>Bob: Hello\n```';
      const bedrock = createMockBedrock(wrapped);
      const agent = new DiagramAgent(bedrock);

      const result = await agent.generate({ description: 'Sequence' });

      expect(result.data).toBe('sequenceDiagram\n  Alice->>Bob: Hello');
    });

    it('rejects output shorter than 10 characters', async () => {
      const bedrock = createMockBedrock('short');
      const agent = new DiagramAgent(bedrock);

      await expect(agent.generate({ description: 'test' })).rejects.toThrow('too short');
    });

    it('passes diagram type to prompt', async () => {
      const bedrock = createMockBedrock('sequenceDiagram\n  A->>B: msg');
      const agent = new DiagramAgent(bedrock);

      await agent.generate({ description: 'Auth flow', diagramType: 'sequenceDiagram' });

      const callArgs = vi.mocked(bedrock.invoke).mock.calls[0]!;
      const userMessage = callArgs[0]![0]!.content;
      expect(userMessage).toContain('sequenceDiagram');
    });

    it('defaults diagram type to flowchart', async () => {
      const bedrock = createMockBedrock('graph TD\n  A --> B');
      const agent = new DiagramAgent(bedrock);

      await agent.generate({ description: 'test flow' });

      const callArgs = vi.mocked(bedrock.invoke).mock.calls[0]!;
      const userMessage = callArgs[0]![0]!.content;
      expect(userMessage).toContain('flowchart');
    });
  });
});
