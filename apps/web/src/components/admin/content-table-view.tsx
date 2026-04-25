'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CONTENT_TYPES } from '@chiselgrid/types';
import { ContentTypeBadge } from './content-type-badge';

interface ContentItem {
  id: string;
  title: string;
  status: string;
  contentType: string;
  author: string;
  category: string;
  updatedAt: string;
  publishedAt: string | null;
  timesReferenced?: number;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  in_review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  published: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-zinc-200 text-zinc-700',
  deprecated: 'bg-zinc-100 text-zinc-700',
  rejected: 'bg-red-100 text-red-700',
};

const STATUS_FILTERS = ['all', 'draft', 'in_review', 'approved', 'published', 'archived', 'rejected'];

interface ColumnDef {
  id: 'title' | 'type' | 'status' | 'author' | 'category' | 'updated' | 'actions';
  label: string;
  sortKey?: keyof ContentItem;
}

const COLUMNS: ColumnDef[] = [
  { id: 'title', label: 'Title', sortKey: 'title' },
  { id: 'type', label: 'Type', sortKey: 'contentType' },
  { id: 'status', label: 'Status', sortKey: 'status' },
  { id: 'author', label: 'Author', sortKey: 'author' },
  { id: 'category', label: 'Category', sortKey: 'category' },
  { id: 'updated', label: 'Updated', sortKey: 'updatedAt' },
  { id: 'actions', label: 'Actions' },
];

const COLUMN_STORAGE_KEY = 'cg.adminContentView.columns';

type SortDir = 'asc' | 'desc';

export function ContentTableView() {
  const router = useRouter();
  const params = useSearchParams();

  const status = params.get('status') ?? 'all';
  const type = params.get('type') ?? 'all';
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const sortBy = (params.get('sort') ?? 'updatedAt') as keyof ContentItem;
  const sortDir = (params.get('dir') ?? 'desc') as SortDir;

  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(COLUMN_STORAGE_KEY);
      if (raw) setHidden(new Set(JSON.parse(raw) as string[]));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (status !== 'all') qs.set('status', status);
    if (type !== 'all') qs.set('contentType', type);
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    fetch(`/api/admin/content?${qs.toString()}`)
      .then((r) => r.json())
      .then((data) => setItems((data.items ?? []) as ContentItem[]))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [status, type, from, to]);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === '' || value === 'all') next.delete(key);
    else next.set(key, value);
    router.replace(`?${next.toString()}`);
  };

  const toggleColumn = (id: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(Array.from(next)));
      }
      return next;
    });
  };

  const visibleColumns = COLUMNS.filter((c) => !hidden.has(c.id));

  const onSort = (key?: keyof ContentItem) => {
    if (!key) return;
    if (sortBy === key) {
      setParam('dir', sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setParam('sort', String(key));
      setParam('dir', 'asc');
    }
  };

  const sorted = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      if (sortBy === 'updatedAt') {
        const da = Date.parse(a.updatedAt) || 0;
        const db = Date.parse(b.updatedAt) || 0;
        return sortDir === 'asc' ? da - db : db - da;
      }
      const va = String(a[sortBy] ?? '');
      const vb = String(b[sortBy] ?? '');
      const cmp = va.localeCompare(vb);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [items, sortBy, sortDir]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setParam('status', s)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                status === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200',
              )}
            >
              {s === 'all' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <select
            value={type}
            onChange={(e) => setParam('type', e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-xs"
            aria-label="Filter by type"
          >
            <option value="all">All types</option>
            {CONTENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => setParam('from', e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-xs"
            aria-label="From date"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setParam('to', e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-xs"
            aria-label="To date"
          />
          <details className="relative">
            <summary className="cursor-pointer rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs select-none">
              Columns
            </summary>
            <div className="absolute right-0 mt-1 z-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-2 min-w-[160px]">
              {COLUMNS.map((c) => (
                <label key={c.id} className="flex items-center gap-2 px-2 py-1 text-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded">
                  <input
                    type="checkbox"
                    checked={!hidden.has(c.id)}
                    onChange={() => toggleColumn(c.id)}
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
          </details>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              {visibleColumns.map((c) => (
                <th
                  key={c.id}
                  className={cn(
                    'px-4 py-3 text-left font-medium text-gray-500',
                    c.id === 'actions' && 'text-right',
                    c.sortKey && 'cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200',
                  )}
                  onClick={() => c.sortKey && onSort(c.sortKey)}
                  aria-sort={c.sortKey === sortBy ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  {c.label}
                  {c.sortKey === sortBy ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={visibleColumns.length} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            )}
            {!loading && sorted.length === 0 && (
              <tr><td colSpan={visibleColumns.length} className="px-4 py-8 text-center text-gray-400">No articles found</td></tr>
            )}
            {sorted.map((item) => (
              <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                {visibleColumns.map((c) => {
                  switch (c.id) {
                    case 'title':
                      return <td key={c.id} className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.title}</td>;
                    case 'type':
                      return <td key={c.id} className="px-4 py-3"><ContentTypeBadge contentType={item.contentType} /></td>;
                    case 'status':
                      return (
                        <td key={c.id} className="px-4 py-3">
                          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_COLORS[item.status] ?? STATUS_COLORS.draft)}>
                            {item.status.replace('_', ' ')}
                          </span>
                        </td>
                      );
                    case 'author':
                      return <td key={c.id} className="px-4 py-3 text-gray-500 text-xs">{item.author}</td>;
                    case 'category':
                      return <td key={c.id} className="px-4 py-3 text-gray-500 text-xs">{item.category || '—'}</td>;
                    case 'updated':
                      return <td key={c.id} className="px-4 py-3 text-gray-500 text-xs">{new Date(item.updatedAt).toLocaleDateString()}</td>;
                    case 'actions':
                      return (
                        <td key={c.id} className="px-4 py-3 text-right">
                          <Link
                            href={`/admin/content/${item.id}/edit`}
                            className="text-blue-600 hover:underline text-xs font-medium"
                          >
                            {item.status === 'rejected' ? 'Edit & Resubmit' : 'Edit'}
                          </Link>
                        </td>
                      );
                  }
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-500" aria-live="polite">
        {!loading && `${sorted.length} item${sorted.length === 1 ? '' : 's'}`}
      </div>
    </div>
  );
}
