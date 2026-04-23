'use client';

import { useEffect, useState } from 'react';
import { useSessionId } from '@/hooks/use-session-id';
import { useWorkspaceStore, type ChatMessage } from '@/stores/workspace-store';
import { upsertRecentSession } from '@/lib/recent-sessions';
import type { ContentBlock } from '@chiselgrid/types';

export function ChamberSessionSync() {
  const sessionId = useSessionId();
  const messages = useWorkspaceStore((s) => s.messages);
  const blocks = useWorkspaceStore((s) => s.blocks);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (!sessionId || restored) return;
    try {
      const raw = sessionStorage.getItem('chamber_session_' + sessionId);
      if (raw) {
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
      }
    } catch {
      // ignore corrupt payloads
    }
    setRestored(true);
  }, [sessionId, restored]);

  useEffect(() => {
    if (!sessionId || !restored) return;
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
  }, [sessionId, restored, messages, blocks]);

  return null;
}
