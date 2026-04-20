import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getAllArticles } from '@/lib/article-store';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  let articles = await getAllArticles();
  if (status && status !== 'all') {
    articles = articles.filter((a) => a.status === status);
  }

  const items = articles.map((a) => ({
    id: a.contentId,
    title: a.title,
    status: a.status,
    author: a.authorId,
    category: a.categoryName || 'Uncategorised',
    categorySlug: a.categorySlug,
    categoryId: a.category,
    updatedAt: a.createdAt,
    publishedAt: a.status === 'published' ? a.createdAt : null,
  }));

  return NextResponse.json({ items });
}
