'use client';

import type { ContentBlock } from '@chiselgrid/types';

interface BlockEditorProps {
  blocks?: ContentBlock[];
  onChange?: (blocks: ContentBlock[]) => void;
  readOnly?: boolean;
}

/** Block editor stub — full implementation in EPIC-05 */
export function BlockEditor({ blocks = [] }: BlockEditorProps) {
  return (
    <div className="border rounded-lg p-4">
      <p className="text-sm text-gray-500">Block editor — {blocks.length} blocks</p>
    </div>
  );
}
