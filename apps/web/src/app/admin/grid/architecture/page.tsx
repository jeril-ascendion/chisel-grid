'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DiagramType, TEMPLATES, type GridEdge, type GridIR, type GridNode } from '@chiselgrid/grid-ir';
import { useSessionId } from '@/hooks/use-session-id';
import { DiagramSourceBanner } from '@/components/grid/DiagramSourceBanner';
import { RelatedContent } from '@/components/grid/RelatedContent';
import { upsertRecentSession } from '@/lib/recent-sessions';
import { ReasoningTrail, type TrailEntry } from '@/components/workspace/ReasoningTrail';
import { ShareButton } from '@/components/workspace/share-button';
import { fetchSession, saveSession } from '@/lib/session-client';

interface TemplateOption {
  key: string;
  label: string;
  emoji: string;
}

const TEMPLATE_OPTIONS: TemplateOption[] = [
  { key: 'aws_payment_serverless', label: 'Serverless Payment API', emoji: '💳' },
  { key: 'c4_context_banking', label: 'C4 Banking Context', emoji: '🏗️' },
  { key: 'aws_microservices', label: 'Microservices', emoji: '⚙️' },
];

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
  affectedNodeIds?: string[];
}

interface ValidationSummary {
  score: number;
  valid: boolean;
  criticalCount: number;
  warningCount: number;
  findings: ValidationFinding[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  error?: boolean;
  retryable?: boolean;
  validation?: ValidationSummary;
  dismissed?: boolean;
}

const mkMessageId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function scoreBadgeClass(score: number): string {
  if (score >= 90) return 'bg-green-600 text-white';
  if (score >= 70) return 'bg-amber-500 text-white';
  return 'bg-red-600 text-white';
}

type SpeechCtor = new () => SpeechRecognitionInstance;
interface SpeechRecognitionEventLike {
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
  resultIndex: number;
}
interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getSpeechRecognition(): SpeechCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function formatDiagramType(t: string): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ArchitecturePage() {
  const sessionId = useSessionId();
  const [gridIR, setGridIR] = useState<GridIR | null>(null);
  const [diagramId, setDiagramId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingStatus, setStreamingStatus] = useState<string | null>(null);
  const [trailEntries, setTrailEntries] = useState<TrailEntry[]>([]);
  const trailEntriesRef = useRef<TrailEntry[]>([]);
  const [committedTrails, setCommittedTrails] = useState<Record<string, TrailEntry[]>>({});

  const addTrail = useCallback(
    (
      type: TrailEntry['type'],
      message: string,
      detail?: string,
      durationMs?: number,
    ) => {
      const entry: TrailEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: Date.now(),
        type,
        message,
        ...(detail !== undefined ? { detail } : {}),
        ...(durationMs !== undefined ? { durationMs } : {}),
      };
      trailEntriesRef.current = [...trailEntriesRef.current, entry];
      setTrailEntries(trailEntriesRef.current);
    },
    [],
  );

  const commitTrailToMessage = useCallback((messageId: string) => {
    if (trailEntriesRef.current.length === 0) return;
    const snapshot = trailEntriesRef.current;
    setCommittedTrails((prev) => ({ ...prev, [messageId]: snapshot }));
    trailEntriesRef.current = [];
    setTrailEntries([]);
  }, []);
  const [prompt, setPrompt] = useState('');
  const [diagramType, setDiagramType] = useState<string>('aws_architecture');
  const [isRecording, setIsRecording] = useState(false);
  const [attachment, setAttachment] = useState<{ name: string; type: string } | null>(null);
  const [restored, setRestored] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const templatesRef = useRef<HTMLDivElement | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!templatesOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (!templatesRef.current) return;
      if (!templatesRef.current.contains(e.target as Node)) {
        setTemplatesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [templatesOpen]);

