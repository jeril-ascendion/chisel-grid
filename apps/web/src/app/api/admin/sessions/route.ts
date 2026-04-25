import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { auroraConfigured, DEFAULT_TENANT_ID } from '@/lib/db/aurora';
import {
  listSessionsForOwner,
  toPublicSession,
  type SessionKind,
} from '@/lib/db/sessions';

export const dynamic = 'force-dynamic';

const VALID_KINDS: SessionKind[] = ['grid', 'chamber', 'studio'];
const VALID_SORTS = ['updated_at_desc'] as const;

interface SessionUser {
  id?: string;
  tenantId?: string;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!auroraConfigured()) {
    return NextResponse.json({ sessions: [] });
  }

  const user = session.user as SessionUser;
  const tenantId = user.tenantId ?? DEFAULT_TENANT_ID;
  const ownerId = user.id;
  if (!ownerId) {
    return NextResponse.json({ error: 'No user id on session' }, { status: 400 });
  }

  const url = req.nextUrl;
  const limitRaw = url.searchParams.get('limit');
  const sortRaw = url.searchParams.get('sort');
  const kindRaw = url.searchParams.get('kind');

  const limit = limitRaw ? Math.max(1, Math.min(parseInt(limitRaw, 10) || 1, 100)) : 20;
  if (sortRaw && !(VALID_SORTS as readonly string[]).includes(sortRaw)) {
    return NextResponse.json({ error: 'Invalid sort' }, { status: 400 });
  }
  let kind: SessionKind | undefined;
  if (kindRaw) {
    if (!(VALID_KINDS as string[]).includes(kindRaw)) {
      return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
    }
    kind = kindRaw as SessionKind;
  }

  try {
    const rows = await listSessionsForOwner(tenantId, ownerId, {
      ...(kind ? { kind } : {}),
      limit,
      sort: 'updated_at_desc',
    });
    return NextResponse.json({ sessions: rows.map(toPublicSession) });
  } catch (err) {
    console.error('[api/admin/sessions] GET failed:', err);
    return NextResponse.json(
      { error: 'Failed to list sessions', detail: (err as Error).message },
      { status: 500 },
    );
  }
}
