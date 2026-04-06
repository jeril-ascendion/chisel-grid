import { describe, it, expect } from 'vitest';
import { contentToSSML } from './ssml-converter';
import type { ContentBlock } from '@chiselgrid/types';

describe('contentToSSML', () => {
  it('wraps output in <speak> tags', () => {
    const blocks: ContentBlock[] = [
      { type: 'text', content: 'Hello world' },
    ];
    const ssml = contentToSSML(blocks);
    expect(ssml).toMatch(/^<speak>\n/);
    expect(ssml).toMatch(/\n<\/speak>$/);
  });

  it('converts text blocks to paragraphs', () => {
    const blocks: ContentBlock[] = [
      { type: 'text', content: 'First paragraph.' },
      { type: 'text', content: 'Second paragraph.' },
    ];
    const ssml = contentToSSML(blocks);
    expect(ssml).toContain('<p>First paragraph.</p>');
    expect(ssml).toContain('<p>Second paragraph.</p>');
  });

  it('converts headings with emphasis', () => {
    const blocks: ContentBlock[] = [
      { type: 'heading', level: 1, content: 'Main Title' },
      { type: 'heading', level: 3, content: 'Subsection' },
    ];
    const ssml = contentToSSML(blocks);
    expect(ssml).toContain('<emphasis level="strong">Main Title</emphasis>');
    expect(ssml).toContain('<emphasis level="moderate">Subsection</emphasis>');
  });

  it('adds break elements around headings', () => {
    const blocks: ContentBlock[] = [
      { type: 'heading', level: 2, content: 'Section' },
    ];
    const ssml = contentToSSML(blocks);
    expect(ssml).toContain('<break time="800ms"/>');
  });

  it('skips code blocks with notice', () => {
    const blocks: ContentBlock[] = [
      { type: 'code', language: 'typescript', content: 'const x = 1;' },
    ];
    const ssml = contentToSSML(blocks);
    expect(ssml).toContain('Code example omitted in audio version.');
    expect(ssml).not.toContain('const x = 1');
  });

  it('converts callouts with variant labels', () => {
    const blocks: ContentBlock[] = [
      { type: 'callout', variant: 'warning', content: 'Be careful with this.' },
    ];
    const ssml = contentToSSML(blocks);
    expect(ssml).toContain('Warning:');
    expect(ssml).toContain('Be careful with this.');
  });

  it('converts info callout with Note label', () => {
    const blocks: ContentBlock[] = [
      { type: 'callout', variant: 'info', content: 'Important note.' },
    ];
    const ssml = contentToSSML(blocks);
    expect(ssml).toContain('Note:');
  });

  it('converts success callout with Key takeaway label', () => {
    const blocks: ContentBlock[] = [
      { type: 'callout', variant: 'success', content: 'Great job!' },
    ];
    const ssml = contentToSSML(blocks);
    expect(ssml).toContain('Key takeaway:');
  });

  it('skips diagrams without caption', () => {
    const blocks: ContentBlock[] = [
      { type: 'diagram', diagramType: 'mermaid', content: 'graph TD\n  A-->B' },
    ];
    const ssml = contentToSSML(blocks);
    expect(ssml).not.toContain('graph TD');
  });

  it('includes diagram caption when present', () => {
    const blocks: ContentBlock[] = [
      { type: 'diagram', diagramType: 'mermaid', content: 'graph TD\n  A-->B', caption: 'Architecture overview' },
    ];
    const ssml = contentToSSML(blocks);
    expect(ssml).toContain('Diagram: Architecture overview');
  });

  it('applies pronunciation dictionary for technical terms', () => {
    const blocks: ContentBlock[] = [
      { type: 'text', content: 'Use the AWS API to deploy to K8s.' },
    ];
    const ssml = contentToSSML(blocks);
    expect(ssml).toContain('A W S');
    expect(ssml).toContain('A P I');
    expect(ssml).toContain('Kubernetes');
  });

  it('strips markdown formatting from text', () => {
    const blocks: ContentBlock[] = [
      { type: 'text', content: 'This is **bold** and *italic* with `code` and [link](http://example.com).' },
    ];
    const ssml = contentToSSML(blocks);
    expect(ssml).not.toContain('**');
    expect(ssml).not.toContain('*italic*');
    expect(ssml).not.toContain('`code`');
    expect(ssml).not.toContain('[link]');
    expect(ssml).toContain('bold');
    expect(ssml).toContain('italic');
    expect(ssml).toContain('code');
    expect(ssml).toContain('link');
  });

  it('escapes SSML special characters', () => {
    const blocks: ContentBlock[] = [
      { type: 'text', content: 'Use <tag> & "quotes" for it\'s value.' },
    ];
    const ssml = contentToSSML(blocks);
    expect(ssml).toContain('&lt;tag&gt;');
    expect(ssml).toContain('&amp;');
    expect(ssml).toContain('&quot;');
  });

  it('includes title when provided', () => {
    const blocks: ContentBlock[] = [
      { type: 'text', content: 'Content here.' },
    ];
    const ssml = contentToSSML(blocks, { title: 'My Article' });
    expect(ssml).toContain('<emphasis level="strong">My Article</emphasis>');
  });

  it('respects custom section break timing', () => {
    const blocks: ContentBlock[] = [
      { type: 'heading', level: 2, content: 'Section' },
    ];
    const ssml = contentToSSML(blocks, { sectionBreakMs: 1200 });
    expect(ssml).toContain('<break time="1200ms"/>');
  });

  it('truncates long content respecting maxLength', () => {
    const blocks: ContentBlock[] = Array.from({ length: 100 }, (_, i) => ({
      type: 'text' as const,
      content: `Paragraph ${i} with lots of content to fill up the space. `.repeat(10),
    }));
    const ssml = contentToSSML(blocks, { maxLength: 500 });
    expect(ssml.length).toBeLessThan(600); // Some overhead for <speak> tags
  });
});
