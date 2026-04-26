import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getAllArticles, type ArticleSort } from '@/lib/article-store';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const contentType = searchParams.get('contentType');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const sortParam = searchParams.get('sort');
  const sort: ArticleSort = sortParam === 'most_referenced' ? 'most_referenced' : 'recent';

  let articles = await getAllArticles(sort);
  if (status && status !== 'all') {
    articles = articles.filter((a) => a.status === status);
  }
  if (contentType && contentType !== 'all') {
    articles = articles.filter((a) => a.contentType === contentType);
  }
  if (from) {
    const fromTs = Date.parse(from);
    if (!Number.isNaN(fromTs)) {
      articles = articles.filter((a) => Date.parse(a.createdAt) >= fromTs);
    }
  }
  if (to) {
    const toTs = Date.parse(to);
    if (!Number.isNaN(toTs)) {
      articles = articles.filter((a) => Date.parse(a.createdAt) <= toTs);
    }
  }

  const items = articles.map((a) => ({
    id: a.contentId,
    title: a.title,
    status: a.status,
    contentType: a.contentType,
    author: a.authorId,
    category: a.categoryPath || a.categoryName || 'Uncategorised',
    categoryName: a.categoryName,
    categoryPath: a.categoryPath,
    categorySlug: a.categorySlug,
    categorySlugPath: a.categorySlugPath,
    categoryLevel: a.categoryLevel,
    categoryId: a.category,
    timesReferenced: a.timesReferenced,
    version: a.version,
    versionNotes: a.versionNotes,
    rejectionReason: a.rejectionReason,
    updatedAt: a.createdAt,
    publishedAt: a.publishedAt ?? (a.status === 'published' ? a.createdAt : null),
  }));

  return NextResponse.json({ items });
}
