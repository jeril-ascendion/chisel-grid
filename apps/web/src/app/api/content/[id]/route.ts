import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getArticleById } from '@/lib/mock-data';
import { getArticle, updateArticle } from '@/lib/article-store';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  const isAuthenticated = !!session?.user;

  // Check mock data first
  const mockArticle = getArticleById(id);
  if (mockArticle) {
    if (!isAuthenticated && mockArticle.status !== 'published') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(mockArticle);
  }

  // Check persistence store (Aurora or in-memory)
  const stored = await getArticle(id);
  if (stored) {
    // Public API contract (P12-03): unauthenticated callers only see
    // published content. Authenticated admin / creator editors keep
    // their existing draft-loading behaviour.
    if (!isAuthenticated && stored.status !== 'published') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({
      contentId: stored.contentId,
      title: stored.title,
      slug: stored.slug,
      description: stored.description,
      status: stored.status,
      contentType: stored.contentType,
      blocks: stored.blocks,
      categorySlug: stored.categorySlug,
      categoryName: stored.categoryName,
      tags: stored.tags.map((t) => ({ name: t, slug: t.toLowerCase().replace(/[^a-z0-9]+/g, '-') })),
      readTimeMinutes: stored.readTimeMinutes,
      authorName: stored.authorId,
      version: stored.version,
      versionNotes: stored.versionNotes,
    });
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // Check persistence store first (workspace-submitted articles)
  const stored = await getArticle(id);
  if (stored) {
    await updateArticle(id, {
      title: body.title ?? stored.title,
      description: body.description ?? stored.description,
      status: body.status ?? stored.status,
      contentType: body.contentType ?? stored.contentType,
      category: body.categorySlug ?? stored.category,
      blocks: body.blocks ?? stored.blocks,
      readTimeMinutes: body.readTimeMinutes ?? stored.readTimeMinutes,
    });
    const updated = (await getArticle(id))!;
    return NextResponse.json({
      contentId: updated.contentId,
      title: updated.title,
      slug: updated.slug,
      description: updated.description,
      status: updated.status,
      contentType: updated.contentType,
      blocks: updated.blocks,
      categorySlug: updated.categorySlug,
      categoryName: updated.categoryName,
      tags: updated.tags.map((t) => ({ name: t, slug: t.toLowerCase().replace(/[^a-z0-9]+/g, '-') })),
      readTimeMinutes: updated.readTimeMinutes,
      authorName: updated.authorId,
    });
  }

  // Fall back to mock data
  const mockArticle = getArticleById(id);
  if (!mockArticle) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    ...mockArticle,
    title: body.title ?? mockArticle.title,
    description: body.description ?? mockArticle.description,
    status: body.status ?? mockArticle.status,
    categorySlug: body.categorySlug ?? mockArticle.categorySlug,
    readTimeMinutes: body.readTimeMinutes ?? mockArticle.readTimeMinutes,
    blocks: body.blocks ?? mockArticle.blocks,
  });
}
