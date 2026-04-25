import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { asUuid, auroraConfigured, DEFAULT_TENANT_ID, query } from '@/lib/db/aurora';

export const dynamic = 'force-dynamic';

interface SessionUser {
  email?: string | null;
  tenantId?: string;
}

interface SourceRow {
  id: string;
  title: string;
  diagram_type: string;
  grid_ir: unknown;
  mode: string;
}

export async function POST(
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
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Invalid diagram id' }, { status: 400 });
  }

  const user = session.user as SessionUser;
  const tenantId = user.tenantId ?? DEFAULT_TENANT_ID;
  const createdBy = user.email ?? 'unknown';

  try {
    const { rows } = await query<SourceRow>(
      `SELECT id, title, diagram_type, grid_ir, mode
         FROM grid_diagrams
        WHERE id = $1 AND tenant_id = $2`,
      [asUuid(id), tenantId],
    );
    const source = rows[0];
    if (!source) {
      return NextResponse.json({ error: 'Diagram not found' }, { status: 404 });
    }
    if (source.mode !== 'sketch') {
      return NextResponse.json(
        { error: 'Only sketch diagrams can be promoted', currentMode: source.mode },
        { status: 400 },
      );
    }

    const { rows: insertRows } = await query<{ id: string }>(
      `INSERT INTO grid_diagrams (tenant_id, title, diagram_type, grid_ir, created_by, mode, parent_id)
       VALUES ($1, $2, $3, $4::jsonb, $5, 'architecture', $6)
       RETURNING id`,
      [
        tenantId,
        source.title,
        source.diagram_type,
        JSON.stringify(source.grid_ir),
        createdBy,
        asUuid(source.id),
      ],
    );
    const newId = insertRows[0]?.id;
    if (!newId) {
      return NextResponse.json({ error: 'Promote insert returned no id' }, { status: 500 });
    }
    return NextResponse.json({ id: newId });
  } catch (err) {
    console.error('[api/admin/grid/[id]/promote] failed:', err);
    return NextResponse.json(
      { error: 'Promote failed', detail: (err as Error).message },
      { status: 500 },
    );
  }
}
