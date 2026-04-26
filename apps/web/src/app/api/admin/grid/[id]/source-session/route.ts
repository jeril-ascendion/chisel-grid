import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { auroraConfigured, DEFAULT_TENANT_ID } from '@/lib/db/aurora';
import { getSourceSessionForDiagram } from '@/lib/db/relations';

export const dynamic = 'force-dynamic';

interface SessionUser {
  tenantId?: string;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!auroraConfigured()) {
    return NextResponse.json({ source: null });
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: 'Invalid diagram id' }, { status: 400 });
  }

  const user = session.user as SessionUser;
  const tenantId = user.tenantId ?? DEFAULT_TENANT_ID;

  try {
    const source = await getSourceSessionForDiagram(tenantId, id);
    return NextResponse.json({ source });
  } catch (err) {
    console.error('[api/admin/grid/[id]/source-session] failed:', err);
    return NextResponse.json(
      { error: 'Failed to load source session', detail: (err as Error).message },
      { status: 500 },
    );
  }
}
