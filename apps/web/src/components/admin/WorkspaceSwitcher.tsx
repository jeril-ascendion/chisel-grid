'use client';

import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  clientName: string | null;
  projectName: string | null;
}

const STORAGE_KEY = 'cg.currentWorkspaceId';
const CHANGE_EVENT = 'chiselgrid:workspace-changed';

export function getCurrentWorkspaceId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function setCurrentWorkspaceId(id: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, id);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { id } }));
}

export function WorkspaceSwitcher({ collapsed }: { collapsed: boolean }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/workspaces');
      if (!res.ok) return;
      const data = (await res.json()) as { workspaces?: Workspace[] };
      const list = data.workspaces ?? [];
      setWorkspaces(list);
      const stored = getCurrentWorkspaceId();
      const valid = stored && list.some((w) => w.id === stored) ? stored : list[0]?.id ?? null;
      if (valid && valid !== stored) setCurrentWorkspaceId(valid);
      setCurrentId(valid);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const select = (id: string) => {
    setCurrentWorkspaceId(id);
    setCurrentId(id);
    setOpen(false);
  };

  const create = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { workspace: Workspace };
      setWorkspaces((prev) => [data.workspace, ...prev]);
      select(data.workspace.id);
      setShowNew(false);
      setNewName('');
    } finally {
      setCreating(false);
    }
  };

  const current = workspaces.find((w) => w.id === currentId);

  if (collapsed) {
    return (
      <div className="px-1.5 pt-3 pb-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg mx-auto text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label={`Workspace: ${current?.name ?? 'none'}`}
          title={current?.name ?? 'Workspace'}
        >
          <span className="text-xs font-semibold">
            {(current?.name ?? 'W').slice(0, 1).toUpperCase()}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="px-3 pt-3 pb-2">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
        Workspace
      </div>
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <span className="truncate text-gray-900 dark:text-white">
            {loaded ? current?.name ?? 'Select workspace' : 'Loading…'}
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gray-400">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {open && (
          <div
            role="listbox"
            className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg"
          >
            <div className="max-h-60 overflow-y-auto">
              {workspaces.map((w) => (
                <button
                  key={w.id}
                  role="option"
                  aria-selected={w.id === currentId}
                  onClick={() => select(w.id)}
                  className={cn(
                    'block w-full truncate px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700',
                    w.id === currentId && 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
                  )}
                >
                  {w.name}
                </button>
              ))}
              {workspaces.length === 0 && (
                <div className="px-3 py-2 text-xs text-gray-400">No workspaces yet</div>
              )}
            </div>
            <button
              onClick={() => { setOpen(false); setShowNew(true); }}
              className="block w-full border-t border-gray-200 dark:border-gray-700 px-3 py-2 text-left text-sm font-medium text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              + New workspace
            </button>
          </div>
        )}
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-800 p-5 shadow-xl">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">New workspace</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Client and project are auto-detected from session content — you only need a name.
            </p>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              placeholder="e.g. UDB Core Banking Migration"
              className="mt-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setShowNew(false); setNewName(''); }}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => void create()}
                disabled={creating || !newName.trim()}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function useCurrentWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);

  const refresh = useCallback(async () => {
    const id = getCurrentWorkspaceId();
    if (!id) {
      // Initial bootstrap: hit list endpoint to auto-create if needed.
      const res = await fetch('/api/admin/workspaces');
      if (!res.ok) return;
      const data = (await res.json()) as { workspaces?: Workspace[] };
      const w = data.workspaces?.[0] ?? null;
      if (w) {
        setCurrentWorkspaceId(w.id);
        setWorkspace(w);
      }
      return;
    }
    const res = await fetch(`/api/admin/workspaces/${id}`);
    if (res.ok) {
      const data = (await res.json()) as { workspace: Workspace };
      setWorkspace(data.workspace);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onChange = () => void refresh();
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, [refresh]);

  return workspace;
}
