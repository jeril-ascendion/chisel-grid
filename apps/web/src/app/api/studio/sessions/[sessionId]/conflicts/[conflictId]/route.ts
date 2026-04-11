import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';
import { createAuditEvent } from '@chiselgrid/studio-core';
import { getSession, updateSession } from '@/lib/studio-store';

const PatchConflictSchema = z.object({
  resolution: z.string().min(1),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string; conflictId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionId, conflictId } = await params;
  const studioSession = getSession(sessionId);
  if (!studioSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const body: unknown = await request.json();
  const parsed = PatchConflictSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
  }

  const bb = { ...studioSession.blackboard };
  const conflictIdx = bb.conflicts.findIndex(c => c.id === conflictId);
  if (conflictIdx === -1) {
    return NextResponse.json({ error: 'Conflict not found' }, { status: 404 });
  }

  const now = new Date().toISOString();
  const conflict = {
    ...bb.conflicts[conflictIdx],
    resolved: true,
    resolution: parsed.data.resolution,
    resolved_at: now,
    resolved_by: session.user.email ?? 'unknown',
  };

  bb.conflicts = bb.conflicts.map((c, i) => (i === conflictIdx ? conflict : c));

  // Check if all blocking conflicts are resolved
  const allBlockingResolved = bb.conflicts
    .filter(c => c.blocking)
    .every(c => c.resolved);

  // Add audit event
  const auditEvent = createAuditEvent({
    session_id: sessionId,
    tenant_id: studioSession.tenant_id,
    turn: bb.turn_count,
    eventType: 'conflict_resolved',
    actor_type: 'user',
    actor_id: session.user.email ?? 'unknown',
    payload: { conflict_id: conflictId, resolution: parsed.data.resolution },
  });
  bb.audit_trail = [...bb.audit_trail, auditEvent];

  updateSession(sessionId, { blackboard: bb });

  return NextResponse.json({
    conflict,
    all_blocking_resolved: allBlockingResolved,
    generation_unblocked: allBlockingResolved && conflict.blocking,
  });
}
