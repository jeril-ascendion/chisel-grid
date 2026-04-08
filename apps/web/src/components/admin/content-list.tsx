'use client';

import { useState, useEffect } from 'react';
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

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  in_review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  published: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

const filterOptions = ['all', 'draft', 'in_review', 'approved', 'published', 'rejected'];

export function ContentList() {
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/content?status=${filter}`)
      .then((r) => r.json())
      .then((data) => setItems(data.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {filterOptions.map((s) => (
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
            {loading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No articles found</td></tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.title}</td>
                <td className="px-4 py-3">
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusColors[item.status])}>
                    {item.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{item.author}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{item.category || '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(item.updatedAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/content/${item.id}/edit`}
                    className="text-blue-600 hover:underline text-xs font-medium"
                  >
                    {item.status === 'rejected' ? 'Edit & Resubmit' : 'Edit'}
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
