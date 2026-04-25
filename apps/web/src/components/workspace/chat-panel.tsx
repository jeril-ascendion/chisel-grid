'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { cn } from '@/lib/utils';
import { ReasoningTrail, type TrailEntry } from './ReasoningTrail';

const TOKENS_PER_WORD = 1 / 0.75;

export function ChatPanel() {
  const [input, setInput] = useState('');
  const messages = useWorkspaceStore((s) => s.messages);
  const isGenerating = useWorkspaceStore((s) => s.isGenerating);
  const addMessage = useWorkspaceStore((s) => s.addMessage);
  const setGenerating = useWorkspaceStore((s) => s.setGenerating);
  const addAgentEvent = useWorkspaceStore((s) => s.addAgentEvent);
  const setBlocks = useWorkspaceStore((s) => s.setBlocks);
  const setPipelineStatus = useWorkspaceStore((s) => s.setPipelineStatus);
  const reasoningTrails = useWorkspaceStore((s) => s.reasoningTrails);
  const setReasoningTrail = useWorkspaceStore((s) => s.setReasoningTrail);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null);
  const [trailEntries, setTrailEntries] = useState<TrailEntry[]>([]);
  const trailEntriesRef = useRef<TrailEntry[]>([]);

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

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      addMessage({ role: 'system', content: 'File too large. Maximum 5MB.' });
      e.target.value = '';
      return;
    }
    try {
      let content = await file.text();
      if (content.length > 8000) {
        content = content.slice(0, 8000) + '\n\n[Content truncated]';
      }
      setAttachedFile({ name: file.name, content });
      if (!input.trim()) {
        setInput(`Based on the attached document "${file.name}", write a comprehensive technical article`);
      }
    } catch {
      addMessage({ role: 'system', content: 'Could not read file. Please try a text-based format.' });
    }
    e.target.value = '';
  }, [input, addMessage]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isGenerating) return;

    setInput('');
    addMessage({ role: 'user', content: text });
    setGenerating(true);
    setPipelineStatus('writing');
    setTrailEntries([]);
    trailEntriesRef.current = [];
    addTrail('thinking', 'Reading your message...', text);
    addTrail(
      'skill',
      'Loading domain context from knowledge base...',
      'tenant-knowledge.rag\nstyle-guide.md\ncontent-blocks.schema',
    );
    addTrail('agent', 'Chamber agent reasoning...');
    const t0 = Date.now();

    addAgentEvent({ agentName: 'Writer', status: 'running', message: 'Generating content...' });

    try {
      const fullTopic = attachedFile
        ? `${text}\n\nReference document: "${attachedFile.name}"\n\nContent:\n${attachedFile.content}`
        : text;

      const res = await fetch('/api/workspace/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: fullTopic }),
      });

      if (!res.ok) throw new Error(`Failed: ${res.status}`);

      const data = (await res.json()) as {
        blocks?: unknown[];
        message?: string;
        articles?: { title: string }[];
      };
      if (data.blocks) {
        setBlocks(data.blocks as import('@chiselgrid/types').ContentBlock[]);
      }
      const responseText = data.message ?? 'Content generated successfully.';
      const wordCount = responseText.split(/\s+/).filter(Boolean).length;
      const tokenEstimate = Math.max(1, Math.round(wordCount * TOKENS_PER_WORD));
      const elapsed = Date.now() - t0;
      if (data.articles && data.articles.length > 0) {
        addTrail(
          'skill',
          `Referenced ${data.articles.length} knowledge articles`,
          data.articles.map((a) => `• ${a.title}`).join('\n'),
        );
      }
      addTrail(
        'success',
        `Response complete (~${tokenEstimate} tokens, ${wordCount} words)`,
        undefined,
        elapsed,
      );
      const messageId = addMessage({ role: 'assistant', content: responseText });
      setReasoningTrail(messageId, trailEntriesRef.current);
      setTrailEntries([]);
      trailEntriesRef.current = [];
      addAgentEvent({ agentName: 'Writer', status: 'completed', message: 'Draft ready' });
      setPipelineStatus('reviewing');
      setAttachedFile(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      addTrail('error', `Generation failed: ${message}`, undefined, Date.now() - t0);
      const messageId = addMessage({ role: 'system', content: `Error: ${message}` });
      setReasoningTrail(messageId, trailEntriesRef.current);
      setTrailEntries([]);
      trailEntriesRef.current = [];
      addAgentEvent({ agentName: 'Writer', status: 'failed', message: 'Generation failed' });
      setPipelineStatus('idle');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            <p>Describe a topic to generate an article...</p>
          </div>
        )}
        {messages.map((msg) => {
          const pastTrail = reasoningTrails[msg.id];
          return (
            <div key={msg.id}>
              <div
                className={cn(
                  'rounded-lg px-3 py-2 text-sm',
                  msg.role === 'user' && 'ml-8 bg-blue-600 text-white',
                  msg.role === 'assistant' && 'mr-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100',
                  msg.role === 'system' && 'mx-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-center text-xs',
                )}
              >
                {msg.content}
              </div>
              {pastTrail && pastTrail.length > 0 && msg.role !== 'user' && (
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
        })}
        {isGenerating && (
          <div className="mr-8 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-500">
            <span className="inline-flex gap-1">
              <span className="animate-bounce">.</span>
              <span className="animate-bounce [animation-delay:0.1s]">.</span>
              <span className="animate-bounce [animation-delay:0.2s]">.</span>
            </span>
          </div>
        )}
      </div>

      <div className="px-4 pb-2 shrink-0">
        <ReasoningTrail
          entries={trailEntries}
          isActive={isGenerating}
          defaultExpanded={false}
        />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 dark:border-gray-700 p-3 shrink-0">
        {attachedFile && (
          <div className="flex items-center gap-2 mb-2 text-xs text-orange-600 dark:text-orange-400">
            <span>📎 {attachedFile.name}</span>
            <button type="button" onClick={() => setAttachedFile(null)} className="text-gray-400 hover:text-red-500">✕</button>
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer items-center rounded-lg border border-gray-200 dark:border-gray-700 px-3 hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Attach document"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".txt,.md,.pdf,.ts,.tsx,.js,.jsx,.py,.json,.yaml,.yml,.csv"
            onChange={handleFileChange}
          />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe the topic for your article..."
            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isGenerating}
          />
          <button
            type="submit"
            disabled={isGenerating || !input.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate
          </button>
        </div>
      </form>
    </div>
  );
}
