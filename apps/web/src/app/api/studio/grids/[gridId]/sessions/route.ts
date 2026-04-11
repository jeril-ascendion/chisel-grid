import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';
import { createBlackboard } from '@chiselgrid/studio-core';
import {
  listSessionsForGrid,
  createSession as createSess,
  getGrid,
} from '@/lib/studio-store';

const CreateSessionSchema = z.object({
  workspace_id: z.string().min(1).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ gridId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { gridId } = await params;
  return NextResponse.json(listSessionsForGrid(gridId));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gridId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { gridId } = await params;
  const grid = getGrid(gridId);

  const body: unknown = await request.json().catch(() => ({}));
  const parsed = CreateSessionSchema.safeParse(body);
  const workspaceId = parsed.success ? parsed.data.workspace_id ?? grid?.workspace_id ?? '' : grid?.workspace_id ?? '';

  const tenantId = session.user.tenantId ?? 'default';
  const sessionId = crypto.randomUUID();
  const now = new Date().toISOString();

  const blackboard = createBlackboard({
    session_id: sessionId,
    grid_id: gridId,
    workspace_id: workspaceId,
    tenant_id: tenantId,
    created_by: session.user.email ?? 'unknown',
  });

  const studioSession = createSess({
    id: sessionId,
    grid_id: gridId,
    workspace_id: workspaceId,
    tenant_id: tenantId,
    created_by: session.user.email ?? 'unknown',
    status: 'active',
    turn_count: 0,
    blackboard,
    created_at: now,
    updated_at: now,
  });

  return NextResponse.json({
    session_id: studioSession.id,
    grid_id: studioSession.grid_id,
    workspace_id: studioSession.workspace_id,
    status: studioSession.status,
    created_at: studioSession.created_at,
  }, { status: 201 });
}
