/**
 * T-09.2: Content converter
 * Converts HTML/MD to ContentBlock[] JSON.
 * Uses simple parsing for MD (no Bedrock dependency for offline migration).
 * Bedrock AI enhancement can be added later for richer conversion.
 */

import type { ContentBlock } from '@chiselgrid/types';
import type { CrawledFile, ConvertedContent } from './types.js';
import { generateSlug } from './slug-mapper.js';

export interface ConverterOptions {
  /** Default category slug for uncategorized content */
  defaultCategory?: string;
  /** Rate limit: max concurrent conversions */
  concurrency?: number;
}

export async function convertFiles(
  files: CrawledFile[],
  options: ConverterOptions = {},
): Promise<ConvertedContent[]> {
  const { defaultCategory = 'engineering-culture' } = options;
  const results: ConvertedContent[] = [];

  for (const file of files) {
    try {
      const converted = convertFile(file, defaultCategory);
      results.push(converted);
    } catch (err) {
      console.error(`Failed to convert ${file.sourcePath}:`, err);
    }
  }

  console.log(`Converted ${results.length}/${files.length} files`);
  return results;
}

function convertFile(file: CrawledFile, defaultCategory: string): ConvertedContent {
  let blocks: ContentBlock[];
  let title: string;
  let description: string;

  if (file.fileType === 'md') {
    const result = convertMarkdown(file.body);
    blocks = result.blocks;
    title = (file.frontmatter['title'] as string) ?? result.title ?? 'Untitled';
    description =
      (file.frontmatter['description'] as string) ??
      (file.frontmatter['excerpt'] as string) ??
      extractDescription(blocks);
  } else if (file.fileType === 'html') {
    const result = convertHtml(file.body);
    blocks = result.blocks;
    title = result.title ?? 'Untitled';
    description = extractDescription(blocks);
  } else {
    // .mmd files handled by mermaid importer (T-09.3)
    blocks = [];
    title = file.sourcePath;
    description = '';
  }

  const tags = extractTags(file.frontmatter);
  const categorySlug =
    (file.frontmatter['category'] as string) ?? inferCategory(file.sourcePath) ?? defaultCategory;

  return {
    sourcePath: file.sourcePath,
    slug: generateSlug(file.sourcePath),
    title,
    description,
    blocks,
    categorySlug,
    tags,
    originalUrl: pathToUrl(file.sourcePath),
  };
}

function convertMarkdown(md: string): { blocks: ContentBlock[]; title: string | null } {
  const lines = md.split('\n');
  const blocks: ContentBlock[] = [];
  let title: string | null = null;
  let currentText: string[] = [];

  function flushText() {
    if (currentText.length > 0) {
      const text = currentText.join('\n').trim();
      if (text) {
        blocks.push({ type: 'text', content: text });
      }
      currentText = [];
    }
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;

    // Headings
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      flushText();
      const level = headingMatch[1]!.length as 1 | 2 | 3 | 4;
      const content = headingMatch[2]!.trim();
      if (level === 1 && !title) {
        title = content;
      }
      blocks.push({ type: 'heading', level, content });
      i++;
      continue;
    }

    // Code blocks
    if (line.startsWith('```')) {
      flushText();
      const lang = line.slice(3).trim() || 'text';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith('```')) {
        codeLines.push(lines[i]!);
        i++;
      }
      blocks.push({
        type: 'code',
        language: lang,
        content: codeLines.join('\n'),
      });
      i++;
      continue;
    }

    // Callouts (blockquotes with special markers)
    if (line.startsWith('> ')) {
      flushText();
      const calloutLines: string[] = [];
      while (i < lines.length && lines[i]!.startsWith('> ')) {
        calloutLines.push(lines[i]!.slice(2));
        i++;
      }
      const content = calloutLines.join('\n').trim();
      // Detect callout variant from markers
      let variant: 'info' | 'warning' | 'danger' | 'success' = 'info';
      if (content.startsWith('[!WARNING]') || content.toLowerCase().includes('warning:')) {
        variant = 'warning';
      } else if (content.startsWith('[!DANGER]') || content.toLowerCase().includes('danger:')) {
        variant = 'danger';
      } else if (content.startsWith('[!TIP]') || content.toLowerCase().includes('tip:')) {
        variant = 'success';
      }
      const cleanContent = content
        .replace(/^\[!(WARNING|DANGER|TIP|NOTE|INFO)\]\s*/i, '')
        .replace(/^(warning|danger|tip|note|info):\s*/i, '');
      blocks.push({ type: 'callout', variant, content: cleanContent });
      continue;
    }

    // Empty lines
    if (line.trim() === '') {
      flushText();
      i++;
      continue;
    }

    // Regular text
    currentText.push(line);
    i++;
  }

  flushText();
  return { blocks, title };
}

function convertHtml(html: string): { blocks: ContentBlock[]; title: string | null } {
  // Simple HTML to blocks conversion
  const blocks: ContentBlock[] = [];
  let title: string | null = null;

  // Extract title from <title> or <h1>
  const titleMatch = html.match(/<h1[^>]*>(.+?)<\/h1>/i) ?? html.match(/<title>(.+?)<\/title>/i);
  if (titleMatch) {
    title = stripHtml(titleMatch[1]!);
  }

  // Extract headings
  const headingRegex = /<h([2-4])[^>]*>(.+?)<\/h\1>/gi;
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    blocks.push({
      type: 'heading',
      level: parseInt(match[1]!) as 1 | 2 | 3 | 4,
      content: stripHtml(match[2]!),
    });
  }

  // Extract paragraphs
  const paraRegex = /<p[^>]*>(.+?)<\/p>/gis;
  while ((match = paraRegex.exec(html)) !== null) {
    const content = stripHtml(match[1]!).trim();
    if (content) {
      blocks.push({ type: 'text', content });
    }
  }

  // Extract code blocks
  const codeRegex = /<pre[^>]*><code[^>]*(?:class="[^"]*language-(\w+)")?[^>]*>(.+?)<\/code><\/pre>/gis;
  while ((match = codeRegex.exec(html)) !== null) {
    blocks.push({
      type: 'code',
      language: match[1] ?? 'text',
      content: decodeHtml(match[2]!),
    });
  }

  return { blocks, title };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

function decodeHtml(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractDescription(blocks: ContentBlock[]): string {
  const textBlock = blocks.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') return '';
  return textBlock.content.slice(0, 200).replace(/\n/g, ' ').trim();
}

function extractTags(frontmatter: Record<string, unknown>): string[] {
  const tags = frontmatter['tags'];
  if (Array.isArray(tags)) return tags.map(String);
  if (typeof tags === 'string') return tags.split(',').map((t) => t.trim());
  return [];
}

function inferCategory(sourcePath: string): string | null {
  const parts = sourcePath.toLowerCase().split('/');
  const categoryMap: Record<string, string> = {
    cloud: 'cloud-architecture',
    aws: 'cloud-architecture',
    azure: 'cloud-architecture',
    ai: 'ai-ml',
    ml: 'ai-ml',
    devops: 'devops-sre',
    sre: 'devops-sre',
    data: 'data-engineering',
    frontend: 'full-stack',
    react: 'full-stack',
    culture: 'engineering-culture',
  };
  for (const part of parts) {
    if (categoryMap[part]) return categoryMap[part]!;
  }
  return null;
}

function pathToUrl(sourcePath: string): string {
  return '/' + sourcePath.replace(/\.(html|md)$/, '').replace(/\/index$/, '');
}
