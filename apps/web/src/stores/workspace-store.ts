/**
 * Workspace store stub — will be fully implemented in EPIC-05.
 */
import type { ContentBlock } from '@chiselgrid/types';

interface WorkspaceState {
  blocks: ContentBlock[];
  setBlocks: (blocks: ContentBlock[]) => void;
  title: string;
  setTitle: (title: string) => void;
}

export function useWorkspaceStore<T>(selector: (state: WorkspaceState) => T): T {
  const state: WorkspaceState = {
    blocks: [],
    setBlocks: () => {},
    title: '',
    setTitle: () => {},
  };
  return selector(state);
}
