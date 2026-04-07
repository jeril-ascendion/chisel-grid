'use client';

import { cn } from '@/lib/utils';

interface StatusCount {
  status: string;
  label: string;
  count: number;
  color: string;
}

// TODO: Replace hardcoded counts with real DB queries from /api/content/stats
const statuses: StatusCount[] = [
  { status: 'draft', label: 'Drafts', count: 12, color: 'bg-gray-100 text-gray-700 border-gray-200' },
  { status: 'submitted', label: 'Submitted', count: 3, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { status: 'in_review', label: 'In Review', count: 5, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { status: 'approved', label: 'Approved', count: 2, color: 'bg-green-50 text-green-700 border-green-200' },
  { status: 'published', label: 'Published', count: 47, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { status: 'deprecated', label: 'Deprecated', count: 4, color: 'bg-red-50 text-red-700 border-red-200' },
];

export function ContentStatusBoard() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Content Status</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {statuses.map((s) => (
          <div
            key={s.status}
            className={cn(
              'rounded-xl border p-4 transition-shadow hover:shadow-md cursor-pointer',
              s.color,
            )}
          >
            <div className="text-3xl font-bold">{s.count}</div>
            <div className="mt-1 text-sm font-medium">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
