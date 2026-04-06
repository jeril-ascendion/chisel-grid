'use client';

import { useWorkspaceStore } from '@/stores/workspace-store';
import { BlockRenderer } from '@/components/content/block-renderer';
import { BlockEditor } from './block-editor';
import { useState } from 'react';

export function PreviewPanel() {
  const blocks = useWorkspaceStore((s) => s.blocks);
  const [editMode, setEditMode] = useState(false);

  if (blocks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 text-gray-300">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <p className="text-sm">Content preview will appear here</p>
          <p className="text-xs mt-1">Use the chat to generate an article</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-6">
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setEditMode(!editMode)}
          className="rounded-md border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {editMode ? 'Preview Mode' : 'Edit Mode'}
        </button>
      </div>
      {editMode ? (
        <BlockEditor />
      ) : (
        <article className="prose-chisel mx-auto max-w-3xl">
          <BlockRenderer blocks={blocks} />
        </article>
      )}
    </div>
  );
}
