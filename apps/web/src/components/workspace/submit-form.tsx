'use client';

import { useState } from 'react';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { cn } from '@/lib/utils';

export function SubmitForm() {
  const blocks = useWorkspaceStore((s) => s.blocks);
  const title = useWorkspaceStore((s) => s.title);
  const slug = useWorkspaceStore((s) => s.slug);
  const categoryId = useWorkspaceStore((s) => s.categoryId);
  const tags = useWorkspaceStore((s) => s.tags);
  const setTitle = useWorkspaceStore((s) => s.setTitle);
  const setSlug = useWorkspaceStore((s) => s.setSlug);
  const setCategoryId = useWorkspaceStore((s) => s.setCategoryId);
  const setTags = useWorkspaceStore((s) => s.setTags);
  const pipelineStatus = useWorkspaceStore((s) => s.pipelineStatus);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [showForm, setShowForm] = useState(false);

  if (blocks.length === 0) return null;

  const handleSubmit = async (action: 'draft' | 'submit') => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/workspace/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          categoryId: categoryId || undefined,
          tags,
          blocks,
          action,
        }),
      });

      if (!res.ok) throw new Error(`Failed: ${res.status}`);
    } catch {
      // Error handling via store
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput('');
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      {!showForm ? (
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-xs text-gray-500">{blocks.length} blocks ready</span>
          <button
            onClick={() => setShowForm(true)}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Prepare to Submit
          </button>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Article title"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-1.5 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="article-slug"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-1.5 text-sm outline-none"
            >
              <option value="">Select category...</option>
              <option value="cloud-infrastructure">Cloud & Infrastructure</option>
              <option value="ai-ml">AI & Machine Learning</option>
              <option value="software-engineering">Software Engineering</option>
              <option value="data-analytics">Data & Analytics</option>
              <option value="devops-platform">DevOps & Platform</option>
              <option value="security-compliance">Security & Compliance</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tags</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-1.5 text-sm outline-none"
                placeholder="Add tag..."
              />
              <button onClick={addTag} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs">
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs text-blue-700 dark:text-blue-400"
                  >
                    {tag}
                    <button
                      onClick={() => setTags(tags.filter((t) => t !== tag))}
                      className="hover:text-red-500"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-1.5 text-sm text-gray-600 dark:text-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSubmit('draft')}
              disabled={isSubmitting || !title}
              className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-1.5 text-sm font-medium disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              onClick={() => handleSubmit('submit')}
              disabled={isSubmitting || !title || !slug}
              className="rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              Submit for Review
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
