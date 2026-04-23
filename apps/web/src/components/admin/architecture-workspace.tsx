'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

type DiagramType = 'AWS Architecture' | 'C4 Context' | 'Sequence' | 'Flow' | 'ER Diagram' | 'Custom';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mermaid?: string;
  attachments?: { name: string; size?: number; type?: string; dataUrl?: string }[];
}

const STARTERS: Record<DiagramType, string> = {
  'AWS Architecture': `graph LR
  Client[👤 Client] --> CDN[CloudFront CDN]
  CDN --> ALB[Application Load Balancer]
  ALB --> Lambda[Lambda Function]
  Lambda --> RDS[(Aurora PostgreSQL)]
  Lambda --> S3[(S3 Bucket)]`,
  'C4 Context': `graph TB
  User[👤 User] --> System[ChiselGrid System]
  System --> Cognito[AWS Cognito]
  System --> Bedrock[AWS Bedrock AI]
  System --> Aurora[(Aurora DB)]`,
  Sequence: `sequenceDiagram
  participant U as User
  participant W as Web
  participant A as API
  participant B as Bedrock
  U->>W: Ask for diagram
  W->>A: POST /generate
  A->>B: Invoke claude-sonnet-4-5
  B-->>A: Mermaid
  A-->>W: { mermaid }
  W-->>U: Rendered diagram`,
  Flow: `flowchart TD
  Start([Start]) --> Input[/User prompt/]
  Input --> Gen{Generate?}
  Gen -- Yes --> Bedrock[Call Bedrock]
  Gen -- No --> End([Done])
  Bedrock --> Render[Render Mermaid]
  Render --> End`,
  'ER Diagram': `erDiagram
  TENANT ||--o{ CONTENT : owns
  CONTENT }o--|| CATEGORY : classified
  CONTENT ||--o{ CONTENT_BLOCK : contains
  USER ||--o{ CONTENT : authors`,
  Custom: `graph LR
  A[Start] --> B[Describe your system]
  B --> C{Decision}
  C --> D[Outcome]`,
};

const DIAGRAM_TYPES: DiagramType[] = ['AWS Architecture', 'C4 Context', 'Sequence', 'Flow', 'ER Diagram', 'Custom'];

type SpeechCtor = new () => SpeechRecognitionInstance;
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
interface SpeechRecognitionEventLike {
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
  resultIndex: number;
}

