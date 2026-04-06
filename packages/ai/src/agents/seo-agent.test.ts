import { describe, it, expect, vi } from 'vitest';
import { SEOAgent } from './seo-agent';
import type { BedrockClient } from '../bedrock-client';

const validSEOReport = JSON.stringify({
  metaTitle: 'Microservices with Node.js - Best Practices',
  metaDescription: 'Learn how to build scalable microservices using Node.js with practical examples and production patterns.',
  keywords: ['microservices', 'nodejs', 'architecture', 'scalability', 'typescript'],
  ogTitle: 'Microservices with Node.js',
  ogDescription: 'A comprehensive guide to microservices architecture',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Microservices with Node.js',
  },
  internalLinkSuggestions: [
    { anchor: 'TypeScript best practices', targetTopic: 'typescript-guide' },
  ],
});

function createMockBedrock(content: string): BedrockClient {
  return {
    invoke: vi.fn().mockResolvedValue({
      content,
      stopReason: 'end_turn',
      usage: { inputTokens: 600, outputTokens: 200, totalTokens: 800 },
      modelId: 'anthropic.claude-3-5-sonnet',
    }),
  } as unknown as BedrockClient;
}

describe('SEOAgent', () => {
  describe('analyze', () => {
    it('returns valid SEO report', async () => {
      const bedrock = createMockBedrock(validSEOReport);
      const agent = new SEOAgent(bedrock);

      const result = await agent.analyze({ title: 'Test', blocks: '[]', slug: 'test' });

      expect(result.data.metaTitle).toBeTruthy();
      expect(result.data.keywords.length).toBeGreaterThanOrEqual(3);
      expect(result.data.jsonLd).toBeTruthy();
    });

    it('passes title, blocks, and slug to prompt', async () => {
      const bedrock = createMockBedrock(validSEOReport);
      const agent = new SEOAgent(bedrock);

      await agent.analyze({
        title: 'My Article',
        blocks: '[{"type":"text","content":"hello"}]',
        slug: 'my-article',
      });

      const callArgs = vi.mocked(bedrock.invoke).mock.calls[0]!;
      const userMessage = callArgs[0]![0]!.content;
      expect(userMessage).toContain('My Article');
      expect(userMessage).toContain('my-article');
    });
  });
});
