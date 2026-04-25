'use client';

import { useEffect, useRef } from 'react';
import { useSessionId } from '@/hooks/use-session-id';
import { useWorkspaceStore, type ChatMessage } from '@/stores/workspace-store';
import { upsertRecentSession } from '@/lib/recent-sessions';
import type { ContentBlock } from '@chiselgrid/types';
import type { TrailEntry } from '@/components/workspace/ReasoningTrail';

export function ChamberSessionSync() {
  const sessionId = useSessionId();
  const messages = useWorkspaceStore((s) => s.messages);
  const blocks = useWorkspaceStore((s) => s.blocks);
  const reasoningTrails = useWorkspaceStore((s) => s.reasoningTrails);
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!sessionId || restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = sessionStorage.getItem('chamber_session_' + sessionId);
      if (!raw) return;
      const data = JSON.parse(raw) as {
        schemaVersion?: number;
        messages?: ChatMessage[];
        blocks?: ContentBlock[];
        reasoningTrails?: Record<string, TrailEntry[]>;
      };
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
    } catch {
      // ignore corrupt payloads
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !restoredRef.current) return;
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
      title: messages.find((m) => m.role === 'user')?.content?.slice(0, 40),
      lastPage: '/admin/chamber',
      updatedAt: Date.now(),
    });
  }, [sessionId, messages, blocks, reasoningTrails]);

  return null;
}