function getSpeechRecognition(): SpeechCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function ArchitectureWorkspace() {
  const canvasId = useId().replace(/:/g, '');
  const [diagramType, setDiagramType] = useState<DiagramType>('AWS Architecture');
  const [mermaidCode, setMermaidCode] = useState<string>(STARTERS['AWS Architecture']);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'seed',
      role: 'assistant',
      content:
        'Describe the architecture you want. Start from a template, then iterate: "add a Redis cache between Lambda and Aurora", "make this a sequence diagram", etc.',
    },
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<{ name: string; size: number; type: string; dataUrl?: string }[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const mermaidLibRef = useRef<typeof import('mermaid').default | null>(null);

  const renderToken = useRef(0);

  const renderMermaid = useCallback(
    async (code: string) => {
      if (!canvasRef.current) return;
      setRenderError(null);
      const token = ++renderToken.current;
      try {
        if (!mermaidLibRef.current) {
          const mod = await import('mermaid');
          mermaidLibRef.current = mod.default;
          const isDark =
            typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
          mermaidLibRef.current.initialize({
            startOnLoad: false,
            securityLevel: 'loose',
            theme: isDark ? 'dark' : 'default',
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          });
        }
        if (token !== renderToken.current) return;
        const trimmed = code.trim();
        if (!trimmed) {
          canvasRef.current.innerHTML = '';
          return;
        }
        const { svg } = await mermaidLibRef.current.render(`mmd-${canvasId}-${token}`, trimmed);
        if (token !== renderToken.current || !canvasRef.current) return;
        canvasRef.current.innerHTML = svg;
      } catch (err) {
        if (token !== renderToken.current) return;
        const message = err instanceof Error ? err.message : String(err);
        setRenderError(message);
      }
    },
    [canvasId],
  );

  useEffect(() => {
    void renderMermaid(mermaidCode);
  }, [mermaidCode, renderMermaid]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, [prompt]);

  const handleDiagramTypeChange = (type: DiagramType) => {
    setDiagramType(type);
    setMermaidCode(STARTERS[type]);
  };

  const handleGenerate = useCallback(async () => {
    const text = prompt.trim();
    if (!text || isGenerating) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      attachments: attachments.length > 0 ? attachments.map((a) => ({ name: a.name, size: a.size, type: a.type })) : undefined,
    };
    setMessages((m) => [...m, userMsg]);
    setPrompt('');
    setAttachments([]);
    setIsGenerating(true);
    try {
      const res = await fetch('/api/admin/grid/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, diagramType, currentDiagram: mermaidCode }),
      });
      if (!res.ok) {
        const err = await res.text();
        setMessages((m) => [
          ...m,
          { id: `a-${Date.now()}`, role: 'assistant', content: `Generation failed: ${res.status} ${err}` },
        ]);
        return;
      }
      const data = (await res.json()) as { mermaid?: string };
      if (data.mermaid) {
        setMermaidCode(data.mermaid);
        setMessages((m) => [
          ...m,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: 'Here is the updated diagram.',
            mermaid: data.mermaid,
          },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          { id: `a-${Date.now()}`, role: 'assistant', content: 'No diagram returned.' },
        ]);
      }
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: 'Request failed: ' + (err instanceof Error ? err.message : String(err)),
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, diagramType, mermaidCode, attachments, isGenerating]);

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
    rec.onerror = () => {
      setIsRecording(false);
    };
    rec.onend = () => {
      setIsRecording(false);
      setPrompt((prev) => prev.replace(/\s*⟨listening…⟩.*$/, '').trim());
    };
    recognitionRef.current = rec;
    setIsRecording(true);
    rec.start();
  }, [isRecording]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files).slice(0, 5);
    list.forEach((f) => {
      const entry = { name: f.name, size: f.size, type: f.type } as {
        name: string;
        size: number;
        type: string;
        dataUrl?: string;
      };
      if (f.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          entry.dataUrl = String(reader.result);
          setAttachments((a) => a.map((x) => (x.name === entry.name && x.size === entry.size ? entry : x)));
        };
        reader.readAsDataURL(f);
      }
      setAttachments((a) => [...a, entry]);
    });
  }, []);

  const onPaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            const dt = new DataTransfer();
            dt.items.add(file);
            handleFiles(dt.files);
          }
        }
      }
    },
    [handleFiles],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        void handleGenerate();
      }
    },
    [handleGenerate],
  );

  const handleNewDiagram = () => {
    setMermaidCode(STARTERS[diagramType]);
    setMessages([
      {
        id: 'seed',
        role: 'assistant',
        content: 'Started a fresh ' + diagramType + ' diagram. Describe what to change.',
      },
    ]);
  };

  const handleSaveDiagram = () => {
    try {
      const svg = canvasRef.current?.querySelector('svg');
      const payload = {
        diagramType,
        mermaid: mermaidCode,
        svg: svg ? svg.outerHTML : null,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('chiselgrid_last_diagram', JSON.stringify(payload));
      alert('Diagram saved locally. Cloud save coming soon.');
    } catch {
      alert('Unable to save diagram.');
    }
  };

  const attachmentsPreview = useMemo(() => {
    if (attachments.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-2 px-3 pt-2">
        {attachments.map((a, i) => (
          <div
            key={`${a.name}-${i}`}
            className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs"
          >
            {a.dataUrl ? (
              <span
                className="h-6 w-6 rounded bg-center bg-cover"
                style={{ backgroundImage: `url(${a.dataUrl})` }}
                aria-hidden
              />
            ) : (
              <span className="text-muted-foreground">📄</span>
            )}
            <span className="max-w-[140px] truncate">{a.name}</span>
            <button
              type="button"
              aria-label={`Remove ${a.name}`}
              onClick={() => setAttachments((arr) => arr.filter((_, j) => j !== i))}
              className="text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    );
  }, [attachments]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold">Architecture Diagrams</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            C4, AWS, sequence and flow diagrams — generated and iterated with AI.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNewDiagram}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm hover:bg-muted transition-colors"
          >
            New
          </button>
          <button
            type="button"
            onClick={handleSaveDiagram}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Save
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 pb-3 border-b border-border">
        {DIAGRAM_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => handleDiagramTypeChange(t)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              diagramType === t
                ? 'border-blue-500 bg-blue-600 text-white'
                : 'border-border bg-card text-muted-foreground hover:bg-muted'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 grid flex-1 min-h-0 gap-4 grid-cols-1 lg:grid-cols-[1fr_380px]">
        <div className="flex min-h-[480px] flex-col rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="text-xs font-medium text-muted-foreground">Diagram canvas</div>
            <div className="text-xs text-muted-foreground">
              {isGenerating ? 'Generating…' : renderError ? 'Render error' : 'Ready'}
            </div>
          </div>
          <div className="relative flex-1 overflow-auto p-4">
            {isGenerating && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                <div className="flex items-center gap-2 rounded-lg bg-card px-4 py-2 shadow">
                  <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  <span className="text-sm">Generating diagram…</span>
                </div>
              </div>
            )}
            <div ref={canvasRef} className="mermaid-canvas flex justify-center" />
            {renderError && (
              <div className="mt-4 rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-3 text-xs text-red-700 dark:text-red-300">
                <div className="font-semibold mb-1">Mermaid render error</div>
                <pre className="whitespace-pre-wrap">{renderError}</pre>
              </div>
            )}
          </div>
          <details className="border-t border-border bg-muted/30">
            <summary className="cursor-pointer px-3 py-2 text-xs text-muted-foreground">
              View / edit Mermaid source
            </summary>
            <textarea
              value={mermaidCode}
              onChange={(e) => setMermaidCode(e.target.value)}
              spellCheck={false}
              className="w-full bg-background border-t border-border px-3 py-2 text-xs font-mono focus:outline-none resize-y min-h-[120px]"
            />
          </details>
        </div>

        <div className="flex min-h-[480px] flex-col rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
            Prompt & history
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-lg px-3 py-2 text-sm ${
                  m.role === 'user'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 ml-6'
                    : 'bg-muted/50 text-foreground mr-6'
                }`}
              >
                <div className="text-[10px] uppercase tracking-wider opacity-60 mb-1">
                  {m.role === 'user' ? 'You' : 'Grid AI'}
                </div>
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
                {m.attachments && m.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.attachments.map((a) => (
                      <span key={a.name} className="text-[10px] px-1.5 py-0.5 rounded bg-background/60 border border-border">
                        📎 {a.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="border-t border-border">
            {attachmentsPreview}
            <div className="p-3 space-y-2">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={onKeyDown}
                onPaste={onPaste}
                placeholder="Describe your diagram… (Ctrl+Enter to generate)"
                rows={3}
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.txt,.md,.drawio,image/*"
                    className="hidden"
                    onChange={(e) => {
                      handleFiles(e.target.files);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-md p-2 text-muted-foreground hover:bg-muted transition-colors"
                    title="Attach file or image"
                    aria-label="Attach file or image"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className={`relative rounded-md p-2 transition-colors ${
                      isRecording ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'text-muted-foreground hover:bg-muted'
                    }`}
                    title={isRecording ? 'Stop recording' : 'Start voice input'}
                    aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                      <path d="M19 10v2a7 7 0 01-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                    {isRecording && (
                      <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" aria-hidden />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-md p-2 text-muted-foreground hover:bg-muted transition-colors"
                    title="Upload a screenshot (or paste one with Ctrl+V)"
                    aria-label="Upload a screenshot"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isGenerating ? 'Generating…' : 'Generate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
