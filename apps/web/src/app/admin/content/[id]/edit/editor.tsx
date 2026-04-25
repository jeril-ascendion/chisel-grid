'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import type { ContentBlock, ContentType } from '@chiselgrid/types';
import { RelatedContent } from '@/components/grid/RelatedContent';
import { CONTENT_TYPE_OPTIONS } from '@/lib/content-types';

interface ArticleData {
  contentId: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  contentType: ContentType;
  blocks: ContentBlock[];
  categorySlug: string;
  categoryName: string;
  tags: { name: string; slug: string }[];
  readTimeMinutes: number;
  authorName: string;
}

export function EditArticleEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('draft');
  const [contentType, setContentType] = useState<ContentType>('article');
  const [categorySlug, setCategorySlug] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [readTime, setReadTime] = useState(5);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/content/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data: ArticleData) => {
        setArticle(data);
        setTitle(data.title);
        setDescription(data.description);
        setStatus(data.status);
        setContentType((data.contentType ?? 'article') as ContentType);
        setCategorySlug(data.categorySlug);
        setTagsInput(data.tags.map((t) => t.name).join(', '));
        setReadTime(data.readTimeMinutes);
        setBlocks(data.blocks);
      })
      .catch(() => setArticle(null))
      .finally(() => setLoading(false));
  }, [id]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/content/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, status, contentType, categorySlug, tags: tagsInput, readTimeMinutes: readTime, blocks }),
      });
      if (res.ok) showToast('Article saved successfully');
      else showToast('Failed to save');
    } catch {
      showToast('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus);
    setSaving(true);
    try {
      const res = await fetch(`/api/content/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, status: newStatus, contentType, categorySlug, tags: tagsInput, readTimeMinutes: readTime, blocks }),
      });
      if (res.ok) {
        showToast(`Status changed to ${newStatus}`);
        if (newStatus === 'approved' || newStatus === 'published') {
          router.push('/admin/queue');
        }
      } else {
        showToast('Failed to update status');
      }
    } catch {
      showToast('Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const handleResubmit = async () => {
    setSaving(true);
    try {
      // Save edits first
      await fetch(`/api/content/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, status: 'in_review', contentType, categorySlug, tags: tagsInput, readTimeMinutes: readTime, blocks }),
      });
      // Change status back to in_review
      const res = await fetch('/api/admin/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: id, action: 'resubmit' }),
      });
      if (res.ok) {
        showToast('Resubmitted for review');
        router.push('/admin/queue');
      } else {
        showToast('Failed to resubmit');
      }
    } catch {
      showToast('Failed to resubmit');
    } finally {
      setSaving(false);
    }
  };

  const updateBlock = (index: number, field: string, value: string | number) => {
    setBlocks((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b))
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-gray-500">Loading article...</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="text-lg font-medium text-gray-900 dark:text-white">Article not found</div>
        <button onClick={() => router.push('/admin/queue')} className="text-sm text-indigo-600 hover:underline">
          Back to Queue
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-green-600 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      {status === 'rejected' && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4">
          <strong className="text-red-700 dark:text-red-400">This article was rejected.</strong>
          <span className="text-red-600 dark:text-red-300 ml-1">Make your edits and click Resubmit for Review.</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Article</h1>
          <p className="text-sm text-gray-500 mt-1">ID: {id}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/admin/queue')}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          {status === 'rejected' && (
            <button
              onClick={handleResubmit}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Resubmitting...' : 'Resubmit for Review'}
            </button>
          )}
          {status !== 'approved' && status !== 'rejected' && (
            <button
              onClick={() => handleStatusChange('approved')}
              disabled={saving}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              Approve
            </button>
          )}
          {status !== 'published' && status !== 'rejected' && (
            <button
              onClick={() => handleStatusChange('published')}
              disabled={saving}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              Publish
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Meta row */}
      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value as ContentType)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            {CONTENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
          <input
            type="text"
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="draft">Draft</option>
            <option value="in_review">In Review</option>
            <option value="approved">Approved</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Read Time (min)</label>
          <input
            type="number"
            value={readTime}
            onChange={(e) => setReadTime(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (comma separated)</label>
        <input
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Content Blocks */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Content Blocks</h2>
        <div className="space-y-4">
          {blocks.map((block, index) => (
            <div key={index} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                  {block.type}
                  {block.type === 'heading' && ` (H${block.level})`}
                  {block.type === 'code' && ` — ${block.language}`}
                  {block.type === 'callout' && ` — ${block.variant}`}
                  {block.type === 'diagram' && ` — ${block.diagramType}`}
                </span>
              </div>

              {block.type === 'heading' && (
                <input
                  type="text"
                  value={block.content}
                  onChange={(e) => updateBlock(index, 'content', e.target.value)}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm font-semibold text-gray-900 dark:text-white"
                />
              )}

              {block.type === 'text' && (
                <textarea
                  value={block.content}
                  onChange={(e) => updateBlock(index, 'content', e.target.value)}
                  rows={4}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                />
              )}

              {block.type === 'code' && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={block.language}
                    onChange={(e) => updateBlock(index, 'language', e.target.value)}
                    placeholder="Language"
                    className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1 text-xs text-gray-700 dark:text-gray-300"
                  />
                  <textarea
                    value={block.content}
                    onChange={(e) => updateBlock(index, 'content', e.target.value)}
                    rows={6}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-1.5 font-mono text-sm text-gray-900 dark:text-white"
                  />
                </div>
              )}

              {block.type === 'callout' && (
                <textarea
                  value={block.content}
                  onChange={(e) => updateBlock(index, 'content', e.target.value)}
                  rows={3}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-900 dark:text-white"
                />
              )}

              {block.type === 'diagram' && (
                <textarea
                  value={block.content}
                  onChange={(e) => updateBlock(index, 'content', e.target.value)}
                  rows={6}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-1.5 font-mono text-sm text-gray-900 dark:text-white"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <RelatedContent ownerId={id} ownerType="article" />
    </div>
  );
}
