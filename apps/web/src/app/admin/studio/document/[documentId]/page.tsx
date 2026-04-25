'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface SectionRef {
  type: 'chamber' | 'grid';
  id: string;
  label?: string;
}

interface Section {
  title: string;
  description: string;
  source: 'chamber' | 'grid' | 'manual';
  placeholder: string;
  body: string;
  ref?: SectionRef | null;
}

interface DocumentResponse {
  id: string;
  title: string;
  category: string | null;
  sections: Section[];
  created_at: string;
  updated_at: string;
}

interface ChamberSession {
  id: string;
  kind: string;
  title?: string | null;
  updated_at: string;
}

interface GridDiagram {
  id: string;
  title: string;
  diagram_type: string;
  created_at: string;
}

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

function sourceBadge(source: Section['source']): { label: string; cls: string } {
  if (source === 'chamber') {
    return {
      label: 'From Chamber',
      cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    };
  }
  if (source === 'grid') {
    return {
      label: 'From Grid',
      cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    };
  }
  return {
    label: 'Write',
    cls: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  };
}

export default function StudioDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = (params?.documentId as string | undefined) ?? '';

  const [doc, setDoc] = useState<DocumentResponse | null>(null);
  const [title, setTitle] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [pickerSection, setPickerSection] = useState<{ index: number; type: 'chamber' | 'grid' } | null>(null);
  const [populatingIndex, setPopulatingIndex] = useState<number | null>(null);
  const [chamberSessions, setChamberSessions] = useState<ChamberSession[]>([]);
  const [gridDiagrams, setGridDiagrams] = useState<GridDiagram[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!documentId) return;
    fetch(`/api/admin/studio/documents/${documentId}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('not found')))
      .then((data: DocumentResponse) => {
        setDoc(data);
        setTitle(data.title);
        setSections(Array.isArray(data.sections) ? data.sections : []);
      })
      .catch(() => {});
  }, [documentId]);

  const persist = useCallback(async (override?: { title?: string; sections?: Section[] }) => {
    if (!documentId) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      payload['title'] = override?.title ?? title;
      payload['sections'] = override?.sections ?? sections;
      const res = await fetch(`/api/admin/studio/documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSavedAt(new Date());
        dirtyRef.current = false;
      }
    } finally {
      setSaving(false);
    }
  }, [documentId, title, sections]);

  const queueAutoSave = useCallback(() => {
    dirtyRef.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void persist();
    }, 800);
  }, [persist]);

  const updateSection = (index: number, patch: Partial<Section>) => {
    setSections(prev => {
      const next = [...prev];
      next[index] = { ...next[index]!, ...patch };
      return next;
    });
    queueAutoSave();
  };

  const openPicker = async (index: number, type: 'chamber' | 'grid') => {
    setPickerSection({ index, type });
    if (type === 'chamber') {
      try {
        const r = await fetch('/api/admin/sessions?kind=chamber&limit=50');
        if (r.ok) {
          const data: { sessions?: ChamberSession[] } = await r.json();
          setChamberSessions(data.sessions ?? []);
        }
      } catch { /* ignore */ }
    } else {
      try {
        const r = await fetch('/api/admin/grid/diagrams');
        if (r.ok) {
          const data: GridDiagram[] = await r.json();
          setGridDiagrams(Array.isArray(data) ? data : []);
        }
      } catch { /* ignore */ }
    }
  };

  const closePicker = () => setPickerSection(null);

  const handleSelectChamber = async (sessionId: string, label: string) => {
    if (!pickerSection) return;
    const idx = pickerSection.index;
    setPopulatingIndex(idx);
    closePicker();
    try {
      const section = sections[idx]!;
      const res = await fetch('/api/admin/studio/populate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'chamber',
          session_id: sessionId,
          section_title: section.title,
          section_description: section.description,
        }),
      });
      let body = section.placeholder;
      if (res.ok) {
        const data = await res.json() as { content?: string };
        if (data.content) body = data.content;
      }
      const nextSections = [...sections];
      nextSections[idx] = { ...section, body, ref: { type: 'chamber', id: sessionId, label } };
      setSections(nextSections);
      await persist({ sections: nextSections });
    } finally {
      setPopulatingIndex(null);
    }
  };

  const handleSelectGrid = async (diagramId: string, label: string) => {
    if (!pickerSection) return;
    const idx = pickerSection.index;
    setPopulatingIndex(idx);
    closePicker();
    try {
      const section = sections[idx]!;
      const embed = `![${label}](/api/admin/grid/${diagramId}/svg)\n\n_Diagram: ${label} (Grid id ${diagramId})_`;
      const nextSections = [...sections];
      nextSections[idx] = {
        ...section,
        body: embed,
        ref: { type: 'grid', id: diagramId, label },
      };
      setSections(nextSections);
      await persist({ sections: nextSections });
    } finally {
      setPopulatingIndex(null);
    }
  };

  const handleClearRef = async (idx: number) => {
    const section = sections[idx]!;
    const next = [...sections];
    next[idx] = { ...section, body: '', ref: null };
    setSections(next);
    await persist({ sections: next });
  };

  const handleExport = async (format: 'docx' | 'pdf' | 'md') => {
    if (!documentId) return;
    setExporting(format);
    try {
      const res = await fetch(`/api/admin/studio/documents/${documentId}/export?format=${format}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = (title || 'document').replace(/[^a-z0-9-_]+/gi, '_');
      a.download = `${safeTitle}.${format === 'md' ? 'md' : format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
      setExportOpen(false);
    }
  };

  const lastSavedLabel = useMemo(() => {
    if (saving) return 'Saving...';
    if (savedAt) return `Saved ${savedAt.toLocaleTimeString()}`;
    if (doc) return `Last edit ${new Date(doc.updated_at).toLocaleString()}`;
    return '';
  }, [saving, savedAt, doc]);

  if (!doc) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading document...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link href="/admin/studio" className="text-xs text-gray-500 hover:underline dark:text-gray-400">
            ← Studio
          </Link>
          <input
            type="text"
            value={title}
            onChange={e => { setTitle(e.target.value); queueAutoSave(); }}
            onBlur={() => { if (dirtyRef.current) void persist(); }}
            className="mt-1 w-full bg-transparent text-2xl font-bold text-gray-900 outline-none focus:ring-0 dark:text-white"
            aria-label="Document title"
          />
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            {doc.category && (
              <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                {CATEGORY_LABELS[doc.category] ?? doc.category}
              </span>
            )}
            <span>{lastSavedLabel}</span>
          </div>
        </div>
        <div className="relative shrink-0">
          <button
            onClick={() => setExportOpen(o => !o)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: '#C96330' }}
          >
            Export ▾
          </button>
          {exportOpen && (
            <div className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
              {(['docx', 'pdf', 'md'] as const).map(fmt => (
                <button
                  key={fmt}
                  onClick={() => handleExport(fmt)}
                  disabled={exporting !== null}
                  className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  {exporting === fmt ? 'Exporting...' : `Download .${fmt}`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {sections.map((section, idx) => {
          const badge = sourceBadge(section.source);
          const isPopulating = populatingIndex === idx;
          return (
            <section key={idx} className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">{section.title}</h2>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.cls}`}>
                  {badge.label}
                </span>
                {section.ref && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    Linked to {section.ref.type}: {section.ref.label ?? section.ref.id.slice(0, 8)}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-2">
                  {section.source === 'chamber' && (
                    <button
                      onClick={() => void openPicker(idx, 'chamber')}
                      disabled={isPopulating}
                      className="rounded border border-purple-300 px-2.5 py-1 text-xs font-medium text-purple-700 hover:bg-purple-50 disabled:opacity-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900/20"
                    >
                      Import from Chamber session
                    </button>
                  )}
                  {section.source === 'grid' && (
                    <button
                      onClick={() => void openPicker(idx, 'grid')}
                      disabled={isPopulating}
                      className="rounded border border-orange-300 px-2.5 py-1 text-xs font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-50 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/20"
                    >
                      Embed Grid diagram
                    </button>
                  )}
                  {section.ref && (
                    <button
                      onClick={() => void handleClearRef(idx)}
                      className="text-xs text-gray-500 hover:underline dark:text-gray-400"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              {section.description && (
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">{section.description}</p>
              )}
              <textarea
                value={section.body}
                onChange={e => updateSection(idx, { body: e.target.value })}
                onBlur={() => { if (dirtyRef.current) void persist(); }}
                placeholder={section.placeholder}
                rows={Math.max(4, Math.min(20, section.body.split('\n').length + 1))}
                className="w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
              {isPopulating && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Pulling content from {section.source}...</p>
              )}
              {section.ref?.type === 'grid' && (
                <div className="mt-3 rounded border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/admin/grid/${section.ref.id}/svg`}
                    alt={section.ref.label ?? 'Grid diagram'}
                    className="mx-auto max-h-96 w-auto"
                  />
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={() => router.push('/admin/studio')}
          className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Back to Studio
        </button>
        <button
          onClick={() => void persist()}
          disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: '#C96330' }}
        >
          {saving ? 'Saving...' : 'Save now'}
        </button>
      </div>

      {pickerSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex h-[70vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {pickerSection.type === 'chamber' ? 'Pick a Chamber session' : 'Pick a Grid diagram'}
              </h3>
              <button onClick={closePicker} aria-label="Close picker" className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {pickerSection.type === 'chamber' ? (
                chamberSessions.length === 0 ? (
                  <p className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">No recent Chamber sessions.</p>
                ) : (
                  <ul className="space-y-2">
                    {chamberSessions.map(s => {
                      const label = s.title?.trim() || `Chamber session ${s.id.slice(0, 8)}`;
                      return (
                        <li key={s.id}>
                          <button
                            onClick={() => void handleSelectChamber(s.id, label)}
                            className="flex w-full items-center justify-between rounded border border-gray-200 bg-white px-3 py-2 text-left text-sm hover:border-gray-300 dark:border-gray-700 dark:bg-gray-700/40 dark:hover:border-gray-500"
                          >
                            <span className="text-gray-900 dark:text-white">{label}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(s.updated_at).toLocaleDateString()}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )
              ) : (
                gridDiagrams.length === 0 ? (
                  <p className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">No diagrams found in Grid.</p>
                ) : (
                  <ul className="space-y-2">
                    {gridDiagrams.map(d => (
                      <li key={d.id}>
                        <button
                          onClick={() => void handleSelectGrid(d.id, d.title)}
                          className="flex w-full items-center justify-between rounded border border-gray-200 bg-white px-3 py-2 text-left text-sm hover:border-gray-300 dark:border-gray-700 dark:bg-gray-700/40 dark:hover:border-gray-500"
                        >
                          <span className="text-gray-900 dark:text-white">{d.title}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{d.diagram_type} · {new Date(d.created_at).toLocaleDateString()}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
