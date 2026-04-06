'use client';

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type Tab = 'readers' | 'content' | 'creators' | 'ai';

// Mock data
const dailyTraffic = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - 29 + i);
  return {
    date: date.toISOString().slice(5, 10),
    pageviews: 1200 + Math.floor(Math.random() * 800),
    uniqueVisitors: 400 + Math.floor(Math.random() * 300),
  };
});

const topArticles = [
  { title: 'Getting Started with Kubernetes', views: 3420, readTime: 8.5, audioRate: 23 },
  { title: 'AWS Lambda Best Practices', views: 2890, readTime: 12.3, audioRate: 18 },
  { title: 'React Server Components', views: 2340, readTime: 10.1, audioRate: 31 },
  { title: 'TypeScript Advanced Patterns', views: 1980, readTime: 15.2, audioRate: 12 },
  { title: 'CI/CD Pipeline Design', views: 1560, readTime: 9.8, audioRate: 25 },
];

const geoData = [
  { name: 'Singapore', value: 35 },
  { name: 'India', value: 25 },
  { name: 'Japan', value: 15 },
  { name: 'USA', value: 15 },
  { name: 'UK', value: 10 },
];

const creatorData = [
  { name: 'Alice C.', submitted: 18, approved: 15, score: 88 },
  { name: 'Bob W.', submitted: 12, approved: 10, score: 82 },
  { name: 'Carol L.', submitted: 8, approved: 7, score: 91 },
  { name: 'David K.', submitted: 6, approved: 5, score: 79 },
  { name: 'Eva M.', submitted: 4, approved: 4, score: 86 },
];

const aiDailyData = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - 29 + i);
  const runs = 2 + Math.floor(Math.random() * 4);
  return {
    date: date.toISOString().slice(5, 10),
    pipelineRuns: runs,
    tokensK: Math.floor(runs * 14 + Math.random() * 10),
    costUsd: parseFloat((runs * 0.054 + Math.random() * 0.02).toFixed(3)),
    qualityScore: 80 + Math.floor(Math.random() * 15),
  };
});

const agentBreakdown = [
  { agent: 'Writer', tokens: 680, cost: 2.04, color: '#3B82F6' },
  { agent: 'Reviewer', tokens: 290, cost: 0.87, color: '#8B5CF6' },
  { agent: 'SEO', tokens: 178, cost: 0.53, color: '#F59E0B' },
  { agent: 'Diagram', tokens: 68, cost: 0.20, color: '#10B981' },
  { agent: 'Audio', tokens: 0, cost: 1.18, color: '#EF4444' },
];

const COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444'];