  const handleLoadTemplate = useCallback((option: TemplateOption) => {
    const template = TEMPLATES[option.key];
    if (!template) {
      setMessages((m) => [
        ...m,
        { id: mkMessageId(), role: 'ai', content: `Template "${option.label}" is not available.`, error: true },
      ]);
      setTemplatesOpen(false);
      return;
    }
    const cloned = JSON.parse(JSON.stringify(template)) as GridIR;
    setGridIR(cloned);
    setDiagramType(cloned.diagram_type);
    setMessages((m) => [
      ...m,
      {
        id: mkMessageId(),
        role: 'ai',
        content: `Loaded ${option.label} template. You can now refine it with prompts.`,
      },
    ]);
    setTemplatesOpen(false);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Hydrate from server first (so a shared link in a new tab restores state),
  // fall back to sessionStorage if the server has no record yet (first
  // generation hasn't completed). sessionStorage stays as a fast-paint cache.
  useEffect(() => {
    if (!sessionId || restored) return;
    let cancelled = false;
    const applyData = (data: {
      messages?: ChatMessage[];
      gridIR?: GridIR | null;
      reasoningTrails?: Record<string, TrailEntry[]>;
    }) => {
      if (Array.isArray(data.messages)) {
        // Legacy v1 records lack `id`; mint one for any message missing it.
        setMessages(
          data.messages.map((m) => (m.id ? m : { ...m, id: mkMessageId() })),
        );
      }
      if (data.gridIR) setGridIR(data.gridIR);
      if (data.reasoningTrails && typeof data.reasoningTrails === 'object') {
        setCommittedTrails(data.reasoningTrails);
      }
    };
    void (async () => {
      const remote = await fetchSession(sessionId);
      if (cancelled) return;
      if (remote && remote.kind === 'grid') {
        applyData(remote.state as {
          messages?: ChatMessage[];
          gridIR?: GridIR | null;
          reasoningTrails?: Record<string, TrailEntry[]>;
        });
      } else {
        try {
          const raw = sessionStorage.getItem('grid_session_' + sessionId);
          if (raw) applyData(JSON.parse(raw));
        } catch {
          // ignore corrupt payloads
        }
      }
      if (!cancelled) setRestored(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, restored]);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!sessionId || !restored) return;
    const title =
      gridIR?.title || messages.find((m) => m.role === 'user')?.content?.slice(0, 40) || null;
    try {
      sessionStorage.setItem(
        'grid_session_' + sessionId,
        JSON.stringify({
          schemaVersion: 2,
          messages,
          gridIR,
          reasoningTrails: committedTrails,
        }),
      );
    } catch {
      // ignore quota errors
    }
    upsertRecentSession({
      id: sessionId,
      title: title ?? undefined,
      lastPage: '/admin/grid/architecture',
      updatedAt: Date.now(),
    });

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveSession(sessionId, {
        kind: 'grid',
        title,
        state: { messages, gridIR, reasoningTrails: committedTrails },
      });
    }, 1000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [sessionId, restored, messages, gridIR, committedTrails]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, [prompt]);

  const lastPromptRef = useRef<string>('');

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const runGeneration = useCallback(
    async (text: string, isRetry = false) => {
      setIsGenerating(true);
      setStreamingStatus('Architect is designing…');
      setTrailEntries([]);
      trailEntriesRef.current = [];
      addTrail('thinking', 'Reading your prompt...', text);
      addTrail(
        'skill',
        `Loading skills: aws-well-architected, ${diagramType}`,
        `aws-well-architected.md\n${diagramType}.prompt.ts\npci-dss-rules.md`,
      );
      addTrail('agent', 'Architecture Agent activated');
      const t0 = Date.now();

      // Reset canvas to an empty IR scoped to the current diagram type. As
      // streaming proceeds, nodes and edges are appended live.
      const seedIR: GridIR = {
        version: '1.0',
        diagram_type: diagramType as DiagramType,
        title: 'Designing…',
        nodes: [],
        edges: [],
      };
      setGridIR(seedIR);

      let nodeCount = 0;
      let edgeCount = 0;
      let streamErrored = false;
      let coldStartHandled = false;
      let firstEdgeLogged = false;

      const handleColdStart = () => {
        if (coldStartHandled) return;
        coldStartHandled = true;
        clearRetryTimer();
        if (isRetry) {
          setIsRetrying(false);
          setMessages((m) => [
            ...m.filter((msg) => !msg.content.startsWith('Aurora is ')),
            {
              id: mkMessageId(),
              role: 'ai',
              content: 'Aurora is still waking. Please click Retry in 30 seconds.',
              error: true,
              retryable: true,
            },
          ]);
        } else {
          setMessages((m) => [
            ...m.filter((msg) => !msg.content.startsWith('Aurora is ')),
            {
              id: mkMessageId(),
              role: 'ai',
              content: 'Aurora is waking up. Auto-retrying in 15 seconds…',
              retryable: true,
            },
          ]);
          setIsRetrying(true);
          retryTimerRef.current = setTimeout(() => {
            retryTimerRef.current = null;
            setIsRetrying(false);
            setMessages((m) => [
              ...m.filter((msg) => !msg.content.startsWith('Aurora is ')),
              { id: mkMessageId(), role: 'ai', content: 'Retrying…', retryable: false },
            ]);
            void runGeneration(text, true);
          }, 15_000);
        }
      };

      try {
        const res = await fetch('/api/admin/grid/generate-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: text,
            diagramType,
            existingIR: gridIR ?? undefined,
            sessionId: sessionId || undefined,
          }),
        });

        if (!res.ok || !res.body) {
          let detail = '';
          try {
            const parsed = (await res.json()) as { detail?: string; error?: string };
            detail = parsed.detail ?? parsed.error ?? '';
          } catch {
            detail = await res.text().catch(() => '');
          }
          if (res.status === 504) {
            handleColdStart();
            addTrail('warning', 'Aurora cold start (504), auto-retrying...');
          } else {
            addTrail(
              'error',
              `HTTP ${res.status}: ${detail.slice(0, 120) || 'request failed'}`,
            );
            const errMsg: ChatMessage = {
              id: mkMessageId(),
              role: 'ai',
              content: `Generation failed (${res.status}). ${detail.slice(0, 200)}`,
              error: true,
              retryable: true,
            };
            setMessages((m) => [...m, errMsg]);
            commitTrailToMessage(errMsg.id);
          }
          return;
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
              | { kind: 'meta'; data: { title?: string; diagram_type?: string; abstraction_level?: number } }
              | { kind: 'node'; data: GridNode }
              | { kind: 'edge'; data: GridEdge }
              | {
                  kind: 'done';
                  gridIR: GridIR;
                  diagramId: string | null;
                  validation?: ValidationSummary;
                }
              | { kind: 'error'; error: string };
            try {
              event = JSON.parse(line);
            } catch {
              continue;
            }

            if (event.kind === 'meta') {
              const meta = event.data;
              setGridIR((prev) =>
                prev
                  ? {
                      ...prev,
                      title: meta.title ?? prev.title,
                      diagram_type: (meta.diagram_type as DiagramType) ?? prev.diagram_type,
                      ...(meta.abstraction_level !== undefined
                        ? { abstraction_level: meta.abstraction_level }
                        : {}),
                    }
                  : prev,
              );
              setStreamingStatus(`Designing ${meta.title ?? 'diagram'}…`);
              addTrail('thinking', `Designing: ${meta.title ?? 'diagram'}`);
            } else if (event.kind === 'node') {
              nodeCount += 1;
              const newNode = event.data;
              setGridIR((prev) => {
                if (!prev) return prev;
                if (prev.nodes.some((n) => n.id === newNode.id)) return prev;
                // Override agent positions with a deterministic grid during streaming.
                // gridIRToReactFlow skips dagre when every node has a non-zero position,
                // so a stable grid keeps already-placed nodes still as new ones arrive.
                // Dagre is fired once on the 'done' event below.
                const idx = prev.nodes.length;
                const streamingPosition = { x: (idx % 5) * 220, y: Math.floor(idx / 5) * 160 };
                const positionedNode = { ...newNode, position: streamingPosition };
                return { ...prev, nodes: [...prev.nodes, positionedNode] };
              });
              setStreamingStatus(`Placing ${newNode.label}… (${nodeCount} nodes)`);
              addTrail(
                'thinking',
                `Placing ${newNode.label} (${newNode.zone ?? 'no zone'} zone)`,
              );
              // Pace the render so each node visibly lands on the canvas.
              // API Gateway buffers Lambda responses, so without a delay all
              // events would land in one frame in production. 90 ms keeps
              // the live-build-up feel even when the body arrives at once.
              await new Promise((r) => setTimeout(r, 90));
            } else if (event.kind === 'edge') {
              edgeCount += 1;
              const newEdge = event.data;
              setGridIR((prev) => {
                if (!prev) return prev;
                if (prev.edges.some((e) => e.id === newEdge.id)) return prev;
                return { ...prev, edges: [...prev.edges, newEdge] };
              });
              setStreamingStatus(`Wiring connections… (${edgeCount} edges)`);
              if (!firstEdgeLogged) {
                firstEdgeLogged = true;
                addTrail('thinking', `Wiring connections...`);
              }
              await new Promise((r) => setTimeout(r, 60));
            } else if (event.kind === 'done') {
              // Strip per-node positions so gridIRToReactFlow runs dagre exactly once
              // for the final layout. The streaming grid above kept things still;
              // this delivers the polished diagram.
              const finalIR = {
                ...event.gridIR,
                nodes: event.gridIR.nodes.map((n) => {
                  const { position: _drop, ...rest } = n;
                  return rest;
                }),
              };
              setGridIR(finalIR);
              setDiagramId(event.diagramId);
              const label = formatDiagramType(event.gridIR.diagram_type);
              addTrail(
                'agent',
                'Architecture Agent complete',
                `${event.gridIR.nodes.length} nodes, ${event.gridIR.edges.length} edges`,
                Date.now() - t0,
              );
              addTrail('validation', 'Running compliance validator...');
              if (event.validation) {
                if (event.validation.criticalCount > 0) {
                  addTrail(
                    'warning',
                    `${event.validation.criticalCount} critical findings`,
                    event.validation.findings
                      .filter((f) => f.severity === 'critical')
                      .map((f) => `• ${f.message}`)
                      .join('\n'),
                  );
                } else if (event.validation.warningCount > 0) {
                  addTrail(
                    'success',
                    `Architecture score: ${event.validation.score}/100`,
                    event.validation.findings
                      .filter((f) => f.severity === 'warning')
                      .map((f) => `• ${f.message}`)
                      .join('\n'),
                  );
                } else {
                  addTrail(
                    'success',
                    `Architecture score: ${event.validation.score}/100`,
                  );
                }
              }
              const doneMsg: ChatMessage = {
                id: mkMessageId(),
                role: 'ai',
                content: `Generated ${label} with ${event.gridIR.nodes.length} nodes and ${event.gridIR.edges.length} edges.`,
                validation: event.validation,
              };
              setMessages((m) => [
                ...m.filter(
                  (msg) =>
                    !msg.content.startsWith('Aurora is ') && msg.content !== 'Retrying…',
                ),
                doneMsg,
              ]);
              commitTrailToMessage(doneMsg.id);
            } else if (event.kind === 'error') {
              streamErrored = true;
              addTrail('error', `Generation failed: ${event.error.slice(0, 200)}`);
              if (/timed out|aurora|cold/i.test(event.error)) {
                handleColdStart();
              } else {
                const errMsg: ChatMessage = {
                  id: mkMessageId(),
                  role: 'ai',
                  content: `Generation failed: ${event.error.slice(0, 240)}`,
                  error: true,
                  retryable: true,
                };
                setMessages((m) => [...m, errMsg]);
                commitTrailToMessage(errMsg.id);
              }
            }
          }
        }

        if (!streamErrored && nodeCount === 0) {
          const emptyMsg: ChatMessage = {
            id: mkMessageId(),
            role: 'ai',
            content: 'Stream ended without producing a diagram. Try again.',
            error: true,
            retryable: true,
          };
          setMessages((m) => [...m, emptyMsg]);
          commitTrailToMessage(emptyMsg.id);
        }
      } catch (err) {
        addTrail(
          'error',
          `Request failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        const failMsg: ChatMessage = {
          id: mkMessageId(),
          role: 'ai',
          content:
            'Request failed: ' + (err instanceof Error ? err.message : String(err)),
          error: true,
          retryable: true,
        };
        setMessages((m) => [...m, failMsg]);
        commitTrailToMessage(failMsg.id);
      } finally {
        setIsGenerating(false);
        setStreamingStatus(null);
      }
    },
    [diagramType, gridIR, clearRetryTimer, addTrail, commitTrailToMessage],
  );

  const handleGenerate = useCallback(async () => {
    const text = prompt.trim();
    if (!text || isGenerating) return;

    // User typed a fresh prompt — cancel any pending Aurora auto-retry so we
    // don't race a stale retry against the new request.
    clearRetryTimer();
    setIsRetrying(false);

    const userContent = attachment ? `${text}\n📎 ${attachment.name}` : text;
    setMessages((m) => [...m, { id: mkMessageId(), role: 'user', content: userContent }]);
    setPrompt('');
    setAttachment(null);
    lastPromptRef.current = text;
    await runGeneration(text);
  }, [prompt, isGenerating, attachment, runGeneration, clearRetryTimer]);

  const handleRetry = useCallback(async () => {
    const text = lastPromptRef.current;
    if (!text || isGenerating) return;
    // Manual click cancels any pending auto-retry and clears the status line.
    clearRetryTimer();
    setIsRetrying(false);
    setMessages((m) => m.filter((msg) => !msg.content.startsWith('Aurora is ')));
    await runGeneration(text, true);
  }, [isGenerating, runGeneration, clearRetryTimer]);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  const handleApplyFixes = useCallback(
    async (findings: ValidationFinding[], messageIndex: number) => {
      if (isGenerating || findings.length === 0) return;
      const fixPrompt =
        'Fix these architectural issues in the current diagram:\n' +
        findings.map((f) => f.fix).join('. ');
      setMessages((m) =>
        m.map((msg, i) =>
          i === messageIndex ? { ...msg, dismissed: true } : msg,
        ).concat({ id: mkMessageId(), role: 'user', content: fixPrompt }),
      );
      lastPromptRef.current = fixPrompt;
      await runGeneration(fixPrompt);
    },
    [isGenerating, runGeneration],
  );

  const handleDismissValidation = useCallback((messageIndex: number) => {
    setMessages((m) =>
      m.map((msg, i) =>
        i === messageIndex ? { ...msg, dismissed: true } : msg,
      ),
    );
  }, []);

  const toggleRecording = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      alert('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    const rec = new Ctor();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = true;
    let finalChunk = '';
    rec.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) {
          finalChunk += r[0].transcript + ' ';
        } else {
          interim += r[0].transcript;
        }
      }
      setPrompt((prev) => {
        const base = prev.replace(/\s*⟨listening…⟩.*$/, '').trimEnd();
        const joined = (base + ' ' + finalChunk).replace(/\s+/g, ' ').trim();
        return interim ? joined + ' ⟨listening…⟩ ' + interim : joined;
      });
    };
    rec.onerror = () => setIsRecording(false);
    rec.onend = () => {
      setIsRecording(false);
      setPrompt((prev) => prev.replace(/\s*⟨listening…⟩.*$/, '').trim());
    };
    recognitionRef.current = rec;
    setIsRecording(true);
    rec.start();
  }, [isRecording]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        void handleGenerate();
      }
    },
    [handleGenerate],
  );

  const downloadBlob = useCallback((content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const fileBaseName = useCallback(
    () => (gridIR?.title || 'diagram').toLowerCase().replace(/\s+/g, '-'),
    [gridIR],
  );

  const handleExportDrawio = useCallback(async () => {
    if (!gridIR) {
      alert('Generate a diagram first.');
      return;
    }
    const { gridIRToDrawio } = await import('@chiselgrid/grid-ir');
    downloadBlob(gridIRToDrawio(gridIR), `${fileBaseName()}.drawio`, 'application/xml');
  }, [gridIR, downloadBlob, fileBaseName]);

  const handleExportExcalidraw = useCallback(async () => {
    if (!gridIR) {
      alert('Generate a diagram first.');
      return;
    }
    const { gridIRToExcalidrawFile } = await import('@chiselgrid/grid-ir');
    downloadBlob(
      gridIRToExcalidrawFile(gridIR),
      `${fileBaseName()}.excalidraw`,
      'application/json',
    );
  }, [gridIR, downloadBlob, fileBaseName]);

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
      a.download = `${(gridIR.title || 'diagram').toLowerCase().replace(/\s+/g, '-')}.png`;
      a.click();
    } catch (err) {
      alert('PNG export failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, [gridIR]);

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* LEFT PANEL — 60% — Diagram canvas */}
      <div className="flex flex-[3] min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border bg-white px-3 py-2">
          <div ref={templatesRef} className="relative">
            <button
              type="button"
              onClick={() => setTemplatesOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              aria-haspopup="menu"
              aria-expanded={templatesOpen}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
              Templates
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {templatesOpen && (
              <div
                role="menu"
                className="absolute left-0 top-full z-20 mt-1 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
              >
                {TEMPLATE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    role="menuitem"
                    onClick={() => handleLoadTemplate(opt)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <span aria-hidden className="text-base">
                      {opt.emoji}
                    </span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <DiagramToolbar
              diagramType={diagramType}
              onDiagramTypeChange={setDiagramType}
              onExportPNG={handleExportPNG}
              onExportDrawio={handleExportDrawio}
              onExportExcalidraw={handleExportExcalidraw}
            />
          </div>
          <ShareButton />
        </div>
        {diagramId && (
          <div className="border-b border-border px-3 py-2 space-y-2">
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
        <div className="relative flex-1 min-h-0">
          {gridIR ? (
            <DiagramCanvas gridIR={gridIR} />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
              <div className="text-6xl mb-4 opacity-20 select-none" aria-hidden>
                ⬡
              </div>
              <p className="max-w-sm text-sm text-muted-foreground">
                Describe your architecture in the panel on the right to generate a diagram
              </p>
            </div>
          )}
          {isGenerating && streamingStatus && (
            <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
              <div className="flex items-center gap-2 rounded-full border border-blue-200 bg-white/90 px-4 py-1.5 shadow-md backdrop-blur-sm">
                <svg
                  className="animate-spin h-3.5 w-3.5 text-blue-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                <span className="text-xs font-medium text-slate-700">{streamingStatus}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL — 40% — Prompt and chat */}
      <div className="flex flex-[2] min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h1 className="text-lg font-bold">Architecture Diagrams</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Describe your system and Grid will generate an interactive diagram
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center px-6">
              <p className="text-xs text-muted-foreground">
                Start by describing your architecture below
              </p>
            </div>
          ) : (
            messages.map((m, i) => {
              const isLast = i === messages.length - 1;
              const pastTrail = committedTrails[m.id];
              return (
                <div key={m.id}>
                <div
                  className={
                    m.role === 'user'
                      ? 'ml-8 rounded-lg bg-blue-600 text-white px-3 py-2 text-sm whitespace-pre-wrap break-words'
                      : m.error
                        ? 'mr-8 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800 px-3 py-2 text-sm whitespace-pre-wrap break-words'
                        : 'mr-8 rounded-lg bg-muted text-foreground px-3 py-2 text-sm whitespace-pre-wrap break-words'
                  }
                >
                  <div className="text-[10px] uppercase tracking-wider opacity-60 mb-1">
                    {m.role === 'user' ? 'You' : 'Grid AI'}
                  </div>
                  {m.content}
                  {m.retryable && isLast && !isGenerating && (
                    <button
                      type="button"
                      onClick={() => void handleRetry()}
                      className="mt-2 inline-flex items-center gap-1 rounded-md bg-red-600 text-white px-2.5 py-1 text-xs font-medium hover:bg-red-700"
                    >
                      {isRetrying ? 'Retry now' : 'Retry'}
                    </button>
                  )}
                  {m.role === 'ai' && m.validation && !m.dismissed && (
                    <div className="mt-3 rounded-md border border-border bg-background/60 p-2 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${scoreBadgeClass(
                              m.validation.score,
                            )}`}
                          >
                            Architecture Score: {m.validation.score}/100
                          </span>
                          <span className="text-xs">
                            🔴 {m.validation.criticalCount} Critical
                          </span>
                          <span className="text-xs">
                            🟡 {m.validation.warningCount} Warnings
                          </span>
                        </div>
                      </div>
                      {m.validation.findings.filter((f) => f.severity === 'critical').length > 0 && (
                        <ul className="space-y-1 text-xs">
                          {m.validation.findings
                            .filter((f) => f.severity === 'critical')
                            .map((f) => (
                              <li
                                key={f.rule}
                                className="flex gap-2 text-red-700 dark:text-red-300"
                              >
                                <span aria-hidden>•</span>
                                <span>
                                  <strong>{f.rule}:</strong> {f.message}
                                </span>
                              </li>
                            ))}
                        </ul>
                      )}
                      {m.validation.findings.filter((f) => f.severity === 'warning').length > 0 && (
                        <ul className="space-y-1 text-xs">
                          {m.validation.findings
                            .filter((f) => f.severity === 'warning')
                            .map((f) => (
                              <li
                                key={f.rule}
                                className="flex gap-2 text-amber-700 dark:text-amber-300"
                              >
                                <span aria-hidden>•</span>
                                <span>
                                  <strong>{f.rule}:</strong> {f.message}
                                </span>
                              </li>
                            ))}
                        </ul>
                      )}
                      {m.validation.findings.length > 0 && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            disabled={isGenerating}
                            onClick={() =>
                              void handleApplyFixes(m.validation!.findings, i)
                            }
                            className="inline-flex items-center gap-1 rounded-md bg-blue-600 text-white px-2.5 py-1 text-xs font-medium hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Apply All Fixes
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDismissValidation(i)}
                            className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {pastTrail && pastTrail.length > 0 && m.role === 'ai' && (
                  <div className="mr-8 mt-2">
                    <ReasoningTrail
                      entries={pastTrail}
                      isActive={false}
                      defaultExpanded={false}
                    />
                  </div>
                )}
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="px-4 pb-2">
          <ReasoningTrail
            entries={trailEntries}
            isActive={isGenerating}
            defaultExpanded={false}
          />
        </div>

        <div className="border-t border-border p-3 space-y-2">
          {attachment && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs">
              <span>📎</span>
              <span className="flex-1 truncate">{attachment.name}</span>
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Remove attachment"
              >
                ×
              </button>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Describe your architecture… (Ctrl+Enter to generate)"
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.pdf,.txt,.md"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setAttachment({ name: file.name, type: file.type });
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md p-2 text-muted-foreground hover:bg-muted transition-colors"
              title="Attach file"
              aria-label="Attach file"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
              </svg>
            </button>

            <button
              type="button"
              onClick={toggleRecording}
              className={`relative rounded-md p-2 transition-colors ${
                isRecording
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
              title={isRecording ? 'Stop voice input' : 'Start voice input'}
              aria-label={isRecording ? 'Stop voice input' : 'Start voice input'}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                <path d="M19 10v2a7 7 0 01-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              {isRecording && (
                <span
                  className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse"
                  aria-hidden
                />
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Generating…
              </>
            ) : (
              'Generate'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
