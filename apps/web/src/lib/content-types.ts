import type { ContentType } from '@chiselgrid/types';
import { CONTENT_TYPES } from '@chiselgrid/types';

export interface ContentTypeMeta {
  label: string;
  description: string;
  // Tailwind classes for the type badge
  badge: string;
}

export const CONTENT_TYPE_META: Record<ContentType, ContentTypeMeta> = {
  article: {
    label: 'Article',
    description: 'Standard long-form article',
    badge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  },
  adr: {
    label: 'ADR',
    description: 'Architecture Decision Record',
    badge: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800',
  },
  diagram: {
    label: 'Diagram',
    description: 'System or flow diagram',
    badge: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800',
  },
  decision: {
    label: 'Decision',
    description: 'Recorded decision and rationale',
    badge: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  },
  runbook: {
    label: 'Runbook',
    description: 'Operational runbook',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  },
  template: {
    label: 'Template',
    description: 'Reusable content template',
    badge: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800',
  },
  post_mortem: {
    label: 'Post-mortem',
    description: 'Incident post-mortem',
    badge: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800',
  },
};

export function contentTypeMeta(value: string | null | undefined): ContentTypeMeta {
  if (value && (CONTENT_TYPES as readonly string[]).includes(value)) {
    return CONTENT_TYPE_META[value as ContentType];
  }
  return CONTENT_TYPE_META.article;
}

export const CONTENT_TYPE_OPTIONS: Array<{ value: ContentType; label: string }> =
  CONTENT_TYPES.map((value) => ({ value, label: CONTENT_TYPE_META[value].label }));
