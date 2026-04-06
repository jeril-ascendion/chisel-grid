'use client';

import type { ContentBlock } from '@chiselgrid/types';
import { cn } from '@/lib/utils';

function TextBlock({ block }: { block: Extract<ContentBlock, { type: 'text' }> }) {
  return (
    <div
      className="prose-chisel"
      dangerouslySetInnerHTML={{ __html: renderMarkdownLite(block.content) }}
    />
  );
}

function HeadingBlock({ block }: { block: Extract<ContentBlock, { type: 'heading' }> }) {
  const id = block.content
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const Tag = `h${block.level}` as 'h1' | 'h2' | 'h3' | 'h4';

  return (
    <Tag id={id} className="scroll-mt-20 font-semibold">
      <a href={`#${id}`} className="no-underline hover:underline">
        {block.content}
      </a>
    </Tag>
  );
}

function CodeBlock({ block }: { block: Extract<ContentBlock, { type: 'code' }> }) {
  return (
    <div className="group relative my-6 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-[#1e1e2e]">
      {block.filename && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-[#181825] text-xs text-[#cdd6f4]">
          <span className="font-mono">{block.filename}</span>
          <span className="text-[#6c7086]">{block.language}</span>
        </div>
      )}
      {!block.filename && block.language && (
        <div className="absolute top-2 right-12 text-xs text-[#6c7086] font-mono">
          {block.language}
        </div>
      )}
      <CopyButton code={block.content} />
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
        <code className="font-mono text-[#cdd6f4]">{block.content}</code>
      </pre>
    </div>
  );
}

function CalloutBlock({ block }: { block: Extract<ContentBlock, { type: 'callout' }> }) {
  const styles: Record<string, { border: string; bg: string; icon: string }> = {
    info: { border: 'border-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'i' },
    warning: { border: 'border-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20', icon: '!' },
    danger: { border: 'border-red-400', bg: 'bg-red-50 dark:bg-red-900/20', icon: '!!' },
    success: { border: 'border-green-400', bg: 'bg-green-50 dark:bg-green-900/20', icon: '\u2713' },
  };

  const s = styles[block.variant] ?? styles['info']!;

  return (
    <aside
      className={cn(
        'my-6 rounded-lg border-l-4 px-4 py-3',
        s.border,
        s.bg,
      )}
      role="note"
    >
      <div className="flex gap-3">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold border border-current opacity-70">
          {s.icon}
        </span>
        <div className="text-sm leading-relaxed">{block.content}</div>
      </div>
    </aside>
  );
}

function DiagramBlock({ block }: { block: Extract<ContentBlock, { type: 'diagram' }> }) {
  return (
    <figure className="my-6">
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 overflow-x-auto">
        <pre className="text-sm font-mono text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
          {block.content}
        </pre>
      </div>
      {block.caption && (
        <figcaption className="mt-2 text-center text-sm text-gray-500 italic">
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
}

function CopyButton({ code }: { code: string }) {
  return (
    <button
      className="absolute top-2 right-2 p-1.5 rounded-md bg-[#313244] hover:bg-[#45475a] text-[#cdd6f4] transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
      aria-label="Copy code"
      onClick={() => {
        navigator.clipboard.writeText(code).catch(() => {});
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    </button>
  );
}

export function BlockRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'text':
            return <TextBlock key={i} block={block} />;
          case 'heading':
            return <HeadingBlock key={i} block={block} />;
          case 'code':
            return (
              <div key={i} className="group relative">
                <CodeBlock block={block} />
              </div>
            );
          case 'callout':
            return <CalloutBlock key={i} block={block} />;
          case 'diagram':
            return <DiagramBlock key={i} block={block} />;
          default:
            return null;
        }
      })}
    </div>
  );
}

function renderMarkdownLite(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-blue-600 hover:underline">$1</a>')
    .replace(/\n/g, '<br />');
}