function StatCard({ label, value, subtext }: { label: string; value: string; subtext?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      {subtext && <div className="text-xs text-gray-400 mt-0.5">{subtext}</div>}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('readers');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  const tabs = [
    { id: 'readers' as const, label: 'Readers' },
    { id: 'content' as const, label: 'Content' },
    { id: 'creators' as const, label: 'Creators' },
    { id: 'ai' as const, label: 'AI Pipeline' },
  ];

  const handleExportCsv = () => {
    // Generate CSV from current tab data
    let csv = '';
    if (activeTab === 'readers') {
      csv = 'Date,Pageviews,Unique Visitors\n';
      dailyTraffic.forEach((d) => {
        csv += `${d.date},${d.pageviews},${d.uniqueVisitors}\n`;
      });
    } else if (activeTab === 'ai') {
      csv = 'Date,Pipeline Runs,Tokens (K),Cost (USD),Quality Score\n';
      aiDailyData.forEach((d) => {
        csv += `${d.date},${d.pipelineRuns},${d.tokensK},${d.costUsd},${d.qualityScore}\n`;
      });
    }

    if (csv) {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chiselgrid-${activeTab}-analytics.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">Track reader engagement, content performance, and AI costs.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date Range Picker */}
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 text-xs font-medium ${
                  dateRange === range
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <button
            onClick={handleExportCsv}
            className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Readers Tab */}
      {activeTab === 'readers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard label="Total Pageviews" value="45,230" subtext="+12% vs prev period" />
            <StatCard label="Unique Visitors" value="12,340" subtext="+8% vs prev period" />
            <StatCard label="Avg Load Time" value="142ms" subtext="-8ms vs prev period" />
            <StatCard label="Bandwidth" value="2.3 GB" />
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Daily Traffic</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyTraffic}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="pageviews" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.1} name="Pageviews" />
                <Area type="monotone" dataKey="uniqueVisitors" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.1} name="Unique Visitors" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Top Articles</h3>
              <div className="space-y-3">
                {topArticles.map((article, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-400 w-5">#{i + 1}</span>
                      <span className="text-sm text-gray-900 dark:text-white truncate max-w-[250px]">{article.title}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{article.views.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Geographic Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={geoData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name} ${value}%`}>
                    {geoData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard label="Total Articles" value="247" />
            <StatCard label="Avg Read Time" value="9.2 min" />
            <StatCard label="Audio Play Rate" value="21%" />
            <StatCard label="Avg Bounce Rate" value="32%" />
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Article Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topArticles}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="title" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="views" fill="#3B82F6" name="Views" />
                <Bar dataKey="audioRate" fill="#8B5CF6" name="Audio Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Top Search Queries</h3>
            <div className="space-y-2">
              {[
                { query: 'kubernetes deployment', count: 340 },
                { query: 'lambda cold start', count: 280 },
                { query: 'react server components', count: 210 },
                { query: 'typescript generics', count: 180 },
                { query: 'ci/cd pipeline', count: 150 },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.query}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 rounded-full bg-blue-200 dark:bg-blue-900" style={{ width: `${(item.count / 340) * 100}px` }}>
                      <div className="h-1.5 rounded-full bg-blue-500" style={{ width: '100%' }} />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Creators Tab */}
      {activeTab === 'creators' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard label="Active Creators" value="5" />
            <StatCard label="Avg Approval Rate" value="85%" />
            <StatCard label="Avg Quality Score" value="86.3" />
            <StatCard label="Articles This Month" value="48" />
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Creator Leaderboard</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={creatorData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                <Tooltip />
                <Legend />
                <Bar dataKey="submitted" fill="#3B82F6" name="Submitted" />
                <Bar dataKey="approved" fill="#10B981" name="Approved" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Quality Scores</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-2 text-left font-medium text-gray-500">Creator</th>
                    <th className="pb-2 text-right font-medium text-gray-500">Score</th>
                    <th className="pb-2 text-right font-medium text-gray-500">Articles</th>
                    <th className="pb-2 text-right font-medium text-gray-500">Approval %</th>
                  </tr>
                </thead>
                <tbody>
                  {creatorData.map((creator, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50">
                      <td className="py-2 text-gray-900 dark:text-white">{creator.name}</td>
                      <td className="py-2 text-right">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          creator.score >= 85
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                        }`}>
                          {creator.score}
                        </span>
                      </td>
                      <td className="py-2 text-right text-gray-600 dark:text-gray-400">{creator.submitted}</td>
                      <td className="py-2 text-right text-gray-600 dark:text-gray-400">
                        {Math.round((creator.approved / creator.submitted) * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* AI Pipeline Tab */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard label="Total Cost" value="$4.82" subtext="This month" />
            <StatCard label="Pipeline Runs" value="89" />
            <StatCard label="Avg Cost/Article" value="$0.054" />
            <StatCard label="Avg Quality" value="86.3" />
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Daily AI Usage</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={aiDailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="tokensK" stroke="#3B82F6" name="Tokens (K)" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="qualityScore" stroke="#10B981" name="Quality Score" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Cost by Agent</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={agentBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="cost" nameKey="agent" label>
                    {agentBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Agent Performance</h3>
              <div className="space-y-3">
                {agentBreakdown.map((agent) => (
                  <div key={agent.agent} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: agent.color }} />
                      <span className="text-sm text-gray-900 dark:text-white">{agent.agent}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{agent.tokens}K tokens</div>
                      <div className="text-xs text-gray-500">${agent.cost.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Pipeline Metrics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">42s</div>
                <div className="text-xs text-gray-500">Avg Generation Time</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">35%</div>
                <div className="text-xs text-gray-500">Revision Rate</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">1.4</div>
                <div className="text-xs text-gray-500">Avg Revisions/Article</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">92%</div>
                <div className="text-xs text-gray-500">Human Approval Rate</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
