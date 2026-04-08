import { NextRequest, NextResponse } from 'next/server';
import { getArticleById } from '@/lib/mock-data';
import { getArticle, updateArticle } from '@/lib/article-store';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Check mock data first
  const mockArticle = getArticleById(id);
  if (mockArticle) {
    return NextResponse.json(mockArticle);
  }

  // Check in-memory store (submitted via workspace)
  const stored = getArticle(id);
  if (stored) {
    return NextResponse.json({
      contentId: stored.contentId,
      title: stored.title,
      slug: stored.slug,
      description: stored.description,
      status: stored.status,
      blocks: stored.blocks,
      categorySlug: stored.category,
      categoryName: stored.category,
      tags: stored.tags.map((t) => ({ name: t, slug: t.toLowerCase().replace(/[^a-z0-9]+/g, '-') })),
      readTimeMinutes: stored.readTimeMinutes,
      authorName: stored.authorId,
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

  // Check in-memory store first (workspace-submitted articles)
  const stored = getArticle(id);
  if (stored) {
    updateArticle(id, {
      title: body.title ?? stored.title,
      description: body.description ?? stored.description,
      status: body.status ?? stored.status,
      category: body.categorySlug ?? stored.category,
      blocks: body.blocks ?? stored.blocks,
      readTimeMinutes: body.readTimeMinutes ?? stored.readTimeMinutes,
    });
    const updated = getArticle(id)!;
    return NextResponse.json({
      contentId: updated.contentId,
      title: updated.title,
      slug: updated.slug,
      description: updated.description,
      status: updated.status,
      blocks: updated.blocks,
      categorySlug: updated.category,
      categoryName: updated.category,
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
