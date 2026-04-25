import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { auroraConfigured, DEFAULT_TENANT_ID, query } from '@/lib/db/aurora';
import { gridIrToSvg } from '@/lib/grid-svg';

export const dynamic = 'force-dynamic';

interface Row {
  id: string;
  title: string;
  grid_ir: unknown;
}

function parseIr(raw: unknown): Record<string, unknown> {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (raw && typeof raw === 'object') return raw as Record<string, unknown>;
  return {};
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!auroraConfigured()) {
    return NextResponse.json({ error: 'Aurora not configured' }, { status: 503 });
  }
  const { id } = await ctx.params;
  const tenantId = (session.user as { tenantId?: string }).tenantId ?? DEFAULT_TENANT_ID;
  try {
    const { rows } = await query<Row>(
      `SELECT id, title, grid_ir
         FROM grid_diagrams
        WHERE id = $1 AND tenant_id::text = $2::text
        LIMIT 1`,
      [id, tenantId],
    );
    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const ir = parseIr(row.grid_ir);
    if (!ir['title']) ir['title'] = row.title;
    const svg = gridIrToSvg(ir as Parameters<typeof gridIrToSvg>[0]);
    return new NextResponse(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (err) {
    console.error('[api/admin/grid/[id]/svg] failed:', err);
    return NextResponse.json(
      { error: 'Failed to render diagram', detail: (err as Error).message },
      { status: 500 },
    );
  }
}
