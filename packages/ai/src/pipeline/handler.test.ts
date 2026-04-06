import { describe, it, expect, vi } from 'vitest';
import { revisionDecision, publishStep, handler } from './handler';
import type { RevisionDecisionInput, PublishStepInput } from './handler';

// Mock Bedrock to avoid AWS calls
vi.mock('../bedrock-client', () => ({
  BedrockClient: vi.fn().mockImplementation(() => ({
    invoke: vi.fn(),
  })),
}));

const baseInput = {
  tenantId: '550e8400-e29b-41d4-a716-446655440000',
  topic: 'Building microservices',
  contentType: 'standard_doc' as const,
  authorId: '550e8400-e29b-41d4-a716-446655440001',
  maxRevisions: 3,
  revisionThreshold: 60,
};

describe('revisionDecision', () => {
  it('returns needsRevision=true when score below threshold and within max revisions', () => {
    const input: RevisionDecisionInput = {
      input: baseInput,
      contentId: '550e8400-e29b-41d4-a716-446655440002',
      currentRevision: 1,
      blocks: [
        { type: 'heading', level: 1, content: 'Title' },
        { type: 'text', content: 'A' },
        { type: 'text', content: 'B' },
      ],
      review: {
        scores: { accuracy: 40, completeness: 35, readability: 50, seo: 30, depth: 25 },
        overallScore: 36,
        needsRevision: true,
        feedback: [],
        revisionInstructions: 'Fix errors',
        summary: 'Needs work',
      },
      status: 'reviewing',
      writerJobUsage: { inputTokens: 100, outputTokens: 50 },
      reviewJobUsage: { inputTokens: 80, outputTokens: 40 },
    };

    const result = revisionDecision(input);

    expect(result.needsRevision).toBe(true);
    expect(result.currentRevision).toBe(2);
  });

  it('returns needsRevision=false when score above threshold', () => {
    const input: RevisionDecisionInput = {
      input: baseInput,
      contentId: '550e8400-e29b-41d4-a716-446655440002',
      currentRevision: 1,
      blocks: [
        { type: 'heading', level: 1, content: 'Title' },
        { type: 'text', content: 'A' },
        { type: 'text', content: 'B' },
      ],
      review: {
        scores: { accuracy: 85, completeness: 80, readability: 90, seo: 75, depth: 80 },
        overallScore: 82,
        needsRevision: false,
        feedback: [],
        revisionInstructions: '',
        summary: 'Good article',
      },
      status: 'reviewing',
      writerJobUsage: { inputTokens: 100, outputTokens: 50 },
      reviewJobUsage: { inputTokens: 80, outputTokens: 40 },
    };

    const result = revisionDecision(input);

    expect(result.needsRevision).toBe(false);
    expect(result.currentRevision).toBe(1);
  });

  it('returns needsRevision=false when at max revisions', () => {
    const input: RevisionDecisionInput = {
      input: { ...baseInput, maxRevisions: 3 },
      contentId: '550e8400-e29b-41d4-a716-446655440002',
      currentRevision: 3,
      blocks: [
        { type: 'heading', level: 1, content: 'Title' },
        { type: 'text', content: 'A' },
        { type: 'text', content: 'B' },
      ],
      review: {
        scores: { accuracy: 40, completeness: 35, readability: 50, seo: 30, depth: 25 },
        overallScore: 36,
        needsRevision: true,
        feedback: [],
        revisionInstructions: 'Fix errors',
        summary: 'Still needs work',
      },
      status: 'reviewing',
      writerJobUsage: { inputTokens: 100, outputTokens: 50 },
      reviewJobUsage: { inputTokens: 80, outputTokens: 40 },
    };

    const result = revisionDecision(input);

    expect(result.needsRevision).toBe(false);
    expect(result.currentRevision).toBe(3);
  });
});

describe('publishStep', () => {
  it('returns published status on approve', () => {
    const seo = {
      metaTitle: 'Test',
      metaDescription: 'Test description for the article',
      keywords: ['a', 'b', 'c'],
      ogTitle: 'Test',
      ogDescription: 'Test',
      jsonLd: {},
      internalLinkSuggestions: [],
    };

    const input = {
      contentId: '550e8400-e29b-41d4-a716-446655440002',
      blocks: [
        { type: 'heading' as const, level: 1 as const, content: 'Title' },
        { type: 'text' as const, content: 'A' },
        { type: 'text' as const, content: 'B' },
      ],
      seo,
      review: {
        scores: { accuracy: 85, completeness: 80, readability: 90, seo: 75, depth: 80 },
        overallScore: 82,
        needsRevision: false,
        feedback: [],
        revisionInstructions: '',
        summary: 'Good',
      },
      decision: 'approve' as const,
    } as unknown as PublishStepInput;

    const result = publishStep(input);

    expect(result.status).toBe('published');
    expect(result.decision).toBe('approve');
  });

  it('returns rejected status on reject', () => {
    const input = {
      contentId: '550e8400-e29b-41d4-a716-446655440002',
      blocks: [],
      seo: {
        metaTitle: 'X',
        metaDescription: 'X',
        keywords: ['a', 'b', 'c'],
        ogTitle: 'X',
        ogDescription: 'X',
        jsonLd: {},
        internalLinkSuggestions: [],
      },
      review: {
        scores: { accuracy: 85, completeness: 80, readability: 90, seo: 75, depth: 80 },
        overallScore: 82,
        needsRevision: false,
        feedback: [],
        revisionInstructions: '',
        summary: 'X',
      },
      decision: 'reject' as const,
    } as unknown as PublishStepInput;

    const result = publishStep(input);

    expect(result.status).toBe('rejected');
  });
});

describe('handler', () => {
  it('routes revisionDecision step', async () => {
    const payload = {
      input: baseInput,
      contentId: '550e8400-e29b-41d4-a716-446655440002',
      currentRevision: 1,
      blocks: [
        { type: 'heading', level: 1, content: 'Title' },
        { type: 'text', content: 'A' },
        { type: 'text', content: 'B' },
      ],
      review: {
        scores: { accuracy: 85, completeness: 80, readability: 90, seo: 75, depth: 80 },
        overallScore: 82,
        needsRevision: false,
        feedback: [],
        revisionInstructions: '',
        summary: 'Good',
      },
      status: 'reviewing',
      writerJobUsage: { inputTokens: 100, outputTokens: 50 },
      reviewJobUsage: { inputTokens: 80, outputTokens: 40 },
    };

    const result = await handler({ step: 'revisionDecision', payload });
    expect((result as any).needsRevision).toBe(false);
  });

  it('throws on unknown step', async () => {
    await expect(handler({ step: 'unknown', payload: {} })).rejects.toThrow('Unknown pipeline step');
  });
});
