import { describe, it, expect, vi } from 'vitest';
import { ReviewAgent } from './review-agent';
import type { BedrockClient } from '../bedrock-client';

const validReviewReport = JSON.stringify({
  scores: { accuracy: 85, completeness: 78, readability: 90, seo: 72, depth: 80 },
  overallScore: 81,
  needsRevision: false,
  feedback: [
    { dimension: 'completeness', comment: 'Could add more examples', severity: 'minor' },
  ],
  revisionInstructions: '',
  summary: 'Well-written article with good technical depth.',
});

function createMockBedrock(content: string): BedrockClient {
  return {
    invoke: vi.fn().mockResolvedValue({
      content,
      stopReason: 'end_turn',
      usage: { inputTokens: 800, outputTokens: 300, totalTokens: 1100 },
      modelId: 'anthropic.claude-3-5-sonnet',
    }),
  } as unknown as BedrockClient;
}

describe('ReviewAgent', () => {
  describe('review', () => {
    it('returns valid ReviewReport with scores in 0-100 range', async () => {
      const bedrock = createMockBedrock(validReviewReport);
      const agent = new ReviewAgent(bedrock);

      const result = await agent.review({ title: 'Test Article', blocks: '[]' });

      expect(result.data.overallScore).toBe(81);
      expect(result.data.scores.accuracy).toBeGreaterThanOrEqual(0);
      expect(result.data.scores.accuracy).toBeLessThanOrEqual(100);
      expect(result.data.needsRevision).toBe(false);
    });

    it('includes feedback items with valid severities', async () => {
      const bedrock = createMockBedrock(validReviewReport);
      const agent = new ReviewAgent(bedrock);

      const result = await agent.review({ title: 'Test', blocks: '[]' });

      expect(result.data.feedback).toHaveLength(1);
      expect(['critical', 'major', 'minor']).toContain(result.data.feedback[0]!.severity);
    });

    it('passes revision number to bedrock', async () => {
      const bedrock = createMockBedrock(validReviewReport);
      const agent = new ReviewAgent(bedrock);

      await agent.review({ title: 'Test', blocks: '[]', revisionNumber: 2 });

      const callArgs = vi.mocked(bedrock.invoke).mock.calls[0]!;
      const userMessage = callArgs[0]![0]!.content;
      expect(userMessage).toContain('revision #2');
    });

    it('defaults revision number to 1', async () => {
      const bedrock = createMockBedrock(validReviewReport);
      const agent = new ReviewAgent(bedrock);

      await agent.review({ title: 'Test', blocks: '[]' });

      const callArgs = vi.mocked(bedrock.invoke).mock.calls[0]!;
      const userMessage = callArgs[0]![0]!.content;
      expect(userMessage).toContain('revision #1');
    });

    it('handles report indicating revision needed', async () => {
      const needsRevisionReport = JSON.stringify({
        scores: { accuracy: 40, completeness: 35, readability: 50, seo: 30, depth: 25 },
        overallScore: 36,
        needsRevision: true,
        feedback: [
          { dimension: 'accuracy', comment: 'Contains factual errors', severity: 'critical' },
        ],
        revisionInstructions: 'Fix the factual errors in section 2.',
        summary: 'Article needs significant revision.',
      });

      const bedrock = createMockBedrock(needsRevisionReport);
      const agent = new ReviewAgent(bedrock);

      const result = await agent.review({ title: 'Bad Article', blocks: '[]' });

      expect(result.data.needsRevision).toBe(true);
      expect(result.data.overallScore).toBeLessThan(60);
      expect(result.data.revisionInstructions).toBeTruthy();
    });
  });
});
