'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  articleCount: number;
}

const mockCategories: Category[] = [
  { id: '1', name: 'Cloud & Infrastructure', slug: 'cloud-infrastructure', parentId: null, sortOrder: 0, articleCount: 12 },
  { id: '1a', name: 'AWS', slug: 'aws', parentId: '1', sortOrder: 0, articleCount: 5 },
  { id: '1b', name: 'Kubernetes', slug: 'kubernetes', parentId: '1', sortOrder: 1, articleCount: 4 },
  { id: '1c', name: 'Infrastructure as Code', slug: 'iac', parentId: '1', sortOrder: 2, articleCount: 3 },
  { id: '2', name: 'AI & Machine Learning', slug: 'ai-ml', parentId: null, sortOrder: 1, articleCount: 8 },
  { id: '2a', name: 'Generative AI', slug: 'genai', parentId: '2', sortOrder: 0, articleCount: 4 },
  { id: '2b', name: 'ML Engineering', slug: 'ml-engineering', parentId: '2', sortOrder: 1, articleCount: 4 },
  { id: '3', name: 'Software Engineering', slug: 'software-engineering', parentId: null, sortOrder: 2, articleCount: 15 },
  { id: '4', name: 'Data & Analytics', slug: 'data-analytics', parentId: null, sortOrder: 3, articleCount: 6 },
  { id: '5', name: 'DevOps & Platform', slug: 'devops-platform', parentId: null, sortOrder: 4, articleCount: 9 },
  { id: '6', name: 'Security & Compliance', slug: 'security-compliance', parentId: null, sortOrder: 5, articleCount: 4 },
];

export function CategoryManagement() {
  const [categories, setCategories] = useState(mockCategories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const topLevel = categories.filter((c) => c.parentId === null).sort((a, b) => a.sortOrder - b.sortOrder);

  const getChildren = (parentId: string) =>
    categories.filter((c) => c.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const saveEdit = (id: string) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, name: editName, slug: editName.toLowerCase().replace(/[^a-z0-9]+/g, '-') }
          : c,
      ),
    );
    setEditingId(null);
    // TODO: Call API
  };

  const moveCategory = (id: string, direction: 'up' | 'down') => {
    setCategories((prev) => {
      const cat = prev.find((c) => c.id === id);
      if (!cat) return prev;
      const siblings = prev
        .filter((c) => c.parentId === cat.parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const idx = siblings.findIndex((c) => c.id === id);
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      const swap = siblings[swapIdx];
      if (!swap) return prev;
      return prev.map((c) => {
        if (c.id === id) return { ...c, sortOrder: swap.sortOrder };
        if (c.id === swap.id) return { ...c, sortOrder: cat.sortOrder };
        return c;
      });
    });
  };

  return (
    <div className="space-y-4">
      {topLevel.map((parent) => (
        <div key={parent.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveCategory(parent.id, 'up')} className="text-gray-400 hover:text-gray-600">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6"/></svg>
                </button>
                <button onClick={() => moveCategory(parent.id, 'down')} className="text-gray-400 hover:text-gray-600">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                </button>
              </div>
              {editingId === parent.id ? (
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit(parent.id)}
                  onBlur={() => saveEdit(parent.id)}
                  className="border rounded px-2 py-1 text-sm font-semibold"
                  autoFocus
                />
              ) : (
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{parent.name}</span>
              )}
              <span className="text-xs text-gray-400 font-mono">/{parent.slug}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{parent.articleCount} articles</span>
              <button
                onClick={() => startEdit(parent)}
                className="text-xs text-blue-600 hover:underline"
              >
                Edit
              </button>
            </div>
          </div>

          {getChildren(parent.id).length > 0 && (
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {getChildren(parent.id).map((child) => (
                <div key={child.id} className="flex items-center justify-between px-4 py-2 pl-12">
                  <div className="flex items-center gap-2">
                    {editingId === child.id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit(child.id)}
                        onBlur={() => saveEdit(child.id)}
                        className="border rounded px-2 py-1 text-sm"
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm text-gray-700 dark:text-gray-300">{child.name}</span>
                    )}
                    <span className="text-xs text-gray-400 font-mono">/{child.slug}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{child.articleCount}</span>
                    <button onClick={() => startEdit(child)} className="text-xs text-blue-600 hover:underline">
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
