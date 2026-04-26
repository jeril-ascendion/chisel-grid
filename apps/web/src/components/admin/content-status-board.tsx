'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface StatusConfig {
  status: string;
  label: string;
  color: string;
}

const statusConfigs: StatusConfig[] = [
  { status: 'draft', label: 'Drafts', color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700' },
  { status: 'in_review', label: 'In Review', color: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/40' },
  { status: 'approved', label: 'Approved', color: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/40' },
  { status: 'published', label: 'Published', color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40' },
  { status: 'rejected', label: 'Rejected', color: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/40' },
];

export function ContentStatusBoard() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((data) => setCounts(data))
      .catch(() => {});
  }, []);

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Content Status</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {statusConfigs.map((s) => (
          <div
            key={s.status}
            className={cn(
              'rounded-xl border p-4 transition-shadow hover:shadow-md cursor-pointer',
              s.color,
            )}
          >
            <div className="text-3xl font-bold">{counts[s.status] ?? 0}</div>
            <div className="mt-1 text-sm font-medium">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
