'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface TopNode {
  id: string;
  title: string;
  timesReferenced: number;
}

interface GraphResponse {
  nodes: Array<{
    id: string;
    title: string;
    type: string;
    timesReferenced: number;
  }>;
}

export function DashboardKnowledgeGraph() {
  const [items, setItems] = useState<TopNode[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/knowledge-graph?type=article&limit=50')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: GraphResponse | null) => {
        if (cancelled || !data) {
          setLoaded(true);
          return;
        }
        const top = data.nodes
          .filter((n) => n.timesReferenced > 0)
          .sort((a, b) => b.timesReferenced - a.timesReferenced)
          .slice(0, 5)
          .map((n) => ({
            id: n.id,
            title: n.title,
            timesReferenced: n.timesReferenced,
          }));
        setItems(top);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded || items.length === 0) return null;

  const max = items[0]?.timesReferenced ?? 1;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Knowledge Graph
        </h2>
        <Link
          href="/admin/knowledge-graph"
          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          View full graph →
        </Link>
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
          Top {items.length} most referenced articles
        </div>
        <ul className="space-y-2.5">
          {items.map((item) => {
            const pct = Math.max(8, Math.round((item.timesReferenced / max) * 100));
            return (
              <li key={item.id}>
                <Link
                  href={`/admin/content/${item.id}`}
                  className="group block"
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="truncate text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {item.title}
                    </span>
                    <span className="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
                      {item.timesReferenced}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
