'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { StudioBreadcrumb } from '@/components/studio/StudioBreadcrumb';

interface Workspace {
  id: string;
  name: string;
  domain: string;
  jurisdiction_tags: string[];
  created_at: string;
  updated_at: string;
}

interface Grid {
  id: string;
  workspace_id: string;
  name: string;
  client_name: string;
  client_industry: string;
  project_type: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  session_count?: number;
  readiness_score?: number;
}

const PROJECT_TYPE_COLORS: Record<string, string> = {
  greenfield: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  brownfield: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  migration: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  assessment: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  completed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  archived: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-500',
};

const INDUSTRIES = [
  'Banking', 'Healthcare', 'Retail', 'Aviation',
  'Fintech', 'Insurance', 'Government', 'Manufacturing', 'Other',
];

const PROJECT_TYPES = ['Greenfield', 'Brownfield', 'Migration', 'Assessment'];

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

export default function WorkspaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params?.workspaceId as string;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [grids, setGrids] = useState<Grid[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewGrid, setShowNewGrid] = useState(false);
  const [creating, setCreating] = useState(false);

  const [gridName, setGridName] = useState('');
  const [clientName, setClientName] = useState('');
  const [industry, setIndustry] = useState('');
  const [projectType, setProjectType] = useState('greenfield');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!workspaceId) return;
    Promise.all([
      fetch('/api/studio/workspaces').then(r => r.json()),
      fetch(`/api/studio/workspaces/${workspaceId}/grids`).then(r => r.json()),
    ])
      .then(([workspaces, gridsData]) => {
        const ws = (workspaces as Workspace[]).find(w => w.id === workspaceId);
        if (ws) setWorkspace(ws);
        setGrids(gridsData as Grid[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const handleCreateGrid = async () => {
    if (!gridName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/studio/grids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          name: gridName,
          client_name: clientName,
          client_industry: industry,
          project_type: projectType.toLowerCase(),
          description,
        }),
      });
      if (res.ok) {
        const grid = await res.json();
        router.push(`/admin/forge/grid/${grid.id}`);
      }
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">Loading workspace...</div>;
  }

  if (!workspace) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">Workspace not found.</div>;
  }

  return (
    <div>
      <StudioBreadcrumb
        items={[
          { label: 'Forge', href: '/admin/forge' },
          { label: workspace.name },
        ]}
      />

      <div className="mt-4 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{workspace.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            {workspace.domain && (
              <span className="inline-block rounded bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 text-xs text-blue-700 dark:text-blue-400">
                {workspace.domain}
              </span>
            )}
            {workspace.jurisdiction_tags?.map(tag => (
              <span key={tag} className="inline-block rounded bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={() => setShowNewGrid(true)}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: '#C96330' }}
        >
          New Grid
        </button>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Grids in this workspace</h2>

      {grids.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">No grids yet. Create one to start an architecture engagement.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {grids.map(grid => (
            <div key={grid.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <div className="mb-2">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{grid.name}</h3>
                {grid.client_name && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{grid.client_name}</p>
                )}
              </div>

              <div className="mb-3 flex flex-wrap gap-1.5">
                {grid.client_industry && (
                  <span className="rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-xs text-gray-600 dark:text-gray-400">
                    {grid.client_industry}
                  </span>
                )}
                <span className={`rounded px-1.5 py-0.5 text-xs font-medium capitalize ${PROJECT_TYPE_COLORS[grid.project_type] ?? PROJECT_TYPE_COLORS['greenfield']}`}>
                  {grid.project_type}
                </span>
                <span className={`rounded px-1.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[grid.status] ?? STATUS_COLORS['active']}`}>
                  {grid.status}
                </span>
              </div>

              <div className="mb-3 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                <p>{grid.session_count ?? 0} session{(grid.session_count ?? 0) !== 1 ? 's' : ''}</p>
                <p>Updated {timeAgo(grid.updated_at)}</p>
              </div>

              {(grid.readiness_score ?? 0) > 0 && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Readiness</span>
                    <span>{grid.readiness_score}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-600">
                    <div
                      className="h-1.5 rounded-full bg-blue-500"
                      style={{ width: `${grid.readiness_score}%` }}
                    />
                  </div>
                </div>
              )}

              <Link
                href={`/admin/forge/grid/${grid.id}`}
                className="text-sm font-medium hover:underline"
                style={{ color: '#C96330' }}
              >
                Open Grid &rarr;
              </Link>
            </div>
          ))}
        </div>
      )}

      {showNewGrid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Grid</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Engagement Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={gridName}
                  onChange={e => setGridName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="e.g. Digital Banking Platform"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Client Name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="e.g. ACME Bank"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Industry</label>
                <select
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  <option value="">Select industry...</option>
                  {INDUSTRIES.map(i => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project Type</label>
                <div className="mt-1 flex gap-3">
                  {PROJECT_TYPES.map(pt => (
                    <label key={pt} className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="radio"
                        name="projectType"
                        value={pt.toLowerCase()}
                        checked={projectType === pt.toLowerCase()}
                        onChange={e => setProjectType(e.target.value)}
                        className="text-blue-600"
                      />
                      {pt}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="Brief description of the engagement..."
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setShowNewGrid(false); setGridName(''); setClientName(''); setIndustry(''); setProjectType('greenfield'); setDescription(''); }}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGrid}
                disabled={creating || !gridName.trim()}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: '#C96330' }}
              >
                {creating ? 'Creating...' : 'Create Grid'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
