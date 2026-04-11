import { CRITICALITY_GENERATION_GATES } from '../constants/enums';
import type {
  AgentId,
  CriticalityTier,
} from '../constants/enums';
import type {
  Amendment,
  AgentResult,
  AuditEvent,
  DesignBlackboard,
} from '../types/blackboard';

export interface CreateBlackboardParams {
  session_id: string;
  grid_id: string;
  workspace_id: string;
  tenant_id: string;
  created_by: string;
  kb_version?: string | undefined;
  schema_version?: string | undefined;
}

export function createBlackboard(params: CreateBlackboardParams): DesignBlackboard {
  const now = new Date().toISOString();
  return {
    session_id: params.session_id,
    grid_id: params.grid_id,
    workspace_id: params.workspace_id,
    tenant_id: params.tenant_id,
    created_by: params.created_by,
    kb_version: params.kb_version ?? '1.0',
    schema_version: params.schema_version ?? '1.0',
    created_at: now,
    updated_at: now,
    turn_count: 0,

    intent: {
      type: 'greenfield',
      project_type: 'greenfield',
      fidelity: 'conceptual',
      criticality_tier: 4,
      criticality_challenged: false,
      criticality_signals: [],
      domain: '',
      jurisdiction: [],
      cloud_platforms: [],
      compliance_tags: [],
      status: 'empty',
    },

    requirements: {
      functional: [],
      nfr: { has_ha_claim: false, has_dr_strategy: false },
      compliance: [],
      constraints: [],
      status: 'empty',
    },

    architecture: {
      components: [],
      relationships: [],
      decisions: [],
      status: 'empty',
    },

    diagrams: {
      sequence: [],
      additional: [],
      status: 'empty',
    },

    analysis: {
      tradeoffs: [],
      adrs: [],
      pillar_scores: {},
      risks: [],
      overall_readiness_score: 0,
      twelve_factor_findings: [],
      status: 'empty',
    },

    estimates: {
      wbs: [],
      timeline_weeks_low: 0,
      timeline_weeks_high: 0,
      resource_plan: [],
      status: 'empty',
    },

    assumptions: {
      confirmed: [],
      pending: [],
      forbidden_defaults: [],
    },

    conflicts: [],
    gaps: [],
    amendments: [],
    audit_trail: [],
    session_lineage: {},
    human_gates: [],
    exported_artifacts: [],
  };
}

export function applyPatch(blackboard: DesignBlackboard, result: AgentResult): DesignBlackboard {
  const updated = { ...blackboard };
  const patch = result.patch;

  if (patch.intent) {
    updated.intent = { ...updated.intent, ...patch.intent };
  }
  if (patch.requirements) {
    updated.requirements = { ...updated.requirements, ...patch.requirements };
  }
  if (patch.architecture) {
    updated.architecture = { ...updated.architecture, ...patch.architecture };
  }
  if (patch.diagrams) {
    updated.diagrams = { ...updated.diagrams, ...patch.diagrams };
  }
  if (patch.analysis) {
    updated.analysis = { ...updated.analysis, ...patch.analysis };
  }
  if (patch.estimates) {
    updated.estimates = { ...updated.estimates, ...patch.estimates };
  }
  if (patch.assumptions) {
    updated.assumptions = { ...updated.assumptions, ...patch.assumptions };
  }
  if (patch.conflicts) {
    updated.conflicts = [...updated.conflicts, ...patch.conflicts];
  }
  if (patch.gaps) {
    updated.gaps = [...updated.gaps, ...patch.gaps];
  }
  if (patch.amendments) {
    updated.amendments = [...updated.amendments, ...patch.amendments];
  }
  if (patch.audit_events) {
    updated.audit_trail = [...updated.audit_trail, ...patch.audit_events];
  }

  updated.turn_count = result.turn;
  updated.updated_at = new Date().toISOString();

  return updated;
}

