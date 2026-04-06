import { describe, it, expect, vi } from 'vitest';
import { WriterAgent } from './writer-agent';
import type { BedrockClient } from '../bedrock-client';

const validWriterOutput = JSON.stringify([
  { type: 'heading', level: 1, content: 'Introduction to Microservices' },
  { type: 'text', content: 'Microservices architecture is a design approach...' },
  { type: 'text', content: 'Key benefits include scalability and maintainability.' },
  { type: 'code', language: 'typescript', content: 'const service = new Service();', filename: 'app.ts' },
]);

function createMockBedrock(content: string): BedrockClient {
  return {
    invoke: vi.fn().mockResolvedValue({
      content,
      stopReason: 'end_turn',
      usage: { inputTokens: 500, outputTokens: 2000, totalTokens: 2500 },
      modelId: 'anthropic.claude-3-5-sonnet',
    }),
  } as unknown as BedrockClient;
}

describe('WriterAgent', () => {
  describe('write', () => {
    it('returns valid ContentBlock[] with usage', async () => {
      const bedrock = createMockBedrock(validWriterOutput);
      const agent = new WriterAgent(bedrock);

      const result = await agent.write({ topic: 'Introduction to Microservices' });

      expect(result.data).toHaveLength(4);
      expect(result.data[0]!.type).toBe('heading');
      expect(result.usage.inputTokens).toBe(500);
      expect(result.usage.outputTokens).toBe(2000);
    });

    it('passes topic and defaults to bedrock', async () => {
      const bedrock = createMockBedrock(validWriterOutput);
      const agent = new WriterAgent(bedrock);

      await agent.write({ topic: 'Test Topic' });

      expect(bedrock.invoke).toHaveBeenCalledOnce();
      const callArgs = vi.mocked(bedrock.invoke).mock.calls[0]!;
      const userMessage = callArgs[0]![0]!.content;
      expect(userMessage).toContain('Test Topic');
      expect(userMessage).toContain('standard_doc');
    });

    it('throws on invalid output (fewer than 3 blocks)', async () => {
      const bedrock = createMockBedrock(
        JSON.stringify([
          { type: 'heading', level: 1, content: 'Title' },
          { type: 'text', content: 'Paragraph' },
        ]),
      );
      const agent = new WriterAgent(bedrock);

      await expect(agent.write({ topic: 'Short' })).rejects.toThrow();
    });
  });

  describe('revise', () => {
    it('returns revised ContentBlock[]', async () => {
      const bedrock = createMockBedrock(validWriterOutput);
      const agent = new WriterAgent(bedrock);

      const result = await agent.revise({
        originalBlocks: validWriterOutput,
        reviewFeedback: 'Add more examples',
        revisionInstructions: 'Include code samples',
      });

      expect(result.data.length).toBeGreaterThanOrEqual(3);
    });

    it('uses revise prompt template', async () => {
      const bedrock = createMockBedrock(validWriterOutput);
      const agent = new WriterAgent(bedrock);

      await agent.revise({
        originalBlocks: '[]',
        reviewFeedback: 'feedback',
        revisionInstructions: 'instructions',
      });

      const callArgs = vi.mocked(bedrock.invoke).mock.calls[0]!;
      const userMessage = callArgs[0]![0]!.content;
      expect(userMessage).toContain('Revise this article');
      expect(userMessage).toContain('feedback');
    });
  });
});
