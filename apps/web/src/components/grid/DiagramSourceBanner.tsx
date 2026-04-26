'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SourceSession {
  sessionId: string;
  title: string | null;
  updatedAt: string;
  createdBy: string | null;
}

interface Props {
  diagramId: string | null;
}

function formatTitle(s: SourceSession): string {
  if (s.title && s.title.trim()) return s.title;
  return `Session ${s.sessionId.slice(0, 8)}`;
}

export function DiagramSourceBanner({ diagramId }: Props) {
  const pathname = usePathname();
  const [source, setSource] = useState<SourceSession | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!diagramId) {
      setSource(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/grid/${diagramId}/source-session`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setSource(data?.source ?? null);
      })
      .catch(() => {
        if (!cancelled) setSource(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [diagramId]);

  if (!diagramId || loading || !source) return null;

  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
      <span>Created in session: </span>
      <Link
        href={`${pathname}?session=${source.sessionId}`}
        className="font-medium text-foreground hover:underline"
      >
        {formatTitle(source)}
      </Link>
    </div>
  );
}
