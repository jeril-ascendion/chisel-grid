'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface StatusConfig {
  status: string;
  label: string;
  color: string;
}

const statusConfigs: StatusConfig[] = [
  { status: 'draft', label: 'Drafts', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  { status: 'in_review', label: 'In Review', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { status: 'approved', label: 'Approved', color: 'bg-green-50 text-green-700 border-green-200' },
  { status: 'published', label: 'Published', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { status: 'rejected', label: 'Rejected', color: 'bg-red-50 text-red-700 border-red-200' },
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
