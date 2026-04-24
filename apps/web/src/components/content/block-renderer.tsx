'use client';

import { useEffect, useId, useRef, useState } from 'react';
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
    <Tag id={id} className="prose-chisel group scroll-mt-20">
      <a href={`#${id}`} className="no-underline hover:underline">
        {block.content}
      </a>
    </Tag>
  );
}

function CodeBlock({ block }: { block: Extract<ContentBlock, { type: 'code' }> }) {
  return (
    <div className="relative my-6 rounded-lg overflow-hidden border border-border bg-[#1e1e2e]">
      {block.filename && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-[#181825] text-xs text-[#cdd6f4]">
          <span className="font-mono">{block.filename}</span>
          <span className="text-[#6c7086]">{block.language}</span>
        </div>
      )}
      {!block.filename && block.language && (
        <div className="absolute top-2 right-3 text-xs text-[#6c7086] font-mono">
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
    info: { border: 'border-info', bg: 'bg-info/10', icon: 'i' },
    warning: { border: 'border-warning', bg: 'bg-warning/10', icon: '!' },
    danger: { border: 'border-destructive', bg: 'bg-destructive/10', icon: '!!' },
    success: { border: 'border-success', bg: 'bg-success/10', icon: '✓' },
  };

  const s = styles[block.variant] ?? styles.info;

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

function MermaidDiagram({ code }: { code: string }) {
  const reactId = useId();
  const domId = `mermaid-${reactId.replace(/:/g, '')}`;
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          fontFamily: 'IBM Plex Sans, sans-serif',
        });
        const { svg } = await mermaid.render(domId, code);
        if (!cancelled) setSvg(svg);
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, domId]);

  if (error) {
    return (
      <pre className="text-xs text-muted-foreground whitespace-pre-wrap p-4 bg-muted rounded">
        {code}
      </pre>
    );
  }

  if (!svg) {
    return (
      <div ref={ref} className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        Rendering diagram…
      </div>
    );
  }

  return (
    <div
      className="mermaid-rendered flex justify-center"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function DiagramBlock({ block }: { block: Extract<ContentBlock, { type: 'diagram' }> }) {
  const body = (() => {
    if (block.diagramType === 'svg') {
      return (
        <div
          className="flex justify-center [&>svg]:max-w-full [&>svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      );
    }
    if (block.diagramType === 'mermaid') {
      return <MermaidDiagram code={block.content} />;
    }
    return (
      <pre className="text-sm font-mono text-muted-foreground whitespace-pre-wrap">
        {block.content}
      </pre>
    );
  })();

  return (
    <figure className="my-6">
      <div className="rounded-lg border border-border bg-muted/40 p-4 overflow-x-auto">
        {body}
      </div>
      {block.caption && (
        <figcaption className="mt-2 text-center text-sm text-muted-foreground italic">
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
    <div className="prose-chisel">
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

/**
 * Markdown-lite: handles headings not — those come from HeadingBlock.
 * Supports paragraphs, bulleted/numbered lists, **bold**, *italic*, `code`, [links](url).
 * Lines starting with "- " or "* " become <ul><li>. Lines starting with "1. " become <ol><li>.
 */
function renderMarkdownLite(text: string): string {
  const escape = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const inline = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|\W)\*(?!\s)([^*]+?)\*(?!\w)/g, '$1<em>$2</em>')
      .replace(/`([^`]+?)`/g, '<code>$1</code>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-primary hover:underline">$1</a>');

  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let paraBuf: string[] = [];

  const flushPara = () => {
    if (paraBuf.length) {
      const joined = paraBuf.map((l) => inline(escape(l))).join(' ');
      out.push(`<p>${joined}</p>`);
      paraBuf = [];
    }
  };
  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line === '') {
      flushPara();
      closeList();
      continue;
    }
    const ulMatch = /^[-*]\s+(.+)$/.exec(line);
    const olMatch = /^\d+\.\s+(.+)$/.exec(line);

    if (ulMatch) {
      flushPara();
      if (listType !== 'ul') {
        closeList();
        out.push('<ul>');
        listType = 'ul';
      }
      out.push(`<li>${inline(escape(ulMatch[1]))}</li>`);
    } else if (olMatch) {
      flushPara();
      if (listType !== 'ol') {
        closeList();
        out.push('<ol>');
        listType = 'ol';
      }
      out.push(`<li>${inline(escape(olMatch[1]))}</li>`);
    } else {
      closeList();
      paraBuf.push(line);
    }
  }
  flushPara();
  closeList();

  return out.join('\n');
}
