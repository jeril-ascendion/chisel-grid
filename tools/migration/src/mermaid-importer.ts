/**
 * T-09.3: Mermaid importer
 * Imports .mmd files as DiagramBlock content blocks with captions.
 */

import { basename } from 'node:path';
import type { ContentBlock } from '@chiselgrid/types';
import type { CrawledFile, ConvertedContent } from './types.js';
import { generateSlug } from './slug-mapper.js';

export function importMermaidFiles(files: CrawledFile[]): ConvertedContent[] {
  const mmdFiles = files.filter((f) => f.fileType === 'mmd');
  console.log(`Importing ${mmdFiles.length} Mermaid diagram files`);

  return mmdFiles.map((file) => {
    const name = basename(file.sourcePath, '.mmd');
    const caption = humanizeName(name);

    const blocks: ContentBlock[] = [
      {
        type: 'heading',
        level: 1,
        content: caption,
      },
      {
        type: 'diagram',
        diagramType: 'mermaid',
        content: file.body.trim(),
        caption,
      },
    ];

    return {
      sourcePath: file.sourcePath,
      slug: generateSlug(file.sourcePath),
      title: caption,
      description: `Mermaid diagram: ${caption}`,
      blocks,
      categorySlug: inferCategoryFromDiagram(file.body),
      tags: ['diagram', 'mermaid'],
      originalUrl: '/' + file.sourcePath.replace('.mmd', ''),
    };
  });
}

function humanizeName(name: string): string {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function inferCategoryFromDiagram(content: string): string | null {
  const lower = content.toLowerCase();
  if (lower.includes('deploy') || lower.includes('ci/cd') || lower.includes('pipeline')) {
    return 'devops-sre';
  }
  if (lower.includes('cloud') || lower.includes('aws') || lower.includes('lambda')) {
    return 'cloud-architecture';
  }
  if (lower.includes('data') || lower.includes('kafka') || lower.includes('etl')) {
    return 'data-engineering';
  }
  return null;
}
