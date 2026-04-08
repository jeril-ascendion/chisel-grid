import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getQueueArticles, updateArticleStatus } from '@/lib/article-store';

/**
 * GET /api/admin/queue — List articles in review queue
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const articles = getQueueArticles();

  // Map to the shape ContentQueue component expects
  const items = articles.map((a) => ({
    id: a.contentId,
    title: a.title,
    slug: a.slug,
    author: a.authorId,
    submittedAt: a.createdAt,
    readTimeMinutes: a.readTimeMinutes,
    status: a.status === 'submitted' ? 'in_review' : a.status,
    category: a.category,
    description: a.description,
  }));

  return NextResponse.json({ items, total: items.length });
}

/**
 * POST /api/admin/queue — Approve or reject an article
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { contentId, action } = (await request.json()) as {
    contentId: string;
    action: 'approve' | 'reject' | 'resubmit';
  };

  if (!contentId || !action) {
    return NextResponse.json({ error: 'Missing contentId or action' }, { status: 400 });
  }

  const newStatus = action === 'approve' ? 'published' : action === 'resubmit' ? 'in_review' : 'rejected';
  const updated = updateArticleStatus(contentId, newStatus);

  if (!updated) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, status: newStatus });
}
