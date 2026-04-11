import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';
import { createBlackboard } from '@chiselgrid/studio-core';
import {
  createSession as createSess,
  listRecentSessions,
} from '@/lib/studio-store';

const CreateSessionSchema = z.object({
  grid_id: z.string().min(1),
  workspace_id: z.string().min(1),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const tenantId = session.user.tenantId ?? 'default';
  return NextResponse.json(listRecentSessions(tenantId));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = CreateSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
  }

  const tenantId = session.user.tenantId ?? 'default';
  const sessionId = crypto.randomUUID();
  const now = new Date().toISOString();

  const blackboard = createBlackboard({
    session_id: sessionId,
    grid_id: parsed.data.grid_id,
    workspace_id: parsed.data.workspace_id,
    tenant_id: tenantId,
    created_by: session.user.email ?? 'unknown',
  });

  const studioSession = createSess({
    id: sessionId,
    grid_id: parsed.data.grid_id,
    workspace_id: parsed.data.workspace_id,
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
