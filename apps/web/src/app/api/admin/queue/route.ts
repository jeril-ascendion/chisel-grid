import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getQueueArticles, updateArticleStatus } from '@/lib/article-store';

/**
 * GET /api/admin/queue — List articles in review queue
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  const cookieHeader = req.headers.get('cookie') ?? '';
  const cookieNames = cookieHeader
    .split(';')
    .map((c) => c.trim().split('=')[0])
    .filter(Boolean);
  console.log(
    '[queue] GET host=%s cookies=%j hasSession=%s userEmail=%s',
    req.headers.get('host'),
    cookieNames,
    !!session?.user,
    session?.user?.email ?? 'none',
  );
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const statusFilter = new URL(req.url).searchParams.get('status') ?? undefined;
  const articles = await getQueueArticles(statusFilter);
  console.log('[queue] returning items=%d filter=%s', articles.length, statusFilter ?? '(default)');

  // Map to the shape ContentQueue component expects
  const items = articles.map((a) => ({
    id: a.contentId,
    title: a.title,
    slug: a.slug,
    author: a.authorId,
    submittedAt: a.createdAt,
    readTimeMinutes: a.readTimeMinutes,
    status: a.status === 'submitted' ? 'in_review' : a.status,
    category: a.categoryName || 'Uncategorised',
    categorySlug: a.categorySlug,
    categoryId: a.category,
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
  const updated = await updateArticleStatus(contentId, newStatus);

  if (!updated) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, status: newStatus });
}
