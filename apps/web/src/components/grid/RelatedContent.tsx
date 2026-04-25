'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

const RELATION_TYPES = [
  'references',
  'illustrates',
  'created_from',
  'documents',
  'related_to',
  'contradicts',
] as const;

type EntityType = 'article' | 'diagram' | 'session' | 'decision' | 'template';
type RelationType = (typeof RELATION_TYPES)[number];

interface RelationRow {
  id: string;
  sourceId: string;
  sourceType: string;
  targetId: string;
  targetType: string;
  relationType: string;
  createdAt: string;
  title: string | null;
}

interface SearchResult {
  id: string;
  type: 'article' | 'diagram';
  title: string;
}

interface Props {
  ownerId: string;
  ownerType: EntityType;
}

function entityHref(type: string, id: string): string | null {
  if (type === 'article') return `/admin/content/${id}/edit`;
  if (type === 'diagram') return `/admin/grid/architecture?diagramId=${id}`;
  return null;
}

function displayTitle(row: RelationRow, side: 'source' | 'target'): string {
  if (row.title) return row.title;
  const id = side === 'source' ? row.sourceId : row.targetId;
  const type = side === 'source' ? row.sourceType : row.targetType;
  return `${type} ${id.slice(0, 8)}`;
}

export function RelatedContent({ ownerId, ownerType }: Props) {
  const [outbound, setOutbound] = useState<RelationRow[]>([]);
  const [inbound, setInbound] = useState<RelationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedRelation, setSelectedRelation] =
    useState<RelationType>('references');

  const refresh = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    try {
      const [outRes, inRes] = await Promise.all([
        fetch(
          `/api/admin/relations?source_id=${ownerId}&source_type=${ownerType}`,
          { cache: 'no-store' },
        ).then((r) => r.json()),
        fetch(
          `/api/admin/relations?target_id=${ownerId}&target_type=${ownerType}`,
          { cache: 'no-store' },
        ).then((r) => r.json()),
      ]);
      setOutbound(Array.isArray(outRes?.relations) ? outRes.relations : []);
      setInbound(Array.isArray(inRes?.relations) ? inRes.relations : []);
    } catch (err) {
      console.warn('[RelatedContent] load failed', err);
    } finally {
      setLoading(false);
    }
  }, [ownerId, ownerType]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!pickerOpen) return;
    const term = searchQ.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      fetch(`/api/admin/relations/search?q=${encodeURIComponent(term)}`)
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((data) => {
          if (!cancelled) setResults(Array.isArray(data?.results) ? data.results : []);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQ, pickerOpen]);

  const handleAdd = async (target: SearchResult) => {
    if (target.id === ownerId && target.type === ownerType) return;
    const res = await fetch('/api/admin/relations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceId: ownerId,
        sourceType: ownerType,
        targetId: target.id,
        targetType: target.type,
        relationType: selectedRelation,
      }),
    });
    if (res.ok) {
      setSearchQ('');
      setResults([]);
      setPickerOpen(false);
      void refresh();
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/relations/${id}`, { method: 'DELETE' });
    if (res.ok) void refresh();
  };

  return (
    <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Related content
        </h3>
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          {pickerOpen ? 'Cancel' : '+ Add link'}
        </button>
      </div>

      {pickerOpen && (
        <div className="mb-3 space-y-2 rounded border border-dashed border-gray-300 dark:border-gray-600 p-3">
          <div className="flex items-center gap-2">
            <select
              value={selectedRelation}
              onChange={(e) => setSelectedRelation(e.target.value as RelationType)}
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-xs"
            >
              {RELATION_TYPES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search articles or diagrams…"
              className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-xs"
            />
          </div>
          {results.length > 0 && (
            <ul className="max-h-48 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
              {results.map((r) => (
                <li key={`${r.type}:${r.id}`} className="py-1.5 flex items-center justify-between">
                  <div className="min-w-0 flex-1 pr-2">
                    <span className="rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] uppercase text-gray-600 dark:text-gray-400 mr-2">
                      {r.type}
                    </span>
                    <span className="text-xs text-gray-900 dark:text-white truncate">
                      {r.title}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAdd(r)}
                    className="rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-indigo-700"
                  >
                    Link
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <RelationList
        title="Links to"
        rows={outbound}
        side="target"
        loading={loading}
        onDelete={handleDelete}
      />
      <RelationList
        title="Linked from"
        rows={inbound}
        side="source"
        loading={loading}
        onDelete={handleDelete}
      />
    </section>
  );
}

function RelationList({
  title,
  rows,
  side,
  loading,
  onDelete,
}: {
  title: string;
  rows: RelationRow[];
  side: 'source' | 'target';
  loading: boolean;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="mt-3 first:mt-0">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
        {title}
      </h4>
      {loading ? (
        <p className="text-xs text-gray-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-gray-400">None</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((row) => {
            const id = side === 'source' ? row.sourceId : row.targetId;
            const type = side === 'source' ? row.sourceType : row.targetType;
            const href = entityHref(type, id);
            return (
              <li key={row.id} className="flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0 flex-1">
                  <span className="rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] uppercase text-gray-600 dark:text-gray-400 mr-2">
                    {type}
                  </span>
                  <span className="rounded bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 text-[10px] text-indigo-700 dark:text-indigo-300 mr-2">
                    {row.relationType}
                  </span>
                  {href ? (
                    <Link href={href} className="text-gray-900 dark:text-white hover:underline">
                      {displayTitle(row, side)}
                    </Link>
                  ) : (
                    <span className="text-gray-700 dark:text-gray-300">
                      {displayTitle(row, side)}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(row.id)}
                  className="text-gray-400 hover:text-red-600"
                  title="Remove link"
                  aria-label="Remove link"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
