import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { auroraConfigured, DEFAULT_TENANT_ID } from '@/lib/db/aurora';
import {
  createWorkspace,
  ensureDefaultWorkspace,
  listWorkspacesForOwner,
} from '@/lib/db/workspaces';

export const dynamic = 'force-dynamic';

interface SessionUser {
  id?: string;
  tenantId?: string;
}

const CreateBody = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!auroraConfigured()) {
    return NextResponse.json({ workspaces: [] });
  }
  const user = session.user as SessionUser;
  const ownerId = user.id;
  if (!ownerId) {
    return NextResponse.json({ error: 'No user id on session' }, { status: 400 });
  }
  const tenantId = user.tenantId ?? DEFAULT_TENANT_ID;

  try {
    let workspaces = await listWorkspacesForOwner(tenantId, ownerId);
    if (workspaces.length === 0) {
      const defaultWs = await ensureDefaultWorkspace(tenantId, ownerId);
      workspaces = [defaultWs];
    }
    return NextResponse.json({ workspaces });
  } catch (err) {
    console.error('[api/admin/workspaces] GET failed:', err);
    return NextResponse.json(
      { error: 'Failed to list workspaces', detail: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!auroraConfigured()) {
    return NextResponse.json({ error: 'Aurora not configured' }, { status: 503 });
  }
  const user = session.user as SessionUser;
  const ownerId = user.id;
  if (!ownerId) {
    return NextResponse.json({ error: 'No user id on session' }, { status: 400 });
  }
  const tenantId = user.tenantId ?? DEFAULT_TENANT_ID;

  const body: unknown = await req.json().catch(() => ({}));
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', detail: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const workspace = await createWorkspace({
      tenantId,
      createdBy: ownerId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    });
    return NextResponse.json({ workspace }, { status: 201 });
  } catch (err) {
    console.error('[api/admin/workspaces] POST failed:', err);
    return NextResponse.json(
      { error: 'Failed to create workspace', detail: (err as Error).message },
      { status: 500 },
    );
  }
}
