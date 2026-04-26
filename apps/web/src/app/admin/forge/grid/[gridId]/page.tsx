'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { StudioBreadcrumb } from '@/components/studio/StudioBreadcrumb';

interface Grid {
  id: string;
  workspace_id: string;
  name: string;
  client_name: string;
  client_industry: string;
  project_type: string;
  description: string;
  status: string;
}

interface Workspace {
  id: string;
  name: string;
}

interface SessionItem {
  id: string;
  status: string;
  turn_count: number;
  created_at: string;
  updated_at: string;
  name?: string;
  blackboard?: {
    intent?: { criticality_tier?: number; domain?: string };
    analysis?: { overall_readiness_score?: number };
    assumptions?: { pending?: unknown[] };
    conflicts?: Array<{ blocking: boolean; resolved: boolean }>;
    requirements?: { status?: string };
    architecture?: { status?: string };
    diagrams?: { status?: string };
    estimates?: { status?: string };
  };
}

const TIER_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Life-Safety', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  2: { label: 'Regulated', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  3: { label: 'Business', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  4: { label: 'Standard', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
};

const STATUS_DOT: Record<string, string> = {
  active: 'bg-green-500',
  generating: 'bg-amber-500 animate-pulse',
  awaiting_human_gate: 'bg-red-500',
  completed: 'bg-gray-400',
};

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  generating: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  awaiting_human_gate: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  completed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const PROJECT_TYPE_COLORS: Record<string, string> = {
  greenfield: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  brownfield: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  migration: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  assessment: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

const AGENT_SECTIONS = [
  { key: 'intent', label: 'Intent' },
  { key: 'requirements', label: 'Requirements' },
  { key: 'architecture', label: 'Architecture' },
  { key: 'diagrams', label: 'Diagrams' },
  { key: 'analysis', label: 'Analysis' },
  { key: 'estimates', label: 'Estimates' },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function sectionComplete(bb: SessionItem['blackboard'], key: string): boolean {
  if (!bb) return false;
  if (key === 'intent') return !!bb.intent?.domain;
  if (key === 'analysis') return (bb.analysis?.overall_readiness_score ?? 0) > 0;
  const section = bb[key as keyof typeof bb] as { status?: string } | undefined;
  return section?.status === 'complete' || section?.status === 'validated' || section?.status === 'partial';
}

export default function GridDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gridId = params?.gridId as string;

  const [grid, setGrid] = useState<Grid | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingSession, setCreatingSession] = useState(false);

  useEffect(() => {
    if (!gridId) return;
    Promise.all([
      fetch(`/api/studio/grids/${gridId}/sessions`).then(r => r.json()),
      fetch('/api/studio/workspaces').then(r => r.json()),
      fetch(`/api/studio/grids?workspace_id=_all_&grid_id=${gridId}`).then(r => r.json()).catch(() => null),
    ])
      .then(([sessionsData, workspaces]) => {
        setSessions(Array.isArray(sessionsData) ? sessionsData : []);
        // Try to find grid info from sessions or from a dedicated call
        if (Array.isArray(sessionsData) && sessionsData.length > 0) {
          const wsId = sessionsData[0].workspace_id;
          const ws = (workspaces as Workspace[]).find(w => w.id === wsId);
          if (ws) setWorkspace(ws);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Fetch grid details
    fetch(`/api/studio/grids/${gridId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setGrid(data);
          // Also fetch workspace name
          fetch('/api/studio/workspaces').then(r => r.json()).then(workspaces => {
            const ws = (workspaces as Workspace[]).find(w => w.id === data.workspace_id);
            if (ws) setWorkspace(ws);
          }).catch(() => {});
        }
      })
      .catch(() => {});
  }, [gridId]);

  const handleNewSession = async () => {
    if (!grid) return;
    setCreatingSession(true);
    try {
      const res = await fetch('/api/studio/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grid_id: gridId, workspace_id: grid.workspace_id }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/admin/forge/session/${data.session_id}`);
      }
    } finally {
      setCreatingSession(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">Loading grid...</div>;
  }

  return (
    <div>
      <StudioBreadcrumb
        items={[
          { label: 'Forge', href: '/admin/forge' },
          ...(workspace ? [{ label: workspace.name, href: `/admin/forge/workspace/${workspace.id}` }] : []),
          { label: grid?.name ?? 'Grid' },
        ]}
      />

      <div className="mt-4 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{grid?.name ?? 'Grid'}</h1>
          <div className="mt-2 flex items-center gap-2">
            {grid?.client_name && (
              <span className="text-sm text-gray-500 dark:text-gray-400">{grid.client_name}</span>
            )}
            {grid?.client_industry && (
              <span className="rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-xs text-gray-600 dark:text-gray-400">
                {grid.client_industry}
              </span>
            )}
            {grid?.project_type && (
              <span className={`rounded px-1.5 py-0.5 text-xs font-medium capitalize ${PROJECT_TYPE_COLORS[grid.project_type] ?? ''}`}>
                {grid.project_type}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleNewSession}
          disabled={creatingSession}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: '#C96330' }}
        >
          {creatingSession ? 'Creating...' : 'New Session'}
        </button>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Sessions</h2>

      {sessions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No sessions yet.</p>
          <button
            onClick={handleNewSession}
            disabled={creatingSession}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: '#C96330' }}
          >
            Start your first session
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s, idx) => {
            const tier = s.blackboard?.intent?.criticality_tier ?? 4;
            const tierInfo = TIER_LABELS[tier] ?? TIER_LABELS[4];
            const readiness = s.blackboard?.analysis?.overall_readiness_score ?? 0;

            return (
              <div key={s.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {s.name ?? `Session ${idx + 1}`}
                    </h3>
                    <span className="flex items-center gap-1">
                      <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s.status] ?? STATUS_DOT['active']}`} />
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_BADGE[s.status] ?? STATUS_BADGE['active']}`}>
                        {s.status.replace(/_/g, ' ')}
                      </span>
                    </span>
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${tierInfo.color}`}>
                      Tier {tier} {tierInfo.label}
                    </span>
                  </div>
                  <Link
                    href={`/admin/forge/session/${s.id}`}
                    className="text-sm font-medium hover:underline"
                    style={{ color: '#C96330' }}
                  >
                    Resume Session &rarr;
                  </Link>
                </div>

                <div className="flex items-center gap-1 mb-2">
                  {AGENT_SECTIONS.map(sec => {
                    const done = sectionComplete(s.blackboard, sec.key);
                    return (
                      <span
                        key={sec.key}
                        title={sec.label}
                        className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                          done
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'border border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
                        }`}
                      >
                        {sec.label}
                      </span>
                    );
                  })}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-600">
                      <div
                        className="h-1.5 rounded-full bg-blue-500 transition-all"
                        style={{ width: `${readiness}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{readiness}%</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Updated {timeAgo(s.updated_at)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
