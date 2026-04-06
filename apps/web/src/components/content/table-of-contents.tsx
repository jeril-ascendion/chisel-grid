'use client';

import { useEffect, useState } from 'react';
import type { ContentBlock } from '@chiselgrid/types';
import { cn } from '@/lib/utils';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function TableOfContents({ blocks }: { blocks: ContentBlock[] }) {
  const [activeId, setActiveId] = useState<string>('');

  const headings: TocItem[] = blocks
    .filter((b): b is Extract<ContentBlock, { type: 'heading' }> => b.type === 'heading')
    .map((b) => ({
      id: b.content
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
      text: b.content,
      level: b.level,
    }));

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -80% 0px' },
    );

    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <nav aria-label="Table of contents" className="sticky top-20">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        On this page
      </h2>
      <ul className="space-y-1 text-sm border-l border-border">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={cn(
                'block py-1 border-l-2 -ml-px transition-colors',
                h.level === 2 ? 'pl-4' : 'pl-6',
                activeId === h.id
                  ? 'border-primary text-foreground font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
