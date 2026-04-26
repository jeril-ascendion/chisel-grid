'use client';
import { useEffect, useRef, useState } from 'react';

export interface TrailEntry {
  id: string;
  timestamp: number;
  type: 'thinking' | 'skill' | 'agent' | 'validation' | 'success' | 'warning' | 'error';
  message: string;
  detail?: string;
  durationMs?: number;
}

interface ReasoningTrailProps {
  entries: TrailEntry[];
  isActive: boolean;
  defaultExpanded?: boolean;
}

const ICONS: Record<TrailEntry['type'], string> = {
  thinking: '💭',
  skill: '🔧',
  agent: '🤖',
  validation: '✔️',
  success: '✅',
  warning: '⚠️',
  error: '❌',
};

const COLORS: Record<TrailEntry['type'], string> = {
  thinking: 'text-blue-400',
  skill: 'text-purple-400',
  agent: 'text-amber-400',
  validation: 'text-green-400',
  success: 'text-green-500',
  warning: 'text-amber-500',
  error: 'text-red-400',
};

export function ReasoningTrail({
  entries,
  isActive,
  defaultExpanded = false,
}: ReasoningTrailProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [entries.length, isActive]);

  useEffect(() => {
    if (isActive) setExpanded(true);
  }, [isActive]);

  if (entries.length === 0 && !isActive) return null;

  return (
    <div className="border border-border rounded-lg overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-3 py-2 bg-muted/50 hover:bg-muted transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {isActive && (
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"
              aria-hidden
            />
          )}
          <span className="font-medium text-muted-foreground">
            {isActive ? 'Working...' : `Reasoning trail (${entries.length} steps)`}
          </span>
        </div>
        <span className="text-muted-foreground" aria-hidden>
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div className="max-h-64 overflow-y-auto p-2 space-y-1 bg-background/50">
          {entries.map((entry) => (
            <div key={entry.id} className="group">
              <div className="flex items-start gap-2 px-1 py-0.5 rounded hover:bg-muted/30">
                <span className="mt-0.5 shrink-0" aria-hidden>
                  {ICONS[entry.type]}
                </span>
                <span className={`flex-1 min-w-0 ${COLORS[entry.type]}`}>
                  {entry.message}
                </span>
                {entry.durationMs !== undefined && entry.durationMs >= 500 && (
                  <span className="shrink-0 text-muted-foreground/50">
                    {entry.durationMs < 1000
                      ? `${entry.durationMs}ms`
                      : `${(entry.durationMs / 1000).toFixed(1)}s`}
                  </span>
                )}
                {entry.detail && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedEntries((s) => {
                        const n = new Set(s);
                        if (n.has(entry.id)) n.delete(entry.id);
                        else n.add(entry.id);
                        return n;
                      })
                    }
                    className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground"
                    aria-label={
                      expandedEntries.has(entry.id) ? 'Collapse detail' : 'Expand detail'
                    }
                  >
                    {expandedEntries.has(entry.id) ? '−' : '+'}
                  </button>
                )}
              </div>
              {entry.detail && expandedEntries.has(entry.id) && (
                <div className="ml-6 mt-0.5 px-2 py-1 rounded bg-muted/20 text-muted-foreground font-mono text-[10px] whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                  {entry.detail}
                </div>
              )}
            </div>
          ))}

          {isActive && (
            <div className="flex items-center gap-2 px-1 py-0.5 text-muted-foreground/60">
              <span aria-hidden>💭</span>
              <span className="animate-pulse">thinking...</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
