'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

interface TemplateSection {
  title: string;
  description: string;
  source: 'chamber' | 'grid' | 'manual';
  placeholder: string;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  sections: TemplateSection[];
  is_public: boolean;
}

interface StudioDocument {
  id: string;
  title: string;
  category: string | null;
  template_id: string | null;
  created_at: string;
  updated_at: string;
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

const CATEGORY_LABELS: Record<string, string> = {
  solutions_design: 'Solutions Design',
  rfp_response: 'RFP Response',
  architecture_review: 'Architecture Review',
  incident_report: 'Incident Report',
  migration_runbook: 'Migration Runbook',
  api_design: 'API Design',
  feasibility_study: 'Feasibility Study',
  security_review: 'Security Review',
  data_architecture: 'Data Architecture',
  engineering_proposal: 'Engineering Proposal',
};

export default function StudioPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [documents, setDocuments] = useState<StudioDocument[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [creatingDocId, setCreatingDocId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch('/api/studio/workspaces').then(r => r.json()).then(setWorkspaces).catch(() => {});
    fetch('/api/studio/sessions').then(r => r.json()).then(setSessions).catch(() => {});
    fetch('/api/admin/studio/templates')
      .then(r => r.json())
      .then((data: { templates?: Template[] }) => setTemplates(data.templates ?? []))
      .catch(() => {});
    fetch('/api/admin/studio/documents')
      .then(r => r.json())
      .then((data: { documents?: StudioDocument[] }) => setDocuments(data.documents ?? []))
      .catch(() => {});
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

  const handlePickTemplate = async (template: Template) => {
    setCreatingDocId(template.id);
    try {
      const res = await fetch('/api/admin/studio/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: template.id }),
      });
      if (res.ok) {
        const data = await res.json() as { id: string };
        setShowTemplateModal(false);
        router.push(`/admin/studio/document/${data.id}`);
      }
    } finally {
      setCreatingDocId(null);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set<string>();
    templates.forEach(t => cats.add(t.category));
    return ['all', ...Array.from(cats).sort()];
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    if (activeCategory === 'all') return templates;
    return templates.filter(t => t.category === activeCategory);
  }, [templates, activeCategory]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Studio</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Combine Chamber content and Grid visuals into polished documents using templates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewModal(true)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            New Engagement
          </button>
          <button
            onClick={() => setShowTemplateModal(true)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: '#C96330' }}
          >
            New Document
          </button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Document Templates', desc: `${templates.length} templates ready to populate from Chamber and Grid`, icon: '▤' },
          { title: 'Visual Integration', desc: 'Embed Grid diagrams and charts into documents', icon: '◧' },
          { title: 'Export Formats', desc: 'Export to Word, PDF, or Markdown for Confluence', icon: '⇪' },
          { title: 'Brand Guidelines', desc: 'Enforce Ascendion brand standards automatically', icon: '✦' },
        ].map((item) => (
          <div key={item.title} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex flex-col gap-2">
            <div className="text-2xl">{item.icon}</div>
            <div>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{item.title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Recent Documents</h2>
          {documents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No documents yet.</p>
              <button
                onClick={() => setShowTemplateModal(true)}
                className="mt-3 text-sm font-medium hover:underline"
                style={{ color: '#C96330' }}
              >
                Create from a template &rarr;
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map(doc => (
                <Link
                  key={doc.id}
                  href={`/admin/studio/document/${doc.id}`}
                  className="block rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:border-gray-300 dark:hover:border-gray-600"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 dark:text-white">{doc.title}</h3>
                    {doc.category && (
                      <span className="rounded bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 text-xs text-blue-700 dark:text-blue-400">
                        {CATEGORY_LABELS[doc.category] ?? doc.category}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Updated {new Date(doc.updated_at).toLocaleString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Workspaces &amp; Engagements</h2>
          {workspaces.length === 0 && sessions.length === 0 ? (
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

      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex h-[85vh] w-full max-w-5xl flex-col rounded-lg bg-white dark:bg-gray-800 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pick a template</h2>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  Each template seeds a document with sections that can be populated from Chamber sessions and Grid diagrams.
                </p>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                aria-label="Close template picker"
                className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    activeCategory === cat
                      ? 'text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  style={activeCategory === cat ? { backgroundColor: '#C96330' } : undefined}
                >
                  {cat === 'all' ? 'All' : (CATEGORY_LABELS[cat] ?? cat)}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {filteredTemplates.length === 0 ? (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">No templates in this category.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredTemplates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handlePickTemplate(t)}
                      disabled={creatingDocId === t.id}
                      className="flex flex-col gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700/40 p-4 text-left transition hover:border-gray-300 dark:hover:border-gray-500 disabled:opacity-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">{t.name}</h3>
                        <span className="shrink-0 rounded bg-gray-100 dark:bg-gray-600/60 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-300">
                          {t.sections.length} sections
                        </span>
                      </div>
                      <span className="inline-flex w-fit rounded bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-xs text-blue-700 dark:text-blue-300">
                        {CATEGORY_LABELS[t.category] ?? t.category}
                      </span>
                      {t.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t.description}</p>
                      )}
                      {creatingDocId === t.id && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">Creating document...</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
