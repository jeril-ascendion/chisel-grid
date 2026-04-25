import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { asUuid, auroraConfigured, DEFAULT_TENANT_ID, query } from '@/lib/db/aurora';

export const dynamic = 'force-dynamic';

interface SessionUser {
  email?: string | null;
  tenantId?: string;
}

export async function POST(
  req: NextRequest,
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
  if (!id) {
    return NextResponse.json({ error: 'Invalid diagram id' }, { status: 400 });
  }

  let body: { notes?: string } = {};
  try {
    body = await req.json();
  } catch {
    // notes are optional
  }

  const user = session.user as SessionUser;
  const tenantId = user.tenantId ?? DEFAULT_TENANT_ID;
  const approvedBy = user.email ?? 'unknown';

  try {
    const { rows } = await query<{ mode: string }>(
      `SELECT mode FROM grid_diagrams
        WHERE id = $1 AND tenant_id = $2`,
      [asUuid(id), asUuid(tenantId)],
    );
    const source = rows[0];
    if (!source) {
      return NextResponse.json({ error: 'Diagram not found' }, { status: 404 });
    }
    if (source.mode !== 'precise') {
      return NextResponse.json(
        { error: 'Only precise diagrams can be approved for delivery', currentMode: source.mode },
        { status: 400 },
      );
    }

    await query(
      `INSERT INTO grid_training_data (diagram_id, tenant_id, mode, approved_by, notes)
       VALUES ($1, $2, 'precise', $3, $4)`,
      [asUuid(id), asUuid(tenantId), approvedBy, body.notes ?? null],
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/admin/grid/[id]/approve-delivery] failed:', err);
    return NextResponse.json(
      { error: 'Approve failed', detail: (err as Error).message },
      { status: 500 },
    );
  }
}
