import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { ContentStatusEnum } from '@chiselgrid/types';
import { updateArticleStatus } from '@/lib/article-store';
import { getUserRole } from '@/lib/auth/roles';

const PatchSchema = z.object({ status: ContentStatusEnum });

const ADMIN_ONLY_STATUSES = new Set(['approved', 'published', 'in_review', 'rejected']);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body: unknown = await request.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const role = getUserRole(session);
  if (ADMIN_ONLY_STATUSES.has(parsed.data.status) && role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: admin role required' }, { status: 403 });
  }

  const ok = await updateArticleStatus(id, parsed.data.status);
  if (!ok) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ contentId: id, status: parsed.data.status });
}
