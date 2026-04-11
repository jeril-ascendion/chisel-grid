import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';
import { type AgentContext } from '@chiselgrid/studio-core';
import {
  INITIAL_PIPELINE,
  classifyRefinement,
  checkGenerationGate,
  createAgentRegistry,
  runPipeline,
} from '@chiselgrid/studio-agents';
import {
  getSession,
  updateSession,
  addTurn,
} from '@/lib/studio-store';
import { getSessionEmitter, type SessionEvent } from '@/lib/studio/session-events';

const TurnRequestSchema = z.object({
  message: z.string().min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionId } = await params;
  const studioSession = getSession(sessionId);
  if (!studioSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const body: unknown = await request.json();
  const parsed = TurnRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
  }

  const bb = studioSession.blackboard;
  const turnNumber = bb.turn_count + 1;

  // Save user turn
  addTurn({
    id: crypto.randomUUID(),
    session_id: sessionId,
    turn_number: turnNumber,
    role: 'user',
    content: parsed.data.message,
    created_at: new Date().toISOString(),
  });

  // Determine pipeline
  const pipeline = turnNumber === 1
    ? INITIAL_PIPELINE
    : classifyRefinement(parsed.data.message, bb).pipeline;

  // Check generation gate
  const gate = checkGenerationGate(bb);
  if (!gate.allowed) {
    const emitterBlocked = getSessionEmitter(sessionId);
    emitterBlocked.emit('event', {
      type: 'pipeline_blocked',
      blockers: gate.blockers,
      timestamp: new Date().toISOString(),
    } satisfies SessionEvent);

    return NextResponse.json({
      turn_number: turnNumber,
      blocked: true,
      blockers: gate.blockers,
      blackboard_summary: buildBlackboardSummary(bb),
    });
  }

  // Build agent context
  const ctx: AgentContext = {
    session_id: sessionId,
    tenant_id: studioSession.tenant_id,
    turn: turnNumber,
    blackboard: bb,
    trigger: {
      type: turnNumber === 1 ? 'initial_generation' : 'user_refinement',
      user_message: parsed.data.message,
    },
    kb_version: '1.0',
  };

  // Run pipeline with SSE progress events
  const emitter = getSessionEmitter(sessionId);
  const AGENT_NAMES: Record<string, string> = {
    context_analyzer: 'Context Analyzer',
    architecture_generator: 'Architecture Generator',
    tradeoff_analyzer: 'Trade-off Analyzer',
    diagram_generator: 'Diagram Generator',
    review_validator: 'Review Validator',
    estimator: 'Estimator',
    document_generator: 'Document Generator',
  };

  const registry = createAgentRegistry();
  const updatedBb = await runPipeline(pipeline, ctx, registry, (agentId, status) => {
    const now = new Date().toISOString();
    const agentName = AGENT_NAMES[agentId] ?? agentId;
    if (status === 'started') {
      emitter.emit('event', { type: 'agent_started', agentId, agentName, timestamp: now } satisfies SessionEvent);
    } else if (status === 'completed') {
      emitter.emit('event', { type: 'agent_completed', agentId, agentName, durationMs: 0, timestamp: now } satisfies SessionEvent);
    } else {
      emitter.emit('event', { type: 'agent_failed', agentId, error: 'Agent failed', timestamp: now } satisfies SessionEvent);
    }
  });

  emitter.emit('event', {
    type: 'pipeline_complete',
    turnNumber,
    generationReady: updatedBb.conflicts.filter(c => c.blocking && !c.resolved).length === 0,
    timestamp: new Date().toISOString(),
  } satisfies SessionEvent);

  // Save updated session
  updateSession(sessionId, {
    blackboard: updatedBb,
    turn_count: turnNumber,
    status: 'active',
  });

  // Save assistant turn
  addTurn({
    id: crypto.randomUUID(),
    session_id: sessionId,
    turn_number: turnNumber,
    role: 'assistant',
    content: JSON.stringify({ pipeline, turn: turnNumber }),
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({
    turn_number: turnNumber,
    blackboard_summary: buildBlackboardSummary(updatedBb),
    diagrams: [
      ...(updatedBb.diagrams.c4_context ? [updatedBb.diagrams.c4_context] : []),
      ...updatedBb.diagrams.sequence,
      ...updatedBb.diagrams.additional,
    ],
  });
}

function buildBlackboardSummary(bb: import('@chiselgrid/studio-core').DesignBlackboard) {
  return {
    intent: {
      type: bb.intent.type,
      criticality_tier: bb.intent.criticality_tier,
      domain: bb.intent.domain,
    },
    requirements_status: bb.requirements.status,
    architecture_status: bb.architecture.status,
    analysis: {
      overall_readiness_score: bb.analysis.overall_readiness_score,
      adrs_count: bb.analysis.adrs.length,
      risks_count: bb.analysis.risks.length,
    },
    pending_assumptions_count: bb.assumptions.pending.length,
    blocking_conflicts_count: bb.conflicts.filter(c => c.blocking && !c.resolved).length,
    generation_ready: bb.conflicts.filter(c => c.blocking && !c.resolved).length === 0,
  };
}
