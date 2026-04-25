'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import {
  DiagramType,
  type GridEdge,
  type GridIR,
  type GridNode,
} from '@chiselgrid/grid-ir';
import { ReasoningTrail, type TrailEntry } from '@/components/workspace/ReasoningTrail';

const SketchCanvas = dynamic(() => import('./SketchCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
      Loading sketch canvas…
    </div>
  ),
});

interface ValidationFinding {
  severity: 'critical' | 'warning' | 'info';
  rule: string;
  message: string;
  fix: string;
}

interface ValidationSummary {
  score: number;
  valid: boolean;
  criticalCount: number;
  warningCount: number;
  findings: ValidationFinding[];
}

const DIAGRAM_TYPES = [
  { value: DiagramType.AWSArchitecture, label: 'AWS Architecture' },
  { value: DiagramType.C4Container, label: 'C4 Container' },
  { value: DiagramType.Flowchart, label: 'Flowchart' },
];

function scoreBadgeClass(score: number): string {
  if (score >= 90) return 'bg-green-600 text-white';
  if (score >= 70) return 'bg-amber-500 text-white';
  return 'bg-red-600 text-white';
}

export default function SketchModePage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [diagramType, setDiagramType] = useState<string>(DiagramType.AWSArchitecture);
  const [gridIR, setGridIR] = useState<GridIR | null>(null);
  const [diagramId, setDiagramId] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationSummary | null>(null);
  const [trail, setTrail] = useState<TrailEntry[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingStatus, setStreamingStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);

  const addTrail = useCallback((entry: Omit<TrailEntry, 'id' | 'timestamp'>) => {
    setTrail((prev) => [
      ...prev,
      { id: `t-${Date.now()}-${prev.length}`, timestamp: Date.now(), ...entry },
    ]);
  }, []);

  const handleGenerate = useCallback(async () => {
    const text = prompt.trim();
    if (!text || isStreaming) return;

    setIsStreaming(true);
    setError(null);
    setTrail([]);
    setGridIR({
      version: '1.0',
      diagram_type: diagramType as DiagramType,
      title: 'Sketching…',
      nodes: [],
      edges: [],
    });
    setValidation(null);
    setDiagramId(null);
    addTrail({ type: 'thinking', message: 'Sending prompt to Architecture Agent…' });

    try {
      const res = await fetch('/api/admin/grid/generate-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, diagramType, mode: 'sketch' }),
      });

      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${detail.slice(0, 200) || 'request failed'}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;

          let event:
            | { kind: 'meta'; data: { title?: string } }
            | { kind: 'node'; data: GridNode }
            | { kind: 'edge'; data: GridEdge }
            | { kind: 'done'; gridIR: GridIR; diagramId: string | null; validation?: ValidationSummary }
            | { kind: 'error'; error: string }
            | { kind: 'skills'; skills: string[] };
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }

          if (event.kind === 'skills') {
            addTrail({
              type: 'skill',
              message: `Loaded ${event.skills.length} skill${event.skills.length === 1 ? '' : 's'}`,
              detail: event.skills.join(', '),
            });
          } else if (event.kind === 'meta') {
            setStreamingStatus(`Sketching ${event.data.title ?? 'diagram'}…`);
            addTrail({ type: 'thinking', message: `Designing: ${event.data.title ?? 'diagram'}` });
          } else if (event.kind === 'node') {
            const newNode = event.data;
            setGridIR((prev) => {
              if (!prev) return prev;
              if (prev.nodes.some((n) => n.id === newNode.id)) return prev;
              return { ...prev, nodes: [...prev.nodes, newNode] };
            });
            setStreamingStatus(`Placing ${newNode.label}…`);
          } else if (event.kind === 'edge') {
            const newEdge = event.data;
            setGridIR((prev) => {
              if (!prev) return prev;
              if (prev.edges.some((e) => e.id === newEdge.id)) return prev;
              return { ...prev, edges: [...prev.edges, newEdge] };
            });
          } else if (event.kind === 'done') {
            setGridIR(event.gridIR);
            setDiagramId(event.diagramId);
            if (event.validation) {
              setValidation(event.validation);
              addTrail({
                type: 'validation',
                message: `Compliance score: ${event.validation.score}/100`,
                detail:
                  event.validation.findings.length > 0
                    ? event.validation.findings.map((f) => `• ${f.message}`).join('\n')
                    : undefined,
              });
            }
            addTrail({
              type: 'success',
              message: `Sketch complete: ${event.gridIR.nodes.length} nodes, ${event.gridIR.edges.length} edges`,
            });
          } else if (event.kind === 'error') {
            throw new Error(event.error);
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      addTrail({ type: 'error', message: `Generation failed: ${message.slice(0, 200)}` });
    } finally {
      setIsStreaming(false);
      setStreamingStatus('');
    }
  }, [prompt, diagramType, isStreaming, addTrail]);

  const handlePromote = useCallback(async () => {
    if (!diagramId || isPromoting) return;
    setIsPromoting(true);
    try {
      const res = await fetch(`/api/admin/grid/${diagramId}/promote`, { method: 'POST' });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${detail.slice(0, 200)}`);
      }
      const { id: newId } = (await res.json()) as { id: string };
      router.push(`/admin/grid/architecture?session=${newId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Promote failed: ${message}`);
      setIsPromoting(false);
    }
  }, [diagramId, isPromoting, router]);

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      <div className="flex flex-[3] min-w-0 flex-col overflow-hidden rounded-xl border-2 border-amber-400 bg-card">
        <div className="flex items-center justify-between gap-2 border-b border-border bg-amber-50/40 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-amber-700 font-semibold text-sm">✎ Sketch mode</span>
            <span className="text-xs text-muted-foreground">Hand-drawn whiteboard draft</span>
          </div>
          <div className="flex items-center gap-2">
            {validation && (
              <span
                className={`text-xs font-medium px-2 py-1 rounded ${scoreBadgeClass(validation.score)}`}
              >
                Score {validation.score}/100
              </span>
            )}
            {diagramId && (
              <button
                type="button"
                onClick={handlePromote}
                disabled={isPromoting}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isPromoting ? 'Promoting…' : 'Promote to Architecture Review →'}
              </button>
            )}
          </div>
        </div>
        <div className="relative flex-1 min-h-0">
          <SketchCanvas gridIR={gridIR} />
          {!gridIR && !isStreaming && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center text-muted-foreground">
              <div>
                <p className="text-base">Describe what you want to sketch</p>
                <p className="text-xs mt-1">A hand-drawn diagram will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-[2] min-w-0 flex-col gap-3 overflow-hidden">
        <div className="rounded-xl border border-border bg-card p-3">
          <label htmlFor="diagramType" className="block text-xs font-semibold text-muted-foreground mb-1">
            Diagram type
          </label>
          <select
            id="diagramType"
            value={diagramType}
            onChange={(e) => setDiagramType(e.target.value)}
            disabled={isStreaming}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          >
            {DIAGRAM_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-border bg-card p-3">
          <ReasoningTrail entries={trail} isActive={isStreaming} />
          {streamingStatus && (
            <p className="mt-2 text-xs text-muted-foreground">{streamingStatus}</p>
          )}
          {error && (
            <p className="mt-2 text-xs text-red-600 break-words">{error}</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Sketch a payment API with API Gateway, Lambda, and DynamoDB…"
            disabled={isStreaming}
            rows={3}
            className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isStreaming || !prompt.trim()}
              className="rounded-md bg-amber-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {isStreaming ? 'Sketching…' : 'Sketch'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
