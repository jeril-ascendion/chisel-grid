import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { auroraConfigured, DEFAULT_TENANT_ID } from '@/lib/db/aurora';
import { deleteRelation } from '@/lib/db/relations';

export const dynamic = 'force-dynamic';

interface SessionUser {
  tenantId?: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!auroraConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { id } = await ctx.params;
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid relation id' }, { status: 400 });
  }

  const tenantId = (session.user as SessionUser).tenantId ?? DEFAULT_TENANT_ID;

  try {
    const deleted = await deleteRelation(tenantId, id);
    if (!deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/admin/relations/[id]] DELETE failed:', err);
    return NextResponse.json(
      { error: 'Failed to delete relation', detail: (err as Error).message },
      { status: 500 },
    );
  }
}
