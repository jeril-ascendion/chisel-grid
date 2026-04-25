import type { ContentStatus } from '@chiselgrid/types';

export type BoardColumnId = 'draft' | 'in_review' | 'approved' | 'published' | 'archived';

export interface BoardColumn {
  id: BoardColumnId;
  label: string;
  accepts: readonly ContentStatus[];
}

export const BOARD_COLUMNS: readonly BoardColumn[] = [
  { id: 'draft', label: 'Draft', accepts: ['draft'] },
  { id: 'in_review', label: 'In Review', accepts: ['submitted', 'in_review'] },
  { id: 'approved', label: 'Approved', accepts: ['approved'] },
  { id: 'published', label: 'Published', accepts: ['published'] },
  { id: 'archived', label: 'Archived', accepts: ['archived', 'deprecated', 'rejected'] },
];

// When a card is dropped on a column, this is the canonical status written to the DB.
export const COLUMN_WRITES: Record<BoardColumnId, ContentStatus> = {
  draft: 'draft',
  in_review: 'in_review',
  approved: 'approved',
  published: 'published',
  archived: 'archived',
};

export function statusToColumn(status: string | null | undefined): BoardColumnId {
  for (const c of BOARD_COLUMNS) {
    if ((c.accepts as readonly string[]).includes(String(status))) return c.id;
  }
  return 'draft';
}
