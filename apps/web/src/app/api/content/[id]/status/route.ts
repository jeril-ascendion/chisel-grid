import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { type ContentStatus, ContentStatusEnum } from '@chiselgrid/types';
import { getArticle, updateArticleStatus } from '@/lib/article-store';
import { getUserRole, type UserRole } from '@/lib/auth/roles';

const PatchSchema = z.object({
  status: ContentStatusEnum,
  version: z.string().regex(/^v\d+\.\d+\.\d+$/).optional(),
  versionNotes: z.string().max(2000).nullable().optional(),
});

/**
 * Content lifecycle state machine — EPIC-P12-02.
 *
 * Each entry maps a current status to the set of statuses it may
 * transition to, paired with the roles that may perform the move.
 * "creator_or_admin" means CREATOR or ADMIN. "admin" is admin only.
 *
 * Statuses not listed (deprecated, archived terminal) are read-only.
 */
type TransitionRole = 'admin' | 'creator_or_admin';
const TRANSITIONS: Record<ContentStatus, Partial<Record<ContentStatus, TransitionRole>>> = {
  draft: { submitted: 'creator_or_admin' },
  submitted: { in_review: 'admin' },
  in_review: { approved: 'admin', rejected: 'admin' },
  approved: { published: 'admin' },
  published: { archived: 'admin' },
  rejected: { draft: 'creator_or_admin' },
  archived: {},
  deprecated: {},
};

function roleAllowed(allowed: TransitionRole, role: UserRole | null): boolean {
  if (role === 'admin') return true;
  if (allowed === 'creator_or_admin' && role === 'creator') return true;
  return false;
}

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

  const article = await getArticle(id);
  if (!article) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const from = article.status;
  const to = parsed.data.status;
  if (from === to) {
    return NextResponse.json({ contentId: id, status: to });
  }

  const allowedRole = TRANSITIONS[from]?.[to];
  if (!allowedRole) {
    return NextResponse.json(
      { error: `Invalid transition: ${from} → ${to}` },
      { status: 400 },
    );
  }

  const role = getUserRole(session);
  if (!roleAllowed(allowedRole, role)) {
    return NextResponse.json(
      { error: `Forbidden: ${allowedRole === 'admin' ? 'admin' : 'creator or admin'} role required for ${from} → ${to}` },
      { status: 403 },
    );
  }

  const ok = await updateArticleStatus(id, to, {
    ...(parsed.data.version ? { version: parsed.data.version } : {}),
    ...(parsed.data.versionNotes !== undefined ? { versionNotes: parsed.data.versionNotes } : {}),
  });
  if (!ok) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ contentId: id, status: to });
}
