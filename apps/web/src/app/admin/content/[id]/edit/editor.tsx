'use client';

import { useEffect, useMemo, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { ContentBlock, ContentType } from '@chiselgrid/types';
import { RelatedContent } from '@/components/grid/RelatedContent';
import { CONTENT_TYPE_OPTIONS } from '@/lib/content-types';
import { useUserRole } from '@/hooks/use-user-role';

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
  version?: string;
  rejectionReason?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  in_review: 'In Review',
  approved: 'Approved',
  published: 'Published',
  archived: 'Archived',
  rejected: 'Rejected',
  deprecated: 'Deprecated',
};

export function EditArticleEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const role = useUserRole();
  const { data: session } = useSession();
  const currentEmail = session?.user?.email ?? '';

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

  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

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

  const isAdmin = role === 'admin';
  const isOwner = !!article && article.authorName === currentEmail;
  const isCreatorOwner = role === 'creator' && isOwner;
  // Editing is allowed for admins, and for creator-owners while the
  // article is in a state they can act on (draft or rejected).
  const canEdit = isAdmin || (isCreatorOwner && (status === 'draft' || status === 'rejected'));
  const canSubmitForReview = canEdit && (status === 'draft' || status === 'rejected');
  const canApprove = isAdmin && (status === 'submitted' || status === 'in_review');
  const canReject = isAdmin && (status === 'submitted' || status === 'in_review');
  const canStartReview = isAdmin && status === 'submitted';
  const canPublish = isAdmin && status === 'approved';
  const canArchive = isAdmin && status === 'published';
  const isReadOnly = !canEdit;

  const statusBadgeClass = useMemo(() => {
    switch (status) {
      case 'draft': return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
      case 'submitted': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'in_review': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
      case 'approved': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'published': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
      case 'rejected': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  }, [status]);

  const saveDraft = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/content/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, description, status, contentType, categorySlug,
          tags: tagsInput, readTimeMinutes: readTime, blocks,
        }),
      });
      if (res.ok) showToast('Draft saved');
      else showToast('Failed to save');
    } catch {
      showToast('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const transitionStatus = async (next: string, body?: Record<string, unknown>) => {
    setSaving(true);
    try {
      // Save current edits first when allowed.
      if (canEdit) {
        await fetch(`/api/content/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title, description, status, contentType, categorySlug,
            tags: tagsInput, readTimeMinutes: readTime, blocks,
          }),
        });
      }
      const res = await fetch(`/api/content/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next, ...body }),
      });
      if (res.ok) {
        setStatus(next);
        showToast(`Status changed to ${STATUS_LABELS[next] ?? next}`);
        return true;
      }
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      showToast(err.error ?? 'Failed to update status');
      return false;
    } catch {
      showToast('Failed to update status');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const submitForReview = async () => {
    setShowSubmitConfirm(false);
    if (status === 'rejected') {
      // Rejected → draft (clears rejection reason) → submitted.
      const ok1 = await transitionStatus('draft');
      if (ok1) await transitionStatus('submitted');
    } else {
      await transitionStatus('submitted');
    }
  };

  const submitReject = async () => {
    if (!rejectReason.trim()) return;
    const ok = await transitionStatus('rejected', { rejectionReason: rejectReason.trim() });
    if (ok) {
      setShowRejectModal(false);
      setRejectReason('');
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
        <button onClick={() => router.push('/admin/content')} className="text-sm text-indigo-600 hover:underline">
          Back to Content
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-gray-900 dark:bg-gray-700 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      {status === 'rejected' && article.rejectionReason && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4">
          <strong className="text-red-700 dark:text-red-400">Rejected.</strong>
          <p className="mt-1 text-sm text-red-600 dark:text-red-300">{article.rejectionReason}</p>
        </div>
      )}

      {!canEdit && (status === 'submitted' || status === 'in_review') && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 p-4 text-sm text-blue-700 dark:text-blue-300">
          Awaiting admin review. You'll be able to edit again if it's rejected.
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Article</h1>
            {article.version && (
              <span className="rounded bg-gray-100 dark:bg-gray-700 px-2 py-0.5 font-mono text-xs text-gray-600 dark:text-gray-300">
                {article.version}
              </span>
            )}
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass}`}>
              {STATUS_LABELS[status] ?? status}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">ID: {id}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <button
            onClick={() => router.push('/admin/content')}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          {canEdit && (
            <button
              onClick={() => void saveDraft()}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
          )}
          {canSubmitForReview && (
            <button
              onClick={() => setShowSubmitConfirm(true)}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Submit for Review
            </button>
          )}
          {canStartReview && (
            <button
              onClick={() => void transitionStatus('in_review')}
              disabled={saving}
              className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/20"
            >
              Review
            </button>
          )}
          {canApprove && (
            <button
              onClick={() => void transitionStatus('approved')}
              disabled={saving}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              Approve
            </button>
          )}
          {canReject && (
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={saving}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Reject
            </button>
          )}
          {canPublish && (
            <button
              onClick={() => void transitionStatus('published')}
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Publish
            </button>
          )}
          {canArchive && (
            <button
              onClick={() => void transitionStatus('archived')}
              disabled={saving}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Archive
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
        <input
          type="text"
          value={title}
          disabled={isReadOnly}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
        <textarea
          value={description}
          disabled={isReadOnly}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-500"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
          <select
            value={contentType}
            disabled={isReadOnly}
            onChange={(e) => setContentType(e.target.value as ContentType)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-500"
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
            disabled={isReadOnly}
            onChange={(e) => setCategorySlug(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Read Time (min)</label>
          <input
            type="number"
            value={readTime}
            disabled={isReadOnly}
            onChange={(e) => setReadTime(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (comma separated)</label>
        <input
          type="text"
          value={tagsInput}
          disabled={isReadOnly}
          onChange={(e) => setTagsInput(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-500"
        />
      </div>

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
                  disabled={isReadOnly}
                  onChange={(e) => updateBlock(index, 'content', e.target.value)}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm font-semibold text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-500"
                />
              )}
              {block.type === 'text' && (
                <textarea
                  value={block.content}
                  disabled={isReadOnly}
                  onChange={(e) => updateBlock(index, 'content', e.target.value)}
                  rows={4}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-500"
                />
              )}
              {block.type === 'code' && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={block.language}
                    disabled={isReadOnly}
                    onChange={(e) => updateBlock(index, 'language', e.target.value)}
                    placeholder="Language"
                    className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1 text-xs text-gray-700 dark:text-gray-300 disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-500"
                  />
                  <textarea
                    value={block.content}
                    disabled={isReadOnly}
                    onChange={(e) => updateBlock(index, 'content', e.target.value)}
                    rows={6}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-1.5 font-mono text-sm text-gray-900 dark:text-white disabled:text-gray-500"
                  />
                </div>
              )}
              {block.type === 'callout' && (
                <textarea
                  value={block.content}
                  disabled={isReadOnly}
                  onChange={(e) => updateBlock(index, 'content', e.target.value)}
                  rows={3}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-500"
                />
              )}
              {block.type === 'diagram' && (
                <textarea
                  value={block.content}
                  disabled={isReadOnly}
                  onChange={(e) => updateBlock(index, 'content', e.target.value)}
                  rows={6}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-1.5 font-mono text-sm text-gray-900 dark:text-white disabled:text-gray-500"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <RelatedContent ownerId={id} ownerType="article" />

      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-800 p-5 shadow-xl">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Submit for review</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Your content will be reviewed by an Admin before publishing.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => void submitForReview()}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-5 shadow-xl">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Reject article</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              The creator will see this reason when they pick the article back up.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              autoFocus
              rows={4}
              placeholder="Explain what needs to change before this can be approved."
              className="mt-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => void submitReject()}
                disabled={saving || !rejectReason.trim()}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
