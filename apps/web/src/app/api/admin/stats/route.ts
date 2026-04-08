import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getAllArticles } from '@/lib/article-store';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const all = getAllArticles();
  const counts: Record<string, number> = { draft: 0, submitted: 0, in_review: 0, approved: 0, published: 0, rejected: 0 };
  for (const a of all) {
    if (a.status in counts) counts[a.status]++;
  }

  return NextResponse.json(counts);
}
