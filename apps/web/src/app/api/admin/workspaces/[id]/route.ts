import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { auroraConfigured, DEFAULT_TENANT_ID } from '@/lib/db/aurora';
import { getWorkspace, updateWorkspace } from '@/lib/db/workspaces';
import { listSessionsForOwner, toPublicSession } from '@/lib/db/sessions';

export const dynamic = 'force-dynamic';

interface SessionUser {
  id?: string;
  tenantId?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PatchBody = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!auroraConfigured()) {
    return NextResponse.json({ error: 'Aurora not configured' }, { status: 503 });
  }
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid workspace id' }, { status: 400 });
  }
  const user = session.user as SessionUser;
  const ownerId = user.id;
  if (!ownerId) {
    return NextResponse.json({ error: 'No user id on session' }, { status: 400 });
  }
  const tenantId = user.tenantId ?? DEFAULT_TENANT_ID;

  try {
    const workspace = await getWorkspace(id, tenantId, ownerId);
    if (!workspace) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const sessions = await listSessionsForOwner(tenantId, ownerId, {
      workspaceId: id,
      limit: 100,
      sort: 'updated_at_desc',
    });
    return NextResponse.json({
      workspace,
      sessions: sessions.map(toPublicSession),
    });
  } catch (err) {
    console.error('[api/admin/workspaces/[id]] GET failed:', err);
    return NextResponse.json(
      { error: 'Failed to load workspace', detail: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!auroraConfigured()) {
    return NextResponse.json({ error: 'Aurora not configured' }, { status: 503 });
  }
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid workspace id' }, { status: 400 });
  }
  const user = session.user as SessionUser;
  const ownerId = user.id;
  if (!ownerId) {
    return NextResponse.json({ error: 'No user id on session' }, { status: 400 });
  }
  const tenantId = user.tenantId ?? DEFAULT_TENANT_ID;

  const body: unknown = await req.json().catch(() => ({}));
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', detail: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const workspace = await updateWorkspace(id, tenantId, ownerId, parsed.data);
    if (!workspace) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ workspace });
  } catch (err) {
    console.error('[api/admin/workspaces/[id]] PATCH failed:', err);
    return NextResponse.json(
      { error: 'Failed to update workspace', detail: (err as Error).message },
      { status: 500 },
    );
  }
}
