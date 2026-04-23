'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Workspace {
  id: string;
  name: string;
  domain: string;
  jurisdiction_tags: string[];
  created_at: string;
}

interface Session {
  id: string;
  grid_id: string;
  workspace_id: string;
  status: string;
  turn_count: number;
  created_at: string;
  updated_at: string;
  blackboard?: {
    intent?: { criticality_tier?: number; domain?: string; type?: string };
  };
}

const TIER_COLORS: Record<number, string> = {
  1: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  2: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  3: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  4: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  generating: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  awaiting_human_gate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

export default function StudioPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch('/api/studio/workspaces').then(r => r.json()).then(setWorkspaces).catch(() => {});
    fetch('/api/studio/sessions').then(r => r.json()).then(setSessions).catch(() => {});
  }, []);

  const handleCreateWorkspace = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/studio/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, domain: newDomain }),
      });
      if (res.ok) {
        const ws = await res.json();
        setWorkspaces(prev => [...prev, ws]);
        setShowNewModal(false);
        setNewName('');
        setNewDomain('');
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Studio</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Combine Chamber content and Grid visuals into polished documents using templates
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: '#C96330' }}
        >
          New Engagement
        </button>
      </div>

      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Document Templates', desc: 'Apply professional templates to Chamber-generated content', icon: '▤' },
          { title: 'Visual Integration', desc: 'Embed Grid diagrams and charts into documents', icon: '◧' },
          { title: 'Export Formats', desc: 'Export to Word, PDF, Confluence, SharePoint', icon: '⇪' },
          { title: 'Brand Guidelines', desc: 'Enforce Ascendion brand standards automatically', icon: '✦' },
        ].map((item) => (
          <div key={item.title} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex flex-col gap-2">
            <div className="text-2xl">{item.icon}</div>
            <div>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{item.title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.desc}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 w-fit mt-auto">
              Coming Soon
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Workspaces */}
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Your Workspaces</h2>
          {workspaces.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No workspaces yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {workspaces.map(ws => (
                <div key={ws.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{ws.name}</h3>
                      {ws.domain && (
                        <span className="mt-1 inline-block rounded bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 text-xs text-blue-700 dark:text-blue-400">
                          {ws.domain}
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/admin/studio/workspace/${ws.id}`}
                      className="text-sm font-medium hover:underline"
                      style={{ color: '#C96330' }}
                    >
                      Open &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Sessions */}
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Recent Engagements</h2>
          {sessions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No sessions yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(s => {
                const tier = s.blackboard?.intent?.criticality_tier ?? 4;
                return (
                  <div key={s.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_COLORS[s.status] ?? STATUS_COLORS['active']}`}>
                          {s.status}
                        </span>
                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${TIER_COLORS[tier] ?? TIER_COLORS[4]}`}>
                          Tier {tier}
                        </span>
                      </div>
                      <Link
                        href={`/admin/studio/session/${s.id}`}
                        className="text-sm font-medium hover:underline"
                        style={{ color: '#C96330' }}
                      >
                        Resume &rarr;
                      </Link>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {s.turn_count} turn{s.turn_count !== 1 ? 's' : ''} &middot; {new Date(s.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* New Workspace Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Workspace</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="e.g. ACME Bank Digital"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Domain</label>
                <input
                  type="text"
                  value={newDomain}
                  onChange={e => setNewDomain(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="e.g. Banking, Healthcare"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowNewModal(false)}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkspace}
                disabled={creating || !newName.trim()}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: '#C96330' }}
              >
                {creating ? 'Creating...' : 'Create Workspace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
