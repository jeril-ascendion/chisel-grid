'use client';

import { useWorkspaceStore } from '@/stores/workspace-store';
import type { ContentBlock } from '@chiselgrid/types';

export function SEOPanel() {
  const seo = useWorkspaceStore((s) => s.seo);
  const blocks = useWorkspaceStore((s) => s.blocks);

  if (!seo && blocks.length === 0) return null;

  const stats = computeStats(blocks);

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-4 py-3">
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>{stats.wordCount} words</span>
        <span className="text-gray-300">|</span>
        <span>{stats.readTime} min read</span>
        <span className="text-gray-300">|</span>
        <span>{stats.codeBlocks} code blocks</span>
        <span className="text-gray-300">|</span>
        <span>{stats.diagrams} diagrams</span>
      </div>

      {seo && (
        <div className="mt-3 space-y-2">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">SEO Preview</h4>

          {/* Google preview */}
          <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
            <div className="text-blue-700 dark:text-blue-400 text-sm font-medium truncate">
              {seo.metaTitle}
            </div>
            <div className="text-green-700 dark:text-green-500 text-xs mt-0.5">
              ascendion.engineering/articles/...
            </div>
            <div className="text-gray-600 dark:text-gray-400 text-xs mt-1 line-clamp-2">
              {seo.metaDescription}
            </div>
          </div>

          {/* Keywords */}
          <div className="flex flex-wrap gap-1.5">
            {seo.keywords.map((kw, i) => (
              <span
                key={i}
                className="rounded-full bg-gray-200 dark:bg-gray-700 px-2 py-0.5 text-[10px] text-gray-600 dark:text-gray-400"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function computeStats(blocks: ContentBlock[]) {
  let wordCount = 0;
  let codeBlocks = 0;
  let diagrams = 0;

  for (const block of blocks) {
    switch (block.type) {
      case 'text':
      case 'callout':
        wordCount += block.content.split(/\s+/).filter(Boolean).length;
        break;
      case 'heading':
        wordCount += block.content.split(/\s+/).filter(Boolean).length;
        break;
      case 'code':
        codeBlocks++;
        break;
      case 'diagram':
        diagrams++;
        break;
    }
  }

  const readTime = Math.max(1, Math.round(wordCount / 200));

  return { wordCount, readTime, codeBlocks, diagrams };
}
