import { describe, it, expect } from 'vitest';
import {
  ReviewScoresSchema,
  ReviewReportSchema,
  WriterOutputSchema,
  SEOReportSchema,
  PipelineInputSchema,
  PipelineStateSchema,
  HumanReviewDecisionSchema,
} from './schemas';

describe('ReviewScoresSchema', () => {
  it('accepts valid scores (0-100)', () => {
    const scores = { accuracy: 85, completeness: 90, readability: 78, seo: 65, depth: 92 };
    expect(ReviewScoresSchema.parse(scores)).toEqual(scores);
  });

  it('accepts boundary scores (0 and 100)', () => {
    const scores = { accuracy: 0, completeness: 100, readability: 0, seo: 100, depth: 50 };
    expect(ReviewScoresSchema.parse(scores)).toEqual(scores);
  });

  it('rejects scores above 100', () => {
    expect(() =>
      ReviewScoresSchema.parse({ accuracy: 101, completeness: 50, readability: 50, seo: 50, depth: 50 }),
    ).toThrow();
  });

  it('rejects negative scores', () => {
    expect(() =>
      ReviewScoresSchema.parse({ accuracy: -1, completeness: 50, readability: 50, seo: 50, depth: 50 }),
    ).toThrow();
  });
});

describe('ReviewReportSchema', () => {
  const validReport = {
    scores: { accuracy: 80, completeness: 75, readability: 85, seo: 70, depth: 80 },
    overallScore: 78,
    needsRevision: false,
    feedback: [
      { dimension: 'accuracy', comment: 'Good technical detail', severity: 'minor' as const },
    ],
    revisionInstructions: '',
    summary: 'Article is well-written and technically sound.',
  };

  it('validates a complete review report', () => {
    expect(ReviewReportSchema.parse(validReport)).toEqual(validReport);
  });

  it('validates feedback severities', () => {
    for (const severity of ['critical', 'major', 'minor'] as const) {
      const report = {
        ...validReport,
        feedback: [{ dimension: 'test', comment: 'test', severity }],
      };
      expect(ReviewReportSchema.parse(report)).toBeTruthy();
    }
  });

  it('rejects invalid severity', () => {
    const report = {
      ...validReport,
      feedback: [{ dimension: 'test', comment: 'test', severity: 'low' }],
    };
    expect(() => ReviewReportSchema.parse(report)).toThrow();
  });
});

describe('WriterOutputSchema', () => {
  it('validates an array of 3+ content blocks', () => {
    const blocks = [
      { type: 'heading' as const, level: 1 as const, content: 'Title' },
      { type: 'text' as const, content: 'Intro paragraph' },
      { type: 'text' as const, content: 'Second paragraph' },
    ];
    expect(WriterOutputSchema.parse(blocks)).toHaveLength(3);
  });

  it('rejects fewer than 3 blocks', () => {
    const blocks = [
      { type: 'heading' as const, level: 1 as const, content: 'Title' },
      { type: 'text' as const, content: 'Only one paragraph' },
    ];
    expect(() => WriterOutputSchema.parse(blocks)).toThrow();
  });
});

describe('SEOReportSchema', () => {
  const validSEO = {
    metaTitle: 'Test Article - ChiselGrid',
    metaDescription: 'A comprehensive guide to testing in TypeScript',
    keywords: ['testing', 'typescript', 'vitest'],
    ogTitle: 'Test Article',
    ogDescription: 'A comprehensive guide',
    jsonLd: { '@type': 'Article', headline: 'Test' },
    internalLinkSuggestions: [{ anchor: 'TypeScript guide', targetTopic: 'typescript-basics' }],
  };

  it('validates a complete SEO report', () => {
    expect(SEOReportSchema.parse(validSEO)).toEqual(validSEO);
  });

  it('rejects metaTitle over 70 chars', () => {
    expect(() =>
      SEOReportSchema.parse({ ...validSEO, metaTitle: 'x'.repeat(71) }),
    ).toThrow();
  });

  it('rejects metaDescription over 170 chars', () => {
    expect(() =>
      SEOReportSchema.parse({ ...validSEO, metaDescription: 'x'.repeat(171) }),
    ).toThrow();
  });

  it('requires at least 3 keywords', () => {
    expect(() =>
      SEOReportSchema.parse({ ...validSEO, keywords: ['one', 'two'] }),
    ).toThrow();
  });

  it('allows at most 10 keywords', () => {
    expect(() =>
      SEOReportSchema.parse({
        ...validSEO,
        keywords: Array.from({ length: 11 }, (_, i) => `kw${i}`),
      }),
    ).toThrow();
  });
});

describe('PipelineInputSchema', () => {
  it('validates minimal pipeline input with defaults', () => {
    const input = {
      tenantId: '550e8400-e29b-41d4-a716-446655440000',
      topic: 'Building microservices with Node.js',
      authorId: '550e8400-e29b-41d4-a716-446655440001',
    };
    const result = PipelineInputSchema.parse(input);
    expect(result.contentType).toBe('standard_doc');
    expect(result.maxRevisions).toBe(3);
    expect(result.revisionThreshold).toBe(60);
  });

  it('rejects topic shorter than 5 characters', () => {
    expect(() =>
      PipelineInputSchema.parse({
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        topic: 'Hi',
        authorId: '550e8400-e29b-41d4-a716-446655440001',
      }),
    ).toThrow();
  });
});

describe('HumanReviewDecisionSchema', () => {
  it('validates approve decision', () => {
    const decision = {
      contentId: '550e8400-e29b-41d4-a716-446655440000',
      decision: 'approve' as const,
      reviewerId: '550e8400-e29b-41d4-a716-446655440001',
      taskToken: 'abc123',
    };
    expect(HumanReviewDecisionSchema.parse(decision)).toBeTruthy();
  });

  it('validates reject decision with feedback', () => {
    const decision = {
      contentId: '550e8400-e29b-41d4-a716-446655440000',
      decision: 'reject' as const,
      feedback: 'Not ready for publication',
      reviewerId: '550e8400-e29b-41d4-a716-446655440001',
      taskToken: 'abc123',
    };
    expect(HumanReviewDecisionSchema.parse(decision)).toBeTruthy();
  });
});
