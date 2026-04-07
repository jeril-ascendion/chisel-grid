import { NextRequest, NextResponse } from 'next/server';
import { getArticleById } from '@/lib/mock-data';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const article = getArticleById(id);

  if (!article) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(article);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const article = getArticleById(id);

  if (!article) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();

  // In production this would update Aurora DB
  // For now return success with merged data
  return NextResponse.json({
    ...article,
    title: body.title ?? article.title,
    description: body.description ?? article.description,
    status: body.status ?? article.status,
    categorySlug: body.categorySlug ?? article.categorySlug,
    readTimeMinutes: body.readTimeMinutes ?? article.readTimeMinutes,
    blocks: body.blocks ?? article.blocks,
  });
}
