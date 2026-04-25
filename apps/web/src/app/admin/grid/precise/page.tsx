'use client';

import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import {
  DiagramType,
  gridIRToDrawio,
  gridIRToExcalidrawFile,
  type GridEdge,
  type GridIR,
  type GridNode,
} from '@chiselgrid/grid-ir';
import { ReasoningTrail, type TrailEntry } from '@/components/workspace/ReasoningTrail';
import { useSessionId } from '@/hooks/use-session-id';
import { DiagramSourceBanner } from '@/components/grid/DiagramSourceBanner';
import { RelatedContent } from '@/components/grid/RelatedContent';

const DiagramCanvas = dynamic(
  () => import('@chiselgrid/grid-renderer').then((m) => m.DiagramCanvas),
  { ssr: false },
);

const DiagramToolbar = dynamic(
  () => import('@chiselgrid/grid-renderer').then((m) => m.DiagramToolbar),
  { ssr: false },
);

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

const DELIVERY_THRESHOLD = 80;

function fileBaseName(gridIR: GridIR | null): string {
  return (gridIR?.title || 'diagram').toLowerCase().replace(/\s+/g, '-');
}

function downloadBlob(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function PreciseModePage() {
  const sessionId = useSessionId();
  const [prompt, setPrompt] = useState('');
  const [diagramType, setDiagramType] = useState<string>(DiagramType.AWSArchitecture);
  const [gridIR, setGridIR] = useState<GridIR | null>(null);
  const [diagramId, setDiagramId] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationSummary | null>(null);
  const [trail, setTrail] = useState<TrailEntry[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingStatus, setStreamingStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [approved, setApproved] = useState(false);

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
    setApproved(false);
    setTrail([]);
    setGridIR({
      version: '1.0',
      diagram_type: diagramType as DiagramType,
      title: 'Generating…',
      nodes: [],
      edges: [],
    });
    setValidation(null);
    setDiagramId(null);
    addTrail({ type: 'thinking', message: 'Sending prompt to Architecture Agent (precise mode)…' });

    try {
      const res = await fetch('/api/admin/grid/generate-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          diagramType,
          mode: 'precise',
          sessionId: sessionId || undefined,
        }),
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
            setStreamingStatus(`Designing ${event.data.title ?? 'diagram'}…`);
          } else if (event.kind === 'node') {
            const newNode = event.data;
            setGridIR((prev) => {
              if (!prev) return prev;
              if (prev.nodes.some((n) => n.id === newNode.id)) return prev;
              const idx = prev.nodes.length;
              const streamingPosition = { x: (idx % 5) * 220, y: Math.floor(idx / 5) * 160 };
              return { ...prev, nodes: [...prev.nodes, { ...newNode, position: streamingPosition }] };
            });
          } else if (event.kind === 'edge') {
            const newEdge = event.data;
            setGridIR((prev) => {
              if (!prev) return prev;
              if (prev.edges.some((e) => e.id === newEdge.id)) return prev;
              return { ...prev, edges: [...prev.edges, newEdge] };
            });
          } else if (event.kind === 'done') {
            const finalIR = {
              ...event.gridIR,
              nodes: event.gridIR.nodes.map(({ position: _drop, ...rest }) => rest),
            };
            setGridIR(finalIR);
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
              message: `Generated ${event.gridIR.nodes.length} nodes, ${event.gridIR.edges.length} edges`,
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

  const handleExportPNG = useCallback(async () => {
    if (!gridIR) {
      alert('Generate a diagram first.');
      return;
    }
    const container = document.querySelector('.react-flow') as HTMLElement | null;
    if (!container) {
      alert('Diagram canvas not ready.');
      return;
    }
    try {
      const { toPng } = await import('html-to-image');
      await new Promise((r) => setTimeout(r, 100));
      const dataUrl = await toPng(container, {
        backgroundColor: '#ffffff',
        width: container.scrollWidth,
        height: container.scrollHeight,
        filter: (node) => {
          if (!(node instanceof Element)) return true;
          return !(
            node.classList?.contains('react-flow__minimap') ||
            node.classList?.contains('react-flow__controls')
          );
        },
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${fileBaseName(gridIR)}.png`;
      a.click();
    } catch (err) {
      alert('PNG export failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, [gridIR]);

  const handleExportDrawio = useCallback(() => {
    if (!gridIR) {
      alert('Generate a diagram first.');
      return;
    }
    downloadBlob(gridIRToDrawio(gridIR), `${fileBaseName(gridIR)}.drawio`, 'application/xml');
  }, [gridIR]);

  const handleExportExcalidraw = useCallback(() => {
    if (!gridIR) return;
    downloadBlob(
      gridIRToExcalidrawFile(gridIR),
      `${fileBaseName(gridIR)}.excalidraw`,
      'application/json',
    );
  }, [gridIR]);

  const handleOpenInDrawio = useCallback(() => {
    if (!gridIR) {
      alert('Generate a diagram first.');
      return;
    }
    const xml = gridIRToDrawio(gridIR);
    // app.diagrams.net loads XML from the URL fragment (the #R<encoded> form).
    // Fragments are not sent to the server, so this stays client-side.
    const url = `https://app.diagrams.net/?lightbox=0&edit=_blank&layers=1&nav=1#R${encodeURIComponent(xml)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [gridIR]);

  const handleApproveDelivery = useCallback(async () => {
    if (!diagramId || isApproving) return;
    setIsApproving(true);
    try {
      const res = await fetch(`/api/admin/grid/${diagramId}/approve-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${detail.slice(0, 200)}`);
      }
      setApproved(true);
      addTrail({ type: 'success', message: 'Approved for delivery — added to training corpus' });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Approve failed: ${message}`);
    } finally {
      setIsApproving(false);
    }
  }, [diagramId, isApproving, addTrail]);

  const showDeliveryWarning = validation !== null && validation.score < DELIVERY_THRESHOLD;

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      <div className="flex flex-[3] min-w-0 flex-col overflow-hidden rounded-xl border-2 border-blue-400 bg-card">
        <div className="flex items-center justify-between gap-2 border-b border-border bg-blue-50/40 px-3 py-2">
          <span className="text-blue-700 font-semibold text-sm">◧ Precise mode</span>
          <div className="flex items-center gap-2">
            {validation && (
              <span
                className={`text-xs font-medium px-2 py-1 rounded ${
                  validation.score >= 90
                    ? 'bg-green-600 text-white'
                    : validation.score >= 80
                      ? 'bg-amber-500 text-white'
                      : 'bg-red-600 text-white'
                }`}
              >
                Score {validation.score}/100
              </span>
            )}
            {diagramId && !approved && (
              <button
                type="button"
                onClick={handleApproveDelivery}
                disabled={isApproving}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isApproving ? 'Approving…' : 'Approve for Delivery'}
              </button>
            )}
            {approved && (
              <span className="rounded-md bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-800">
                ✓ Approved
              </span>
            )}
          </div>
        </div>

        {showDeliveryWarning && (
          <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <strong>Score &lt; {DELIVERY_THRESHOLD}.</strong> Not recommended for client delivery.
            Refine the architecture before approving.
          </div>
        )}

        {diagramId && (
          <div className="border-b border-border bg-blue-50/20 px-3 py-2 space-y-2">
            <DiagramSourceBanner diagramId={diagramId} />
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Linked articles & related
              </summary>
              <div className="mt-2">
                <RelatedContent ownerId={diagramId} ownerType="diagram" />
              </div>
            </details>
          </div>
        )}

        <div className="border-b border-border">
          <DiagramToolbar
            diagramType={diagramType}
            onDiagramTypeChange={setDiagramType}
            onExportPNG={handleExportPNG}
            onExportDrawio={handleExportDrawio}
            onExportExcalidraw={handleExportExcalidraw}
          />
        </div>

        <div className="relative flex-1 min-h-0">
          {gridIR ? (
            <DiagramCanvas gridIR={gridIR} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-center text-muted-foreground p-8">
              <div>
                <p className="text-base">Generate a precise, enterprise-ready diagram</p>
                <p className="text-xs mt-1">Export to Draw.io or open in app.diagrams.net</p>
              </div>
            </div>
          )}
        </div>

        {gridIR && (
          <div className="border-t border-border bg-white px-3 py-2 flex justify-end">
            <button
              type="button"
              onClick={handleOpenInDrawio}
              className="rounded-md border border-blue-600 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
            >
              Open in Draw.io ↗
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-[2] min-w-0 flex-col gap-3 overflow-hidden">
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
            placeholder="Generate a precise enterprise architecture for client delivery…"
            disabled={isStreaming}
            rows={3}
            className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isStreaming || !prompt.trim()}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isStreaming ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
