'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { StudioBreadcrumb } from '@/components/studio/StudioBreadcrumb';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface BlackboardSummary {
  intent?: { type?: string; criticality_tier?: number; domain?: string };
  requirements_status?: string;
  architecture_status?: string;
  analysis?: { overall_readiness_score?: number; adrs_count?: number; risks_count?: number };
  pending_assumptions_count?: number;
  blocking_conflicts_count?: number;
  generation_ready?: boolean;
}

interface Diagram {
  id: string;
  type: string;
  format: string;
  title: string;
  content: string;
}

interface AgentProgress {
  agentId: string;
  agentName: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  durationMs?: number;
}

interface AssumptionItem {
  id: string;
  statement: string;
  source: string;
  confidence: number;
  affected_components: string[];
  confirmed_at?: string;
  confirmed_by?: string;
  override_value?: string;
}

interface ConflictItem {
  id: string;
  type: string;
  blocking: boolean;
  fact_a: { statement: string };
  fact_b: { statement: string };
  resolution_options: string[];
  resolved: boolean;
  resolution?: string;
}

const TIER_COLORS: Record<number, string> = {
  1: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  2: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  3: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  4: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const PIPELINE_AGENTS = [
  { id: 'context_analyzer', name: 'Context' },
  { id: 'architecture_generator', name: 'Arch' },
  { id: 'tradeoff_analyzer', name: 'Tarka' },
  { id: 'diagram_generator', name: 'Diagrams' },
  { id: 'review_validator', name: 'Review' },
  { id: 'estimator', name: 'Estimate' },
  { id: 'document_generator', name: 'Docs' },
];

export default function StudioSessionPage() {
  const params = useParams();
  const sessionId = params?.sessionId as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [summary, setSummary] = useState<BlackboardSummary>({});
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [activeTab, setActiveTab] = useState<'architecture' | 'diagrams' | 'adrs' | 'estimates' | 'inspector'>('inspector');
  const [sessionData, setSessionData] = useState<Record<string, unknown> | null>(null);
  const [agentProgress, setAgentProgress] = useState<AgentProgress[]>([]);
  const [assumptions, setAssumptions] = useState<AssumptionItem[]>([]);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [overrideId, setOverrideId] = useState<string | null>(null);
  const [overrideValue, setOverrideValue] = useState('');
  const [conflictResolution, setConflictResolution] = useState<Record<string, string>>({});
  const [breadcrumbWorkspace, setBreadcrumbWorkspace] = useState<{ id: string; name: string } | null>(null);
  const [breadcrumbGrid, setBreadcrumbGrid] = useState<{ id: string; name: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/studio/sessions/${sessionId}`)
      .then(r => r.json())
      .then(data => {
        setSessionData(data);
        if (data.blackboard) {
          const bb = data.blackboard;
          setSummary({
            intent: bb.intent,
            requirements_status: bb.requirements?.status,
            architecture_status: bb.architecture?.status,
            analysis: {
              overall_readiness_score: bb.analysis?.overall_readiness_score ?? 0,
              adrs_count: bb.analysis?.adrs?.length ?? 0,
              risks_count: bb.analysis?.risks?.length ?? 0,
            },
            pending_assumptions_count: bb.assumptions?.pending?.length ?? 0,
            blocking_conflicts_count: bb.conflicts?.filter((c: { blocking: boolean; resolved: boolean }) => c.blocking && !c.resolved).length ?? 0,
          });
          setAssumptions(bb.assumptions?.pending ?? []);
          setConflicts(bb.conflicts?.filter((c: { resolved: boolean }) => !c.resolved) ?? []);

          // Load breadcrumb data
          if (bb.workspace_id) {
            fetch('/api/studio/workspaces').then(r => r.json()).then(workspaces => {
              const ws = (workspaces as Array<{ id: string; name: string }>).find(w => w.id === bb.workspace_id);
              if (ws) setBreadcrumbWorkspace(ws);
            }).catch(() => {});
          }
          if (bb.grid_id) {
            fetch(`/api/studio/grids/${bb.grid_id}`).then(r => r.ok ? r.json() : null).then(grid => {
              if (grid) setBreadcrumbGrid({ id: grid.id, name: grid.name });
            }).catch(() => {});
          }
        }
      })
      .catch(() => {});
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSending(true);

    // Initialize agent progress
    setAgentProgress(PIPELINE_AGENTS.map(a => ({ agentId: a.id, agentName: a.name, status: 'pending' as const })));

    // Connect to SSE stream
    const es = new EventSource(`/api/studio/sessions/${sessionId}/stream`);
    eventSourceRef.current = es;
    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.type === 'agent_started') {
          setAgentProgress(prev => prev.map(a => a.agentId === data.agentId ? { ...a, status: 'running' as const } : a));
        } else if (data.type === 'agent_completed') {
          setAgentProgress(prev => prev.map(a => a.agentId === data.agentId ? { ...a, status: 'done' as const, durationMs: data.durationMs } : a));
        } else if (data.type === 'agent_failed') {
          setAgentProgress(prev => prev.map(a => a.agentId === data.agentId ? { ...a, status: 'failed' as const } : a));
        } else if (data.type === 'pipeline_complete' || data.type === 'pipeline_blocked') {
          es.close();
          eventSourceRef.current = null;
        }
      } catch { /* ignore parse errors */ }
    };
    es.onerror = () => { es.close(); eventSourceRef.current = null; };

    try {
      const res = await fetch(`/api/studio/sessions/${sessionId}/turns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.blackboard_summary) setSummary(data.blackboard_summary);
        if (data.diagrams) setDiagrams(data.diagrams);

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.blocked
            ? `Generation blocked: ${(data.blockers as string[]).join(', ')}`
            : `Turn ${data.turn_number} complete. Architecture analysis updated.`,
          timestamp: new Date().toISOString(),
          metadata: data.blackboard_summary,
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Failed to process request. This may be due to missing AWS credentials for Bedrock.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
      if (eventSourceRef.current) { eventSourceRef.current.close(); eventSourceRef.current = null; }
    }
  };

  const handleConfirmAssumption = async (assumptionId: string) => {
    const res = await fetch(`/api/studio/sessions/${sessionId}/assumptions/${assumptionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm' }),
    });
    if (res.ok) {
      const data = await res.json();
      setAssumptions(prev => prev.filter(a => a.id !== assumptionId));
      setSummary(prev => ({
        ...prev,
        pending_assumptions_count: data.pending_count_remaining,
        analysis: { ...prev.analysis, overall_readiness_score: data.new_readiness_score },
      }));
    }
  };

  const handleOverrideAssumption = async (assumptionId: string) => {
    if (!overrideValue.trim()) return;
    const res = await fetch(`/api/studio/sessions/${sessionId}/assumptions/${assumptionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'override', override_value: overrideValue }),
    });
    if (res.ok) {
      const data = await res.json();
      setAssumptions(prev => prev.filter(a => a.id !== assumptionId));
      setOverrideId(null);
      setOverrideValue('');
      setSummary(prev => ({
        ...prev,
        pending_assumptions_count: data.pending_count_remaining,
        analysis: { ...prev.analysis, overall_readiness_score: data.new_readiness_score },
      }));
    }
  };

  const handleResolveConflict = async (conflictId: string) => {
    const resolution = conflictResolution[conflictId];
    if (!resolution) return;
    const res = await fetch(`/api/studio/sessions/${sessionId}/conflicts/${conflictId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution }),
    });
    if (res.ok) {
      const data = await res.json();
      setConflicts(prev => prev.filter(c => c.id !== conflictId));
      if (data.generation_unblocked) {
        setSummary(prev => ({ ...prev, blocking_conflicts_count: 0, generation_ready: true }));
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const tier = summary.intent?.criticality_tier ?? 4;
  const readiness = summary.analysis?.overall_readiness_score ?? 0;

  return (
    <div className="-m-6">
      <div className="px-6 pt-4 pb-2">
        <StudioBreadcrumb
          items={[
            { label: 'Studio', href: '/admin/studio' },
            ...(breadcrumbWorkspace ? [{ label: breadcrumbWorkspace.name, href: `/admin/studio/workspace/${breadcrumbWorkspace.id}` }] : []),
            ...(breadcrumbGrid ? [{ label: breadcrumbGrid.name, href: `/admin/studio/grid/${breadcrumbGrid.id}` }] : []),
            { label: 'Session' },
          ]}
        />
      </div>
    <div className="flex h-[calc(100vh-9.5rem)] gap-0">
      {/* Left Panel — Chat */}
      <div className="flex w-3/5 flex-col border-r border-gray-200 dark:border-gray-700">
        {/* Session header */}
        <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            {summary.intent?.domain || 'New Session'}
          </h2>
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${TIER_COLORS[tier] ?? TIER_COLORS[4]}`}>
            Tier {tier}
          </span>
          <span className="rounded bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 text-xs text-blue-700 dark:text-blue-400">
            {readiness}% ready
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-medium text-gray-900 dark:text-white">Welcome to Architecture Studio</p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Describe your architecture challenge to begin.
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Example: &ldquo;Build a digital banking platform for a Philippine bank compliant with BSP&rdquo;
                </p>
              </div>
            </div>
          )}
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
                style={msg.role === 'user' ? { backgroundColor: '#C96330' } : undefined}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.metadata && (
                  <div className="mt-2 border-t border-white/20 pt-2 text-xs opacity-80">
                    Intent: {(msg.metadata as BlackboardSummary).intent?.type ?? 'pending'} &middot;
                    Readiness: {(msg.metadata as BlackboardSummary).analysis?.overall_readiness_score ?? 0}%
                  </div>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-gray-100 dark:bg-gray-700 px-4 py-3 w-full max-w-[80%]">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Agent Pipeline</p>
                <div className="flex flex-wrap gap-1.5">
                  {agentProgress.map(a => (
                    <span key={a.agentId} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                      a.status === 'done' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : a.status === 'running' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : a.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                    }`}>
                      {a.status === 'running' && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />}
                      {a.status === 'done' && <span className="text-green-600">&#10003;</span>}
                      {a.status === 'failed' && <span className="text-red-600">&#10007;</span>}
                      {a.agentName}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your architecture challenge..."
              rows={2}
              className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="self-end rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: '#C96330' }}
            >
              Send
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-400">Shift+Enter for new line, Enter to send</p>
        </div>
      </div>

      {/* Right Panel — Preview */}
      <div className="flex w-2/5 flex-col bg-white dark:bg-gray-800">
        {/* Tab bar */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-2">
          {(['inspector', 'diagrams', 'adrs', 'estimates'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2.5 text-xs font-medium capitalize ${
                activeTab === tab
                  ? 'border-b-2 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}
              style={activeTab === tab ? { borderBottomColor: '#C96330' } : undefined}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'inspector' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Blackboard Status</h3>
              <div className="space-y-2">
                {[
                  { label: 'Intent', status: summary.intent?.type ? 'partial' : 'empty' },
                  { label: 'Requirements', status: summary.requirements_status ?? 'empty' },
                  { label: 'Architecture', status: summary.architecture_status ?? 'empty' },
                  { label: 'Analysis', status: summary.analysis?.overall_readiness_score ? 'partial' : 'empty' },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between rounded bg-gray-50 dark:bg-gray-700/50 px-3 py-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{s.label}</span>
                    <span className={`h-2.5 w-2.5 rounded-full ${
                      s.status === 'validated' ? 'bg-green-500'
                        : s.status === 'complete' ? 'bg-green-400'
                          : s.status === 'partial' ? 'bg-amber-400'
                            : 'bg-gray-300 dark:bg-gray-600'
                    }`} />
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Readiness Score</span>
                  <span className="font-medium text-gray-900 dark:text-white">{readiness}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-600">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${readiness}%` }}
                  />
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Pending Assumptions</span>
                  <span>{summary.pending_assumptions_count ?? 0}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Blocking Conflicts</span>
                  <span className={summary.blocking_conflicts_count ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                    {summary.blocking_conflicts_count ?? 0}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>ADRs</span>
                  <span>{summary.analysis?.adrs_count ?? 0}</span>
                </div>
              </div>

              {/* Pending Assumptions */}
              {assumptions.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Pending Assumptions</h4>
                  <div className="space-y-2">
                    {assumptions.map(a => (
                      <div key={a.id} className="rounded border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-2.5">
                        <p className="text-xs text-gray-800 dark:text-gray-200 mb-1.5">{a.statement}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2">
                          Source: {a.source} &middot; Confidence: {Math.round(a.confidence * 100)}%
                        </p>
                        {overrideId === a.id ? (
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={overrideValue}
                              onChange={e => setOverrideValue(e.target.value)}
                              placeholder="Override value..."
                              className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-xs text-gray-900 dark:text-white"
                            />
                            <button onClick={() => handleOverrideAssumption(a.id)} className="rounded px-2 py-1 text-xs font-medium text-white" style={{ backgroundColor: '#C96330' }}>Save</button>
                            <button onClick={() => { setOverrideId(null); setOverrideValue(''); }} className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
                          </div>
                        ) : (
                          <div className="flex gap-1.5">
                            <button onClick={() => handleConfirmAssumption(a.id)} className="rounded bg-green-100 dark:bg-green-900/30 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400 hover:bg-green-200">Accept</button>
                            <button onClick={() => { setOverrideId(a.id); setOverrideValue(''); }} className="rounded bg-gray-100 dark:bg-gray-700 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200">Override</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unresolved Conflicts */}
              {conflicts.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Unresolved Conflicts</h4>
                  <div className="space-y-2">
                    {conflicts.map(c => (
                      <div key={c.id} className={`rounded border p-2.5 ${c.blocking ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'}`}>
                        {c.blocking && <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">BLOCKING</span>}
                        <p className="text-xs text-gray-800 dark:text-gray-200 mt-0.5">A: {c.fact_a.statement}</p>
                        <p className="text-xs text-gray-800 dark:text-gray-200 mt-0.5">B: {c.fact_b.statement}</p>
                        <div className="mt-2 space-y-1">
                          {c.resolution_options.map((opt, i) => (
                            <label key={i} className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                              <input
                                type="radio"
                                name={`conflict-${c.id}`}
                                value={opt}
                                checked={conflictResolution[c.id] === opt}
                                onChange={() => setConflictResolution(prev => ({ ...prev, [c.id]: opt }))}
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                        <button
                          onClick={() => handleResolveConflict(c.id)}
                          disabled={!conflictResolution[c.id]}
                          className="mt-2 rounded px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                          style={{ backgroundColor: '#C96330' }}
                        >
                          Resolve
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'diagrams' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Diagrams</h3>
              {diagrams.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No diagrams yet. Run the pipeline to generate architecture diagrams.
                </p>
              ) : (
                diagrams.map(d => (
                  <div key={d.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">{d.title}</h4>
                    <pre className="mt-2 overflow-x-auto rounded bg-gray-50 dark:bg-gray-900 p-3 text-xs text-gray-700 dark:text-gray-300">
                      {d.content}
                    </pre>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'adrs' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Architecture Decision Records</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {summary.analysis?.adrs_count
                  ? `${summary.analysis.adrs_count} ADR(s) generated. View in full session data.`
                  : 'No ADRs yet. Run the Tarka Sastra review to generate ADRs.'}
              </p>
            </div>
          )}

          {activeTab === 'estimates' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Estimates</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Run the full pipeline to generate WBS, timeline, and cost estimates.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
