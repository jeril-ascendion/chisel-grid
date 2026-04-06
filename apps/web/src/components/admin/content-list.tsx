'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface ContentItem {
  id: string;
  title: string;
  status: string;
  author: string;
  category: string;
  updatedAt: string;
  publishedAt: string | null;
}

const mockContent: ContentItem[] = [
  { id: '1', title: 'Building Scalable Microservices with gRPC', status: 'published', author: 'Alice', category: 'Software Engineering', updatedAt: '2026-04-01', publishedAt: '2026-04-01' },
  { id: '2', title: 'Zero Trust Architecture', status: 'in_review', author: 'Bob', category: 'Security', updatedAt: '2026-04-05', publishedAt: null },
  { id: '3', title: 'MLOps Pipeline Best Practices', status: 'draft', author: 'Carol', category: 'AI & ML', updatedAt: '2026-04-04', publishedAt: null },
  { id: '4', title: 'AWS CDK Advanced Patterns', status: 'published', author: 'Dave', category: 'Cloud', updatedAt: '2026-03-28', publishedAt: '2026-03-28' },
  { id: '5', title: 'Kubernetes Observability', status: 'approved', author: 'Eve', category: 'DevOps', updatedAt: '2026-04-03', publishedAt: null },
];

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  in_review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  published: 'bg-emerald-100 text-emerald-700',
  deprecated: 'bg-red-100 text-red-700',
  rejected: 'bg-red-100 text-red-700',
};

export function ContentList() {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? mockContent : mockContent.filter((c) => c.status === filter);

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {['all', 'draft', 'in_review', 'approved', 'published', 'deprecated'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              filter === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200',
            )}
          >
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <th className="px-4 py-3 text-left font-medium text-gray-500">Title</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Author</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Category</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Updated</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.title}</td>
                <td className="px-4 py-3">
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusColors[item.status])}>
                    {item.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{item.author}</td>
                <td className="px-4 py-3 text-gray-500">{item.category}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{item.updatedAt}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/content/${item.id}/edit`}
                    className="text-blue-600 hover:underline text-xs font-medium"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
