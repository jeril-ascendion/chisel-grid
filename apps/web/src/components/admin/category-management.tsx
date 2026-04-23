'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  description: string;
  parent_id: string | null;
  sort_order: number;
  level: number;
  level_label: string;
  full_path: string;
  article_count: number;
  children: CategoryNode[];
}

const LEVEL_META: Record<number, { short: string; full: string; color: string; addLabel: string }> = {
  1: { short: 'Cat', full: 'Category', color: '#C96330', addLabel: 'Add Sub-category' },
  2: { short: 'Sub', full: 'Sub-category', color: '#3B82F6', addLabel: 'Add Section' },
  3: { short: 'Sec', full: 'Section', color: '#10B981', addLabel: 'Add Sub-section' },
  4: { short: 'Sub-sec', full: 'Sub-section', color: '#8B5CF6', addLabel: 'Add Aspect' },
  5: { short: 'Aspect', full: 'Aspect', color: '#6B7280', addLabel: '' },
};

type RightPanelState =
  | { kind: 'empty' }
  | { kind: 'add'; parent: CategoryNode | null }
  | { kind: 'delete'; node: CategoryNode; childCount: number; articlesAffected: number };

function flatten(nodes: CategoryNode[], out: CategoryNode[] = []): CategoryNode[] {
  for (const n of nodes) {
    out.push(n);
    flatten(n.children, out);
  }
  return out;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function CategoryManagement() {
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [rightPanel, setRightPanel] = useState<RightPanelState>({ kind: 'empty' });

  const loadTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/categories', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      const data: CategoryNode[] = await res.json();
      setTree(Array.isArray(data) ? data : []);
    } catch (e) {
      setError((e as Error).message || 'Failed to load categories');
      setTree([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTree();
  }, [loadTree]);

  const flat = useMemo(() => flatten(tree), [tree]);

  const visibleIds = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.trim().toLowerCase();
    const ids = new Set<string>();
    for (const n of flat) {
      if (n.name.toLowerCase().includes(q) || n.full_path.toLowerCase().includes(q)) {
        ids.add(n.id);
        let parentId = n.parent_id;
        while (parentId) {
          ids.add(parentId);
          const p = flat.find((x) => x.id === parentId);
          parentId = p?.parent_id ?? null;
        }
      }
    }
    return ids;
  }, [search, flat]);

  const expandAll = () => setExpanded(new Set(flat.map((n) => n.id)));
  const collapseAll = () => setExpanded(new Set());

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEdit = (node: CategoryNode) => {
    setEditingId(node.id);
    setEditName(node.name);
    setEditDescription(node.description);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
  };

  const saveEdit = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: editDescription }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `${res.status}`);
      }
      await loadTree();
      cancelEdit();
    } catch (e) {
      setError((e as Error).message || 'Save failed');
    } finally {
      setSavingId(null);
    }
  };

  const openAddChild = (parent: CategoryNode | null) => {
    setRightPanel({ kind: 'add', parent });
    if (parent) {
      setExpanded((prev) => {
        const next = new Set(prev);
        next.add(parent.id);
        return next;
      });
    }
  };

  const submitAdd = async (name: string, slug: string, description: string, parentId: string | null) => {
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug, description, parentId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `${res.status}`);
    }
    await loadTree();
    setRightPanel({ kind: 'empty' });
  };

  const requestDelete = async (node: CategoryNode) => {
    if (node.children.length === 0) {
      if (!confirm(`Delete "${node.name}"?`)) return;
      try {
        const res = await fetch(`/api/admin/categories/${node.id}`, { method: 'DELETE' });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `${res.status}`);
        }
        await loadTree();
      } catch (e) {
        setError((e as Error).message || 'Delete failed');
      }
      return;
    }
    try {
      const res = await fetch(`/api/admin/categories/${node.id}`, { method: 'DELETE' });
      if (res.status === 409) {
        const body = await res.json();
        setRightPanel({
          kind: 'delete',
          node,
          childCount: body.childCount ?? 0,
          articlesAffected: body.articlesAffected ?? 0,
        });
      } else if (res.ok) {
        await loadTree();
      } else {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `${res.status}`);
      }
    } catch (e) {
      setError((e as Error).message || 'Delete failed');
    }
  };

  const confirmForceDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/categories/${id}?force=true`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `${res.status}`);
      }
      await loadTree();
      setRightPanel({ kind: 'empty' });
    } catch (e) {
      setError((e as Error).message || 'Delete failed');
    }
  };

  const panelOpen = rightPanel.kind !== 'empty';

  return (
    <div className="space-y-4">
      {/* Header row: search + expand controls + add-category button, all in one line */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <input
            type="text"
            placeholder="Search categories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 max-w-sm text-sm border border-gray-200 dark:border-gray-700 rounded-md px-3 py-1.5 bg-white dark:bg-gray-800"
          />
          <button
            onClick={expandAll}
            className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Expand all
          </button>
          <span className="text-gray-300">·</span>
          <button
            onClick={collapseAll}
            className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Collapse all
          </button>
        </div>
        <button
          onClick={() => openAddChild(null)}
          className="shrink-0 rounded-md bg-[#C96330] hover:bg-[#b3582b] text-white px-3 py-1.5 text-sm font-medium"
        >
          + Add Category
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-2 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Tree — full width of the page content area */}
      {loading ? (
        <div className="py-10 text-center text-sm text-gray-400">Loading categories…</div>
      ) : tree.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-16 text-center">
          <p className="text-sm text-gray-500 mb-4">No categories yet. Add your first category to get started.</p>
          <button
            onClick={() => openAddChild(null)}
            className="rounded-md bg-[#C96330] hover:bg-[#b3582b] text-white px-4 py-2 text-sm font-medium"
          >
            + Add Category
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <TreeList
            nodes={tree}
            expanded={expanded}
            visibleIds={visibleIds}
            editingId={editingId}
            editName={editName}
            editDescription={editDescription}
            savingId={savingId}
            onToggle={toggleExpand}
            onEditName={setEditName}
            onEditDescription={setEditDescription}
            onStartEdit={startEdit}
            onSaveEdit={saveEdit}
            onCancelEdit={cancelEdit}
            onAddChild={openAddChild}
            onDelete={requestDelete}
          />
        </div>
      )}

      {/* Slide-in panel — covers right 480px only when something is being added/deleted */}
      {panelOpen && (
        <div
          className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700 z-40 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="p-5">
            {rightPanel.kind === 'add' && (
              <AddCategoryForm
                parent={rightPanel.parent}
                onCancel={() => setRightPanel({ kind: 'empty' })}
                onSubmit={submitAdd}
              />
            )}
            {rightPanel.kind === 'delete' && (
              <DeleteConfirmForm
                node={rightPanel.node}
                childCount={rightPanel.childCount}
                articlesAffected={rightPanel.articlesAffected}
                onCancel={() => setRightPanel({ kind: 'empty' })}
                onConfirm={() => confirmForceDelete(rightPanel.node.id)}
              />
            )}
          </div>
        </div>
      )}
      {panelOpen && (
        <button
          aria-label="Close panel"
          className="fixed inset-0 bg-black/20 z-30"
          onClick={() => setRightPanel({ kind: 'empty' })}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tree rendering
// ---------------------------------------------------------------------------

interface TreeListProps {
  nodes: CategoryNode[];
  expanded: Set<string>;
  visibleIds: Set<string> | null;
  editingId: string | null;
  editName: string;
  editDescription: string;
  savingId: string | null;
  onToggle: (id: string) => void;
  onEditName: (v: string) => void;
  onEditDescription: (v: string) => void;
  onStartEdit: (n: CategoryNode) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onAddChild: (n: CategoryNode) => void;
  onDelete: (n: CategoryNode) => void;
}

function TreeList(props: TreeListProps) {
  return (
    <ul className="divide-y divide-gray-100 dark:divide-gray-700/50">
      {props.nodes.map((node) => (
        <TreeRow key={node.id} node={node} {...props} />
      ))}
    </ul>
  );
}

function TreeRow({ node, ...props }: TreeListProps & { node: CategoryNode }) {
  const {
    expanded,
    visibleIds,
    editingId,
    editName,
    editDescription,
    savingId,
    onToggle,
    onEditName,
    onEditDescription,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onAddChild,
    onDelete,
  } = props;

  const isExpanded = visibleIds ? true : expanded.has(node.id);
  const hasChildren = node.children.length > 0;
  const isEditing = editingId === node.id;
  const showRow = !visibleIds || visibleIds.has(node.id);
  const meta = LEVEL_META[node.level] ?? LEVEL_META[1]!;
  const canAddChild = node.level < 5;

  if (!showRow) return null;

  return (
    <li>
      <div className="group flex items-center gap-2 py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-700/40 min-w-0">
        {/* Indent spacer (20px per level past L1) */}
        <span
          className="shrink-0"
          style={{ width: `${(node.level - 1) * 20}px` }}
          aria-hidden
        />

        {/* Chevron */}
        <button
          onClick={() => hasChildren && onToggle(node.id)}
          className={cn(
            'w-4 h-4 flex items-center justify-center text-gray-400 shrink-0',
            !hasChildren && 'invisible',
          )}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 120ms' }}
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>

        {/* Colored level dot */}
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: meta.color }}
          title={meta.full}
          aria-hidden
        />

        {/* Name — flex-1 min-w-0 so it takes ALL remaining space */}
        {isEditing ? (
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <input
              value={editName}
              onChange={(e) => onEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onSaveEdit(node.id);
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  onCancelEdit();
                }
              }}
              autoFocus
              className="flex-1 min-w-0 text-sm border border-blue-400 rounded px-2 py-1 bg-white dark:bg-gray-900"
            />
            <input
              value={editDescription}
              onChange={(e) => onEditDescription(e.target.value)}
              placeholder="Description (optional)"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onSaveEdit(node.id);
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  onCancelEdit();
                }
              }}
              className="w-56 text-xs border border-gray-200 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-900 text-gray-600"
            />
          </div>
        ) : (
          <span
            className="flex-1 min-w-0 font-medium truncate text-sm text-gray-900 dark:text-white"
            title={`${node.name}  /${node.slug}`}
          >
            {node.name}
            <span className="ml-2 text-xs text-gray-400 font-mono font-normal">/{node.slug}</span>
          </span>
        )}

        {/* Compact level badge */}
        <span
          className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded px-1.5 py-0.5"
          title={meta.full}
        >
          {meta.short}
        </span>

        {/* Article count */}
        <span
          className="shrink-0 text-xs text-gray-500 tabular-nums"
          title={`${node.article_count} article${node.article_count === 1 ? '' : 's'}`}
        >
          {node.article_count}
          <span className="hidden md:inline ml-1 text-gray-400">articles</span>
        </span>

        {/* Actions — visible on row hover only */}
        <div
          className={cn(
            'shrink-0 flex items-center gap-1 transition-opacity',
            isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100',
          )}
        >
          {isEditing ? (
            <>
              <button
                onClick={() => onSaveEdit(node.id)}
                disabled={savingId === node.id}
                title="Save (Enter)"
                className="text-xs px-2 py-1 rounded text-green-700 hover:bg-green-50 dark:hover:bg-green-900/30 disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={onCancelEdit}
                title="Cancel (Esc)"
                className="text-xs px-2 py-1 rounded text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              {canAddChild && (
                <button
                  onClick={() => onAddChild(node)}
                  className="text-xs px-2 py-1 rounded text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                  title={meta.addLabel}
                >
                  + Add
                </button>
              )}
              <button
                onClick={() => onStartEdit(node)}
                className="text-xs px-2 py-1 rounded text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(node)}
                className="text-xs px-2 py-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {node.children.map((child) => (
            <TreeRow key={child.id} node={child} {...props} />
          ))}
        </ul>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Slide-in forms
// ---------------------------------------------------------------------------

function AddCategoryForm({
  parent,
  onCancel,
  onSubmit,
}: {
  parent: CategoryNode | null;
  onCancel: () => void;
  onSubmit: (name: string, slug: string, description: string, parentId: string | null) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugDirty, setSlugDirty] = useState(false);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const childLevel = (parent?.level ?? 0) + 1;
  const childMeta = LEVEL_META[childLevel] ?? LEVEL_META[1]!;
  const label = childMeta.full;

  const handleName = (v: string) => {
    setName(v);
    if (!slugDirty) setSlug(slugify(v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErr('Name is required');
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      await onSubmit(name.trim(), slug.trim() || slugify(name), description.trim(), parent?.id ?? null);
    } catch (e) {
      setErr((e as Error).message || 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Add {label.toLowerCase()}
            {parent && (
              <span className="font-normal text-gray-500"> under <span className="font-medium text-gray-700 dark:text-gray-200">{parent.name}</span></span>
            )}
          </h3>
          {parent && (
            <p className="mt-0.5 text-xs text-gray-400">{parent.full_path}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-lg leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <label className="block">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-200">Name</span>
        <input
          autoFocus
          value={name}
          onChange={(e) => handleName(e.target.value)}
          className="mt-1 w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-900"
          placeholder="e.g. Deployment Models"
        />
      </label>

      <label className="block">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-200">Slug</span>
        <input
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugDirty(true);
          }}
          className="mt-1 w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-900 font-mono"
          placeholder="deployment-models"
        />
      </label>

      <label className="block">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-200">Description <span className="text-gray-400">(optional)</span></span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-900"
        />
      </label>

      {err && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-2 text-xs text-red-700 dark:text-red-300">
          {err}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-3 py-1.5 text-sm rounded-md bg-[#C96330] text-white hover:bg-[#b3582b] disabled:opacity-60"
        >
          {submitting ? 'Adding…' : `Add ${label.toLowerCase()}`}
        </button>
      </div>
    </form>
  );
}

function DeleteConfirmForm({
  node,
  childCount,
  articlesAffected,
  onCancel,
  onConfirm,
}: {
  node: CategoryNode;
  childCount: number;
  articlesAffected: number;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const ready = confirmText === 'DELETE';
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-red-700 dark:text-red-300">
          Delete &ldquo;{node.name}&rdquo;?
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-lg leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <p className="text-sm text-red-700 dark:text-red-200">
        ⚠ This will also remove <strong>{childCount}</strong> sub-item{childCount === 1 ? '' : 's'} and
        unlink <strong>{articlesAffected}</strong> article{articlesAffected === 1 ? '' : 's'}.
        Type <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">DELETE</code> to confirm.
      </p>
      <input
        autoFocus
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder="DELETE"
        className="w-full text-sm border border-red-300 dark:border-red-700 rounded-md px-3 py-2 bg-white dark:bg-gray-900 font-mono"
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
        >
          Cancel
        </button>
        <button
          disabled={!ready || submitting}
          onClick={async () => {
            setSubmitting(true);
            try {
              await onConfirm();
            } finally {
              setSubmitting(false);
            }
          }}
          className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
        >
          {submitting ? 'Deleting…' : 'Delete Everything'}
        </button>
      </div>
    </div>
  );
}
