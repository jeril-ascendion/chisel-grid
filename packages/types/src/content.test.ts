import { describe, it, expect } from 'vitest';
import {
  ContentBlockSchema,
  ContentTypeEnum,
  ContentStatusEnum,
  ContentMetadataSchema,
  TextBlockSchema,
  HeadingBlockSchema,
  CodeBlockSchema,
  CalloutBlockSchema,
  DiagramBlockSchema,
} from './content';

describe('ContentTypeEnum', () => {
  it('accepts valid content types', () => {
    for (const t of ['article', 'adr', 'diagram', 'decision', 'runbook', 'template', 'post_mortem']) {
      expect(ContentTypeEnum.parse(t)).toBe(t);
    }
  });

  it('rejects invalid content types', () => {
    expect(() => ContentTypeEnum.parse('invalid')).toThrow();
    expect(() => ContentTypeEnum.parse('standard_doc')).toThrow();
    expect(() => ContentTypeEnum.parse('blog_post')).toThrow();
  });
});

describe('ContentStatusEnum', () => {
  it('accepts all valid statuses', () => {
    const statuses = ['draft', 'submitted', 'in_review', 'approved', 'published', 'archived', 'deprecated', 'rejected'];
    for (const s of statuses) {
      expect(ContentStatusEnum.parse(s)).toBe(s);
    }
  });

  it('rejects invalid statuses', () => {
    expect(() => ContentStatusEnum.parse('nonsense')).toThrow();
  });
});

describe('TextBlockSchema', () => {
  it('validates a text block', () => {
    const block = { type: 'text', content: 'Hello world' };
    expect(TextBlockSchema.parse(block)).toEqual(block);
  });

  it('accepts optional metadata', () => {
    const block = { type: 'text', content: 'Hello', metadata: { bold: true } };
    expect(TextBlockSchema.parse(block)).toEqual(block);
  });
});

describe('HeadingBlockSchema', () => {
  it('validates heading levels 1-4', () => {
    for (const level of [1, 2, 3, 4] as const) {
      expect(HeadingBlockSchema.parse({ type: 'heading', level, content: 'Title' })).toEqual({
        type: 'heading',
        level,
        content: 'Title',
      });
    }
  });

  it('rejects heading level 5', () => {
    expect(() => HeadingBlockSchema.parse({ type: 'heading', level: 5, content: 'Title' })).toThrow();
  });
});

describe('CodeBlockSchema', () => {
  it('validates a code block', () => {
    const block = { type: 'code', language: 'typescript', content: 'const x = 1;' };
    expect(CodeBlockSchema.parse(block)).toEqual(block);
  });

  it('accepts optional filename', () => {
    const block = { type: 'code', language: 'ts', content: 'x', filename: 'app.ts' };
    expect(CodeBlockSchema.parse(block)).toEqual(block);
  });
});

describe('CalloutBlockSchema', () => {
  it('validates all callout variants', () => {
    for (const variant of ['info', 'warning', 'danger', 'success'] as const) {
      expect(CalloutBlockSchema.parse({ type: 'callout', variant, content: 'Note' })).toEqual({
        type: 'callout',
        variant,
        content: 'Note',
      });
    }
  });

  it('rejects unknown variants', () => {
    expect(() => CalloutBlockSchema.parse({ type: 'callout', variant: 'error', content: 'x' })).toThrow();
  });
});

describe('DiagramBlockSchema', () => {
  it('validates a mermaid diagram', () => {
    const block = { type: 'diagram', diagramType: 'mermaid', content: 'graph TD\n  A-->B' };
    expect(DiagramBlockSchema.parse(block)).toEqual(block);
  });

  it('accepts optional caption', () => {
    const block = { type: 'diagram', diagramType: 'd2', content: 'a -> b', caption: 'Flow' };
    expect(DiagramBlockSchema.parse(block)).toEqual(block);
  });
});

describe('ContentBlockSchema (discriminated union)', () => {
  it('correctly discriminates text blocks', () => {
    const result = ContentBlockSchema.parse({ type: 'text', content: 'Hello' });
    expect(result.type).toBe('text');
  });

  it('correctly discriminates heading blocks', () => {
    const result = ContentBlockSchema.parse({ type: 'heading', level: 2, content: 'Section' });
    expect(result.type).toBe('heading');
  });

  it('rejects unknown block types', () => {
    expect(() => ContentBlockSchema.parse({ type: 'video', url: 'x' })).toThrow();
  });
});

describe('ContentMetadataSchema', () => {
  it('validates complete metadata', () => {
    const meta = {
      title: 'Test Article',
      slug: 'test-article',
      description: 'A test article',
      tags: ['typescript', 'testing'],
      readTimeMinutes: 5,
      seo: {
        metaTitle: 'Test Article | ChiselGrid',
        metaDescription: 'A test article for ChiselGrid',
      },
    };
    expect(ContentMetadataSchema.parse(meta)).toBeTruthy();
  });

  it('validates minimal metadata', () => {
    const meta = { title: 'Test', slug: 'test' };
    const result = ContentMetadataSchema.parse(meta);
    expect(result.title).toBe('Test');
    expect(result.tags).toEqual([]);
  });

  it('rejects invalid audioUrl', () => {
    expect(() =>
      ContentMetadataSchema.parse({ title: 'X', slug: 'x', audioUrl: 'not-a-url' }),
    ).toThrow();
  });
});
