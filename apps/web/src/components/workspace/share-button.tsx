'use client';

import { useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

interface ShareButtonProps {
  className?: string;
}

export function ShareButton({ className }: ShareButtonProps) {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback(async () => {
    if (!sessionId || typeof window === 'undefined') return;
    const url = `${window.location.origin}/share/${sessionId}`;
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    }
  }, [sessionId]);

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={!sessionId}
      title="Copy share link — anyone with this link can view this session"
      aria-label="Copy share link"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
      {copied ? 'Link copied' : 'Share'}
    </button>
  );
}
