'use client';

import { create } from 'zustand';
import type { ContentBlock } from '@chiselgrid/types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface AgentEvent {
  id: string;
  agentName: string;
  status: 'running' | 'completed' | 'failed';
  message: string;
  timestamp: number;
}

export interface SEOData {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
}

export interface WorkspaceState {
  // Chat
  messages: ChatMessage[];
  isGenerating: boolean;
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setGenerating: (v: boolean) => void;

  // Agent timeline
  agentEvents: AgentEvent[];
  addAgentEvent: (evt: Omit<AgentEvent, 'id' | 'timestamp'>) => void;
  clearAgentEvents: () => void;

  // Content blocks (editor)
  blocks: ContentBlock[];
  setBlocks: (blocks: ContentBlock[]) => void;
  updateBlock: (index: number, block: ContentBlock) => void;
  removeBlock: (index: number) => void;
  moveBlock: (from: number, to: number) => void;
  insertBlock: (index: number, block: ContentBlock) => void;

  // SEO
  seo: SEOData | null;
  setSeo: (seo: SEOData | null) => void;

  // Submit form
  title: string;
  slug: string;
  categoryId: string;
  tags: string[];
  setTitle: (v: string) => void;
  setSlug: (v: string) => void;
  setCategoryId: (v: string) => void;
  setTags: (v: string[]) => void;

  // Pipeline state
  pipelineStatus: 'idle' | 'writing' | 'reviewing' | 'revising' | 'seo' | 'human_review' | 'approved' | 'rejected' | 'published';
  setPipelineStatus: (v: WorkspaceState['pipelineStatus']) => void;
  contentId: string | null;
  setContentId: (v: string | null) => void;

  // Reset
  reset: () => void;
}

let messageCounter = 0;
let eventCounter = 0;

const initialState = {
  messages: [] as ChatMessage[],
  isGenerating: false,
  agentEvents: [] as AgentEvent[],
  blocks: [] as ContentBlock[],
  seo: null as SEOData | null,
  title: '',
  slug: '',
  categoryId: '',
  tags: [] as string[],
  pipelineStatus: 'idle' as const,
  contentId: null as string | null,
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  ...initialState,

  addMessage: (msg) =>
    set((s) => ({
      messages: [...s.messages, { ...msg, id: `msg-${++messageCounter}`, timestamp: Date.now() }],
    })),

  setGenerating: (v) => set({ isGenerating: v }),

  addAgentEvent: (evt) =>
    set((s) => ({
      agentEvents: [...s.agentEvents, { ...evt, id: `evt-${++eventCounter}`, timestamp: Date.now() }],
    })),

  clearAgentEvents: () => set({ agentEvents: [] }),

  setBlocks: (blocks) => set({ blocks }),

  updateBlock: (index, block) =>
    set((s) => ({
      blocks: s.blocks.map((b, i) => (i === index ? block : b)),
    })),

  removeBlock: (index) =>
    set((s) => ({
      blocks: s.blocks.filter((_, i) => i !== index),
    })),

  moveBlock: (from, to) =>
    set((s) => {
      const blocks = [...s.blocks];
      const [moved] = blocks.splice(from, 1);
      if (moved) blocks.splice(to, 0, moved);
      return { blocks };
    }),

  insertBlock: (index, block) =>
    set((s) => {
      const blocks = [...s.blocks];
      blocks.splice(index, 0, block);
      return { blocks };
    }),

  setSeo: (seo) => set({ seo }),

  setTitle: (title) =>
    set({
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    }),

  setSlug: (slug) => set({ slug }),
  setCategoryId: (categoryId) => set({ categoryId }),
  setTags: (tags) => set({ tags }),

  setPipelineStatus: (pipelineStatus) => set({ pipelineStatus }),
  setContentId: (contentId) => set({ contentId }),

  reset: () => {
    messageCounter = 0;
    eventCounter = 0;
    set(initialState);
  },
}));
