import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { asUuid, auroraConfigured, DEFAULT_TENANT_ID, query } from '@/lib/db/aurora';

export const dynamic = 'force-dynamic';

interface DiagramRow {
  id: string;
  title: string;
  diagram_type: string;
  created_at: string;
  created_by: string;
}

interface SessionUser {
  tenantId?: string;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!auroraConfigured()) {
    return NextResponse.json([]);
  }

  const user = session.user as SessionUser;
  const tenantId = user.tenantId ?? DEFAULT_TENANT_ID;

  try {
    const { rows } = await query<DiagramRow>(
      `SELECT id, title, diagram_type, created_at, created_by
         FROM grid_diagrams
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT 200`,
      [asUuid(tenantId)],
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error('[api/admin/grid/diagrams] GET failed:', err);
    return NextResponse.json(
      { error: 'Failed to load diagrams', detail: (err as Error).message },
      { status: 500 },
    );
  }
}
