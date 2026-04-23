'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GridIR } from '@chiselgrid/grid-ir';

const DiagramCanvas = dynamic(
  () => import('@chiselgrid/grid-renderer').then((m) => m.DiagramCanvas),
  { ssr: false },
);

const DiagramToolbar = dynamic(
  () => import('@chiselgrid/grid-renderer').then((m) => m.DiagramToolbar),
  { ssr: false },
);

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  error?: boolean;
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
  const [gridIR, setGridIR] = useState<GridIR | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [diagramType, setDiagramType] = useState<string>('aws_architecture');
  const [isRecording, setIsRecording] = useState(false);
  const [attachment, setAttachment] = useState<{ name: string; type: string } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, [prompt]);

  const handleGenerate = useCallback(async () => {
    const text = prompt.trim();
    if (!text || isGenerating) return;

    const userContent = attachment ? `${text}\n📎 ${attachment.name}` : text;
    setMessages((m) => [...m, { role: 'user', content: userContent }]);
    setPrompt('');
    setAttachment(null);
    setIsGenerating(true);

    try {
      const res = await fetch('/api/admin/grid/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          diagramType,
          existingIR: gridIR ?? undefined,
        }),
      });

      if (!res.ok) {
        const detail = await res.text();
        setMessages((m) => [
          ...m,
          {
            role: 'ai',
            content: `Generation failed (${res.status}). ${detail.slice(0, 200)}`,
            error: true,
          },
        ]);
        return;
      }

      const data = (await res.json()) as { gridIR: GridIR; diagramId: string | null };
      setGridIR(data.gridIR);
      const label = formatDiagramType(data.gridIR.diagram_type);
      setMessages((m) => [
        ...m,
        {
          role: 'ai',
          content: `Generated ${label} with ${data.gridIR.nodes.length} nodes and ${data.gridIR.edges.length} edges.`,
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: 'ai',
          content:
            'Request failed: ' + (err instanceof Error ? err.message : String(err)),
          error: true,
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, diagramType, gridIR, isGenerating, attachment]);

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

  const handleExportPNG = useCallback(() => {
    if (!gridIR) {
      alert('Generate a diagram first.');
      return;
    }
    const svg = document.querySelector('.react-flow svg') as SVGSVGElement | null;
    if (!svg) {
      alert('Diagram canvas not ready.');
      return;
    }
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(gridIR.title || 'diagram').toLowerCase().replace(/\s+/g, '-')}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [gridIR]);

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* LEFT PANEL — 60% — Diagram canvas */}
      <div className="flex flex-[3] min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
        <DiagramToolbar
          diagramType={diagramType}
          onDiagramTypeChange={setDiagramType}
          onExportPNG={handleExportPNG}
        />
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
          {isGenerating && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
              <div className="flex items-center gap-2 rounded-lg bg-card px-4 py-2 shadow">
                <svg
                  className="animate-spin h-4 w-4 text-blue-600"
                  viewBox="0 0 24 24"
                  fill="none"
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
                <span className="text-sm">Generating…</span>
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
            messages.map((m, i) => (
              <div
                key={i}
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
              </div>
            ))
          )}
          <div ref={chatEndRef} />
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
