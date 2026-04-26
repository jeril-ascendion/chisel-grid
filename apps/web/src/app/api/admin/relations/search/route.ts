import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { auroraConfigured, DEFAULT_TENANT_ID } from '@/lib/db/aurora';
import { searchLinkable } from '@/lib/db/relations';

export const dynamic = 'force-dynamic';

interface SessionUser {
  tenantId?: string;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!auroraConfigured()) {
    return NextResponse.json({ results: [] });
  }

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const tenantId = (session.user as SessionUser).tenantId ?? DEFAULT_TENANT_ID;

  try {
    const results = await searchLinkable(tenantId, q, 20);
    return NextResponse.json({ results });
  } catch (err) {
    console.error('[api/admin/relations/search] failed:', err);
    return NextResponse.json(
      { error: 'Search failed', detail: (err as Error).message },
      { status: 500 },
    );
  }
}
