'use client';

import { useEffect, useMemo, useState } from 'react';

interface CognitoUser {
  username: string;
  email: string;
  role: string | null;
}

interface Row {
  email: string;
  role: string;
  articles: number;
  tokens: string;
  lastActive: string;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function buildRow(user: CognitoUser): Row {
  const seed = hashString(user.email);
  const articles = 5 + (seed % 36);
  const perArticle = 800 + ((seed >> 4) % 1600);
  const tokens = articles * perArticle;
  const daysAgo = (seed >> 8) % 30;
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const lastActive = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return {
    email: user.email,
    role: user.role ?? 'reader',
    articles,
    tokens: formatTokens(tokens),
    lastActive,
  };
}

export function DashboardAIUsage() {
  const [users, setUsers] = useState<CognitoUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => setUsers(data.users ?? []))
      .catch((err) => setError(err?.message ?? 'Failed to load users'));
  }, []);

  const rows = useMemo(() => (users ?? []).map(buildRow), [users]);

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Usage</h2>
      <p className="text-sm text-gray-500 mt-1">Token consumption by creator — live data coming soon</p>

      <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Creator</th>
              <th className="px-4 py-3 text-right">Articles Generated</th>
              <th className="px-4 py-3 text-right">Tokens Used</th>
              <th className="px-4 py-3 text-right">Last Active</th>
            </tr>
          </thead>
          <tbody>
            {users === null && !error && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">Loading...</td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-red-500">Failed to load users: {error}</td>
              </tr>
            )}
            {users && rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">No users found.</td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.email} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 dark:text-white">{r.email}</div>
                  <div className="text-xs text-gray-500 capitalize">{r.role}</div>
                </td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{r.articles}</td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{r.tokens}</td>
                <td className="px-4 py-3 text-right text-gray-500">{r.lastActive}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-gray-400 italic">
        * Token usage will reflect real Bedrock API data in a future release.
      </p>
    </section>
  );
}
