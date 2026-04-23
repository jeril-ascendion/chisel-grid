'use client';

import { useEffect, useRef } from 'react';
import { useSessionId } from '@/hooks/use-session-id';
import { useWorkspaceStore, type ChatMessage } from '@/stores/workspace-store';
import { upsertRecentSession } from '@/lib/recent-sessions';
import type { ContentBlock } from '@chiselgrid/types';

export function ChamberSessionSync() {
  const sessionId = useSessionId();
  const messages = useWorkspaceStore((s) => s.messages);
  const blocks = useWorkspaceStore((s) => s.blocks);
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!sessionId || restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = sessionStorage.getItem('chamber_session_' + sessionId);
      if (!raw) return;
      const data = JSON.parse(raw) as {
        messages?: ChatMessage[];
        blocks?: ContentBlock[];
      };
      const patch: Partial<{ messages: ChatMessage[]; blocks: ContentBlock[] }> = {};
      if (Array.isArray(data.messages)) patch.messages = data.messages;
      if (Array.isArray(data.blocks)) patch.blocks = data.blocks;
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
        JSON.stringify({ messages, blocks }),
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
  }, [sessionId, messages, blocks]);

  return null;
}
