'use client';

import { useEffect, useRef, useState } from 'react';
import { useSessionId } from '@/hooks/use-session-id';
import { useWorkspaceStore, type ChatMessage } from '@/stores/workspace-store';
import { upsertRecentSession } from '@/lib/recent-sessions';
import { fetchSession, saveSession, useSessionPolling } from '@/lib/session-client';
import type { ContentBlock } from '@chiselgrid/types';
import type { TrailEntry } from '@/components/workspace/ReasoningTrail';

interface ChamberState {
  messages?: ChatMessage[];
  blocks?: ContentBlock[];
  reasoningTrails?: Record<string, TrailEntry[]>;
}

export function ChamberSessionSync() {
  const sessionId = useSessionId({ restoreKind: 'chamber' });
  const messages = useWorkspaceStore((s) => s.messages);
  const blocks = useWorkspaceStore((s) => s.blocks);
  const reasoningTrails = useWorkspaceStore((s) => s.reasoningTrails);
  const [restored, setRestored] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localUpdatedAtRef = useRef<string | null>(null);

  const applyChamberState = (data: ChamberState) => {
    const patch: Partial<{
      messages: ChatMessage[];
      blocks: ContentBlock[];
      reasoningTrails: Record<string, TrailEntry[]>;
    }> = {};
    if (Array.isArray(data.messages)) patch.messages = data.messages;
    if (Array.isArray(data.blocks)) patch.blocks = data.blocks;
    if (data.reasoningTrails && typeof data.reasoningTrails === 'object') {
      patch.reasoningTrails = data.reasoningTrails;
    }
    if (Object.keys(patch).length > 0) {
      useWorkspaceStore.setState(patch);
    }
  };

  useEffect(() => {
    if (!sessionId || restored) return;
    let cancelled = false;
    void (async () => {
      const remote = await fetchSession(sessionId);
      if (cancelled) return;
      if (remote && remote.kind === 'chamber') {
        applyChamberState(remote.state as ChamberState);
        localUpdatedAtRef.current = remote.updatedAt;
      } else {
        try {
          const raw = sessionStorage.getItem('chamber_session_' + sessionId);
          if (raw) applyChamberState(JSON.parse(raw) as ChamberState);
        } catch {
          // ignore corrupt payloads
        }
      }
      if (!cancelled) setRestored(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, restored]);

  useSessionPolling(
    sessionId,
    localUpdatedAtRef,
    (remote) => {
      if (remote.kind !== 'chamber') return;
      applyChamberState(remote.state as ChamberState);
      localUpdatedAtRef.current = remote.updatedAt;
    },
    { enabled: restored },
  );

  useEffect(() => {
    if (!sessionId || !restored) return;
    const title =
      messages.find((m) => m.role === 'user')?.content?.slice(0, 40) || null;
    try {
      sessionStorage.setItem(
        'chamber_session_' + sessionId,
        JSON.stringify({
          schemaVersion: 2,
          messages,
          blocks,
          reasoningTrails,
        }),
      );
    } catch {
      // ignore quota errors
    }
    upsertRecentSession({
      id: sessionId,
      title: title ?? undefined,
      lastPage: '/admin/chamber',
      updatedAt: Date.now(),
    });

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveSession(sessionId, {
        kind: 'chamber',
        title,
        state: { messages, blocks, reasoningTrails },
      }).then((saved) => {
        if (saved?.updatedAt) {
          localUpdatedAtRef.current = saved.updatedAt;
        }
      });
    }, 1000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [sessionId, restored, messages, blocks, reasoningTrails]);

  return null;
}
