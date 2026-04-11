import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';
import { calculateReadinessScore, createAuditEvent } from '@chiselgrid/studio-core';
import { getSession, updateSession } from '@/lib/studio-store';

const PatchAssumptionSchema = z.object({
  action: z.enum(['confirm', 'override']),
  override_value: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string; assumptionId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionId, assumptionId } = await params;
  const studioSession = getSession(sessionId);
  if (!studioSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const body: unknown = await request.json();
  const parsed = PatchAssumptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
  }

  const bb = { ...studioSession.blackboard };
  const pendingIdx = bb.assumptions.pending.findIndex(a => a.id === assumptionId);
  if (pendingIdx === -1) {
    return NextResponse.json({ error: 'Assumption not found in pending list' }, { status: 404 });
  }

  const assumption = { ...bb.assumptions.pending[pendingIdx] };
  const now = new Date().toISOString();

  if (parsed.data.action === 'confirm') {
    assumption.confirmed_at = now;
    assumption.confirmed_by = session.user.email ?? 'unknown';
  } else {
    assumption.confirmed_at = now;
    assumption.confirmed_by = session.user.email ?? 'unknown';
    assumption.override_value = parsed.data.override_value;
    assumption.source = 'user_overridden' as typeof assumption.source;
  }

  // Move from pending to confirmed
  bb.assumptions = {
    ...bb.assumptions,
    pending: bb.assumptions.pending.filter((_, i) => i !== pendingIdx),
    confirmed: [...bb.assumptions.confirmed, assumption],
  };

  // Add audit event
  const auditEvent = createAuditEvent({
    session_id: sessionId,
    tenant_id: studioSession.tenant_id,
    turn: bb.turn_count,
    eventType: parsed.data.action === 'confirm' ? 'assumption_confirmed' : 'assumption_overridden',
    actor_type: 'user',
    actor_id: session.user.email ?? 'unknown',
    payload: { assumption_id: assumptionId, action: parsed.data.action },
  });
  bb.audit_trail = [...bb.audit_trail, auditEvent];

  // Recalculate readiness score
  bb.analysis = { ...bb.analysis, overall_readiness_score: calculateReadinessScore(bb) };

  updateSession(sessionId, { blackboard: bb });

  return NextResponse.json({
    assumption,
    new_readiness_score: bb.analysis.overall_readiness_score,
    pending_count_remaining: bb.assumptions.pending.length,
  });
}
