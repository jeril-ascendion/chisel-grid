'use client';

import { cn } from '@/lib/utils';

interface AgentUsage {
  agent: string;
  inputTokens: number;
  outputTokens: number;
  requests: number;
  estimatedCost: number;
}

interface CreatorUsage {
  name: string;
  email: string;
  articles: number;
  totalTokens: number;
  estimatedCost: number;
}

interface DailyTrend {
  date: string;
  tokens: number;
  cost: number;
}

const agentUsage: AgentUsage[] = [
  { agent: 'Writer', inputTokens: 125000, outputTokens: 450000, requests: 48, estimatedCost: 3.45 },
  { agent: 'Reviewer', inputTokens: 380000, outputTokens: 95000, requests: 52, estimatedCost: 2.85 },
  { agent: 'SEO', inputTokens: 190000, outputTokens: 38000, requests: 45, estimatedCost: 1.37 },
  { agent: 'Diagram', inputTokens: 45000, outputTokens: 22000, requests: 18, estimatedCost: 0.40 },
];

const creatorUsage: CreatorUsage[] = [
  { name: 'Alice Chen', email: 'alice@ascendion.com', articles: 12, totalTokens: 450000, estimatedCost: 2.70 },
  { name: 'Bob Patel', email: 'bob@ascendion.com', articles: 8, totalTokens: 320000, estimatedCost: 1.92 },
  { name: 'Carol Davis', email: 'carol@ascendion.com', articles: 15, totalTokens: 580000, estimatedCost: 3.48 },
  { name: 'Dave Kim', email: 'dave@ascendion.com', articles: 5, totalTokens: 180000, estimatedCost: 1.08 },
];

const dailyTrend: DailyTrend[] = [
  { date: '2026-03-31', tokens: 120000, cost: 0.72 },
  { date: '2026-04-01', tokens: 185000, cost: 1.11 },
  { date: '2026-04-02', tokens: 95000, cost: 0.57 },
  { date: '2026-04-03', tokens: 210000, cost: 1.26 },
  { date: '2026-04-04', tokens: 175000, cost: 1.05 },
  { date: '2026-04-05', tokens: 240000, cost: 1.44 },
  { date: '2026-04-06', tokens: 160000, cost: 0.96 },
];

const totalCost = agentUsage.reduce((sum, a) => sum + a.estimatedCost, 0);
const totalTokens = agentUsage.reduce((sum, a) => sum + a.inputTokens + a.outputTokens, 0);
const totalRequests = agentUsage.reduce((sum, a) => sum + a.requests, 0);

export function AIUsagePanel() {
  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Total Tokens" value={formatNumber(totalTokens)} subtext="This month" />
        <SummaryCard label="Estimated Cost" value={`$${totalCost.toFixed(2)}`} subtext="Bedrock pricing" />
        <SummaryCard label="AI Requests" value={String(totalRequests)} subtext="Across all agents" />
      </div>

      {/* Agent breakdown */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Usage by Agent</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-900/50">
              <th className="px-4 py-2 text-left font-medium text-gray-500">Agent</th>
              <th className="px-4 py-2 text-right font-medium text-gray-500">Input Tokens</th>
              <th className="px-4 py-2 text-right font-medium text-gray-500">Output Tokens</th>
              <th className="px-4 py-2 text-right font-medium text-gray-500">Requests</th>
              <th className="px-4 py-2 text-right font-medium text-gray-500">Est. Cost</th>
            </tr>
          </thead>
          <tbody>
            {agentUsage.map((a) => (
              <tr key={a.agent} className="border-b border-gray-100 dark:border-gray-700/50">
                <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{a.agent}</td>
                <td className="px-4 py-2 text-right text-gray-600 tabular-nums">{formatNumber(a.inputTokens)}</td>
                <td className="px-4 py-2 text-right text-gray-600 tabular-nums">{formatNumber(a.outputTokens)}</td>
                <td className="px-4 py-2 text-right text-gray-600 tabular-nums">{a.requests}</td>
                <td className="px-4 py-2 text-right font-medium tabular-nums">${a.estimatedCost.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Daily trend (bar chart visualization) */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Daily Token Usage (7 days)</h3>
        <div className="flex items-end gap-2 h-40">
          {dailyTrend.map((d) => {
            const maxTokens = Math.max(...dailyTrend.map((t) => t.tokens));
            const height = (d.tokens / maxTokens) * 100;
            return (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] text-gray-500 tabular-nums">{formatNumber(d.tokens)}</span>
                <div
                  className="w-full rounded-t-md bg-blue-500 transition-all hover:bg-blue-600"
                  style={{ height: `${height}%` }}
                  title={`${d.date}: ${formatNumber(d.tokens)} tokens ($${d.cost.toFixed(2)})`}
                />
                <span className="text-[10px] text-gray-400">
                  {new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-creator usage */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Usage by Creator</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-900/50">
              <th className="px-4 py-2 text-left font-medium text-gray-500">Creator</th>
              <th className="px-4 py-2 text-right font-medium text-gray-500">Articles</th>
              <th className="px-4 py-2 text-right font-medium text-gray-500">Total Tokens</th>
              <th className="px-4 py-2 text-right font-medium text-gray-500">Est. Cost</th>
            </tr>
          </thead>
          <tbody>
            {creatorUsage.map((c) => (
              <tr key={c.email} className="border-b border-gray-100 dark:border-gray-700/50">
                <td className="px-4 py-2">
                  <div className="font-medium text-gray-900 dark:text-white">{c.name}</div>
                  <div className="text-xs text-gray-500">{c.email}</div>
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{c.articles}</td>
                <td className="px-4 py-2 text-right text-gray-600 tabular-nums">{formatNumber(c.totalTokens)}</td>
                <td className="px-4 py-2 text-right font-medium tabular-nums">${c.estimatedCost.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, subtext }: { label: string; value: string; subtext: string }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="mt-1 text-xs text-gray-400">{subtext}</div>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}
