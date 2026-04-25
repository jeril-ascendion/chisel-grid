'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import type { GridIR } from '@chiselgrid/grid-ir';
import type { ContentBlock } from '@chiselgrid/types';
import type { PublicSession } from '@/lib/db/sessions';
import { BlockRenderer } from '@/components/content/block-renderer';

const DiagramCanvas = dynamic(
  () => import('@chiselgrid/grid-renderer').then((m) => m.DiagramCanvas),
  { ssr: false },
);

interface ChatLikeMessage {
  id?: string;
  role?: string;
  content?: string;
}

interface SharedSessionViewProps {
  session: PublicSession;
}

export function SharedSessionView({ session }: SharedSessionViewProps) {
  return (
    <div className="flex h-[calc(100vh-57px)] flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-semibold text-slate-900">
              {session.title || untitledFor(session.kind)}
            </h1>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              {session.kind}
            </span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
              Shared · read-only
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Updated {formatTimestamp(session.updatedAt)}
          </p>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        {session.kind === 'grid' ? (
          <GridReadOnly state={session.state} />
        ) : session.kind === 'chamber' ? (
          <ChamberReadOnly state={session.state} />
        ) : (
          <UnsupportedKind kind={session.kind} />
        )}
      </div>
    </div>
  );
}

function untitledFor(kind: PublicSession['kind']): string {
  if (kind === 'grid') return 'Untitled diagram';
  if (kind === 'chamber') return 'Untitled chamber session';
  return 'Untitled session';
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function GridReadOnly({ state }: { state: Record<string, unknown> }) {
  const gridIR = useMemo(() => extractGridIR(state), [state]);
  const messages = useMemo(() => extractMessages(state), [state]);

  return (
    <div className="flex h-full gap-4 p-4">
      <div className="flex flex-[3] min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-2 text-xs font-medium text-slate-600">
          {gridIR?.title || 'Diagram'}
        </div>
        <div className="relative flex-1 min-h-0">
          {gridIR ? (
            <DiagramCanvas gridIR={gridIR} />
          ) : (
            <EmptyState message="No diagram in this session yet." />
          )}
        </div>
      </div>
      <aside className="flex flex-[2] min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-2 text-xs font-medium text-slate-600">
          Chat history
        </div>
        <ChatHistory messages={messages} />
      </aside>
    </div>
  );
}

function ChamberReadOnly({ state }: { state: Record<string, unknown> }) {
  const messages = useMemo(() => extractMessages(state), [state]);
  const blocks = useMemo<ContentBlock[]>(() => {
    const raw = (state as { blocks?: unknown }).blocks;
    return Array.isArray(raw) ? (raw as ContentBlock[]) : [];
  }, [state]);

  return (
    <div className="flex h-full">
      <aside className="flex w-[420px] shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-2 text-xs font-medium text-slate-600">
          Chat history
        </div>
        <ChatHistory messages={messages} />
      </aside>
      <div className="flex-1 overflow-y-auto bg-white">
        {blocks.length === 0 ? (
          <EmptyState message="No content has been generated in this session." />
        ) : (
          <article className="prose-chisel mx-auto max-w-3xl px-8 py-6">
            <BlockRenderer blocks={blocks} />
          </article>
        )}
      </div>
    </div>
  );
}

function ChatHistory({ messages }: { messages: ChatLikeMessage[] }) {
  if (messages.length === 0) {
    return <EmptyState message="No chat messages." />;
  }
  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-3">
      {messages.map((m, i) => {
        const role = m.role === 'user' ? 'user' : 'ai';
        const content = typeof m.content === 'string' ? m.content : '';
        return (
          <div
            key={m.id ?? `msg-${i}`}
            className={
              role === 'user'
                ? 'ml-8 whitespace-pre-wrap break-words rounded-lg bg-blue-600 px-3 py-2 text-sm text-white'
                : 'mr-8 whitespace-pre-wrap break-words rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800'
            }
          >
            <div className="mb-1 text-[10px] uppercase tracking-wider opacity-60">
              {role === 'user' ? 'You' : 'AI'}
            </div>
            {content}
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6 text-sm text-slate-500">
      {message}
    </div>
  );
}

function UnsupportedKind({ kind }: { kind: string }) {
  return (
    <EmptyState message={`Read-only viewer for "${kind}" sessions is not available yet.`} />
  );
}

function extractGridIR(state: Record<string, unknown>): GridIR | null {
  const value = (state as { gridIR?: unknown }).gridIR;
  if (!value || typeof value !== 'object') return null;
  const ir = value as Partial<GridIR>;
  if (!Array.isArray(ir.nodes) || !Array.isArray(ir.edges) || !ir.diagram_type) {
    return null;
  }
  return value as GridIR;
}

function extractMessages(state: Record<string, unknown>): ChatLikeMessage[] {
  const raw = (state as { messages?: unknown }).messages;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (m): m is ChatLikeMessage => !!m && typeof m === 'object',
  );
}