export function calculateReadinessScore(bb: DesignBlackboard): number {
  let score = 0;
  const weights = {
    intent: 15,
    requirements: 20,
    architecture: 25,
    diagrams: 10,
    analysis: 15,
    estimates: 10,
    conflicts: 5,
  };

  if (bb.intent.status !== 'empty') score += weights.intent * (bb.intent.status === 'validated' ? 1 : bb.intent.status === 'complete' ? 0.8 : 0.4);
  if (bb.requirements.status !== 'empty') score += weights.requirements * (bb.requirements.status === 'validated' ? 1 : bb.requirements.status === 'complete' ? 0.8 : 0.4);
  if (bb.architecture.status !== 'empty') score += weights.architecture * (bb.architecture.status === 'validated' ? 1 : bb.architecture.status === 'complete' ? 0.8 : 0.4);
  if (bb.diagrams.status !== 'empty') score += weights.diagrams * (bb.diagrams.status === 'validated' ? 1 : bb.diagrams.status === 'complete' ? 0.8 : 0.4);
  if (bb.analysis.status !== 'empty') score += weights.analysis * (bb.analysis.status === 'validated' ? 1 : bb.analysis.status === 'complete' ? 0.8 : 0.4);
  if (bb.estimates.status !== 'empty') score += weights.estimates * (bb.estimates.status === 'validated' ? 1 : bb.estimates.status === 'complete' ? 0.8 : 0.4);

  const unresolvedBlockingConflicts = bb.conflicts.filter(c => c.blocking && !c.resolved);
  if (unresolvedBlockingConflicts.length === 0) score += weights.conflicts;

  return Math.round(score);
}

export function meetsGenerationGate(bb: DesignBlackboard): boolean {
  const tier = bb.intent.criticality_tier as CriticalityTier;
  const gate = CRITICALITY_GENERATION_GATES[tier];
  return calculateReadinessScore(bb) >= gate;
}

export function toTOON(bb: DesignBlackboard): string {
  const slim: Record<string, unknown> = {
    session_id: bb.session_id,
    turn_count: bb.turn_count,
    intent: bb.intent,
    requirements: bb.requirements,
    architecture: {
      components: bb.architecture.components,
      relationships: bb.architecture.relationships,
      decisions: bb.architecture.decisions,
      status: bb.architecture.status,
    },
    analysis: {
      overall_readiness_score: bb.analysis.overall_readiness_score,
      adrs: bb.analysis.adrs,
      risks: bb.analysis.risks,
      status: bb.analysis.status,
    },
    assumptions: bb.assumptions,
    conflicts: bb.conflicts.filter(c => !c.resolved),
    gaps: bb.gaps.filter(g => !g.resolved),
    human_gates: bb.human_gates.filter(g => g.status === 'pending'),
  };

  return JSON.stringify(slim, (_key, value: unknown) => {
    if (value === null || value === undefined) return undefined;
    if (Array.isArray(value) && value.length === 0) return undefined;
    if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) return undefined;
    return value;
  });
}

export function createAuditEvent(params: {
  session_id: string;
  tenant_id: string;
  turn: number;
  eventType: string;
  actor_type: 'user' | 'agent' | 'system';
  actor_id: string;
  payload: Record<string, unknown>;
}): AuditEvent {
  return {
    id: crypto.randomUUID(),
    session_id: params.session_id,
    tenant_id: params.tenant_id,
    turn_number: params.turn,
    event_type: params.eventType,
    actor_type: params.actor_type,
    actor_id: params.actor_id,
    payload: params.payload,
    created_at: new Date().toISOString(),
  };
}

export function createAmendment(params: {
  session_id: string;
  turn_number: number;
  agent_id?: AgentId | undefined;
  user_id?: string | undefined;
  section_path: string;
  operation: string;
  before_summary: string;
  after_summary: string;
  rationale: string;
}): Amendment {
  return {
    id: crypto.randomUUID(),
    session_id: params.session_id,
    turn_number: params.turn_number,
    agent_id: params.agent_id,
    user_id: params.user_id,
    section_path: params.section_path,
    operation: params.operation,
    before_summary: params.before_summary,
    after_summary: params.after_summary,
    rationale: params.rationale,
    created_at: new Date().toISOString(),
  };
}
