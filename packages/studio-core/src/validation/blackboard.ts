import { z } from 'zod';
import {
  CRITICALITY_TIERS,
  INTENT_TYPES,
  FIDELITY_LEVELS,
  CLOUD_PLATFORMS,
  COMPLIANCE_TAGS,
  PILLARS,
  GAP_TYPES,
  DIAGRAM_TYPES,
  AGENT_IDS,
  SECTION_STATUSES,
  SEVERITIES,
  ASSUMPTION_SOURCES,
  CONFLICT_TYPES,
  PROJECT_TYPES,
} from '../constants/enums';

// ─── Primitives ────────────────────────────────────────────────
const SectionStatusSchema = z.enum(SECTION_STATUSES);
const SeveritySchema = z.enum(SEVERITIES);
const CriticalityTierSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
const AgentIdSchema = z.enum(AGENT_IDS);

// ─── Intent ────────────────────────────────────────────────────
export const IntentSectionSchema = z.object({
  type: z.enum(INTENT_TYPES),
  project_type: z.enum(PROJECT_TYPES),
  fidelity: z.enum(FIDELITY_LEVELS),
  criticality_tier: CriticalityTierSchema,
  criticality_challenged: z.boolean(),
  criticality_signals: z.array(z.string()),
  domain: z.string(),
  sub_domain: z.string().optional(),
  jurisdiction: z.array(z.string()),
  cloud_platforms: z.array(z.enum(CLOUD_PLATFORMS)),
  compliance_tags: z.array(z.enum(COMPLIANCE_TAGS)),
  status: SectionStatusSchema,
});

// ─── Requirements ──────────────────────────────────────────────
const FunctionalRequirementSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  priority: z.enum(['must_have', 'should_have', 'nice_to_have']),
  source: z.string(),
});

export const NfrSchema = z.object({
  availability_sla: z.string().optional(),
  rto_minutes: z.number().optional(),
  rpo_minutes: z.number().optional(),
  latency_p99_ms: z.number().optional(),
  throughput_rps: z.number().optional(),
  concurrent_users: z.number().optional(),
  data_residency: z.array(z.string()).optional(),
  retention_years: z.number().optional(),
  has_ha_claim: z.boolean(),
  has_dr_strategy: z.boolean(),
}).superRefine((data, ctx) => {
  if (data.has_ha_claim && !data.has_dr_strategy) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Coherence gap: HA claim requires DR strategy. A system cannot claim high availability without a disaster recovery strategy.',
      path: ['has_dr_strategy'],
    });
  }
});

const ConstraintSchema = z.object({
  id: z.string(),
  description: z.string(),
  type: z.enum(['technical', 'business', 'regulatory', 'timeline']),
  source: z.string(),
});

export const RequirementsSectionSchema = z.object({
  functional: z.array(FunctionalRequirementSchema),
  nfr: NfrSchema,
  compliance: z.array(z.enum(COMPLIANCE_TAGS)),
  constraints: z.array(ConstraintSchema),
  status: SectionStatusSchema,
});

// ─── Architecture ──────────────────────────────────────────────
const ComponentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  cloud_service: z.string().optional(),
  cloud_icon_id: z.string().optional(),
  description: z.string(),
  rationale: z.string().min(10),
  alternatives_considered: z.array(z.string()),
  failure_modes: z.array(z.string()),
  assumptions: z.array(z.string()),
  status: SectionStatusSchema,
});

const RelationshipSchema = z.object({
  id: z.string(),
  from_id: z.string(),
  to_id: z.string(),
  label: z.string(),
  protocol: z.string().optional(),
  sync: z.boolean(),
  description: z.string(),
});

const ArchitecturalDecisionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  rationale: z.string(),
  status: z.enum(['proposed', 'accepted', 'rejected']),
});

export const ArchitectureSectionSchema = z.object({
  components: z.array(ComponentSchema),
  relationships: z.array(RelationshipSchema),
  decisions: z.array(ArchitecturalDecisionSchema),
  status: SectionStatusSchema,
});

// ─── Diagrams ──────────────────────────────────────────────────
const GeneratedDiagramSchema = z.object({
  id: z.string(),
  type: z.enum(DIAGRAM_TYPES),
  format: z.enum(['drawio_xml', 'mermaid']),
  content: z.string(),
  title: z.string(),
  description: z.string(),
  version: z.number(),
  has_pending_assumptions: z.boolean(),
  s3_key: z.string().optional(),
  generated_at: z.string(),
  agent_turn: z.number(),
});

export const DiagramsSectionSchema = z.object({
  c4_context: GeneratedDiagramSchema.optional(),
  c4_container: GeneratedDiagramSchema.optional(),
  c4_deployment: GeneratedDiagramSchema.optional(),
  network_security: GeneratedDiagramSchema.optional(),
  sequence: z.array(GeneratedDiagramSchema),
  additional: z.array(GeneratedDiagramSchema),
  status: SectionStatusSchema,
});

// ─── Analysis ──────────────────────────────────────────────────
const TradeOffSchema = z.object({
  id: z.string(),
  decision_area: z.string(),
  option_a: z.string(),
  option_b: z.string(),
  chosen: z.enum(['a', 'b', 'neither']),
  criteria: z.array(z.object({
    criterion: z.string(),
    a_score: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    b_score: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    weight: z.number(),
  })),
  rationale: z.string(),
  tarka_challenges: z.array(z.object({
    challenge: z.string(),
    response: z.string(),
    resolution: z.enum(['accepted', 'overridden', 'escalated']),
  })),
});

const AdrSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['proposed', 'accepted', 'superseded', 'deprecated']),
  context: z.string(),
  decision: z.string(),
  rationale: z.string(),
  alternatives: z.array(z.object({ option: z.string(), reason_rejected: z.string() })),
  consequences: z.array(z.string()),
  superseded_by: z.string().optional(),
  created_at: z.string(),
  confirmed_by: z.string().optional(),
});

const PillarScoreSchema = z.object({
  score: z.number(),
  findings: z.array(z.string()),
  recommendations: z.array(z.string()),
});

const RiskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  severity: SeveritySchema,
  likelihood: z.enum(['low', 'medium', 'high']),
  mitigation: z.string(),
  component_ids: z.array(z.string()),
});

const TwelveFactorFindingSchema = z.object({
  factor: z.string(),
  compliant: z.boolean(),
  notes: z.string(),
});

export const AnalysisSectionSchema = z.object({
  tradeoffs: z.array(TradeOffSchema),
  adrs: z.array(AdrSchema),
  pillar_scores: z.record(z.enum(PILLARS), PillarScoreSchema).default({}),
  risks: z.array(RiskSchema),
  overall_readiness_score: z.number().min(0).max(100),
  twelve_factor_findings: z.array(TwelveFactorFindingSchema),
  status: SectionStatusSchema,
});

// ─── Estimates ─────────────────────────────────────────────────
const WbsItemSchema = z.object({
  id: z.string(),
  type: z.enum(['epic', 'story', 'task']),
  parent_id: z.string().optional(),
  title: z.string(),
  description: z.string(),
  acceptance_criteria: z.array(z.string()),
  story_points: z.number().optional(),
  t_shirt_size: z.string().optional(),
  component_ids: z.array(z.string()),
  role_required: z.string(),
});

const ResourceRoleSchema = z.object({
  role: z.string(),
  count: z.number(),
  skills: z.array(z.string()),
});

export const EstimatesSectionSchema = z.object({
  wbs: z.array(WbsItemSchema),
  total_story_points: z.number().optional(),
  timeline_weeks_low: z.number(),
  timeline_weeks_high: z.number(),
  resource_plan: z.array(ResourceRoleSchema),
  cost_estimate: z.string().optional(),
  status: SectionStatusSchema,
});

// ─── Assumptions ───────────────────────────────────────────────
const AssumptionSchema = z.object({
  id: z.string(),
  statement: z.string(),
  source: z.enum(ASSUMPTION_SOURCES),
  confidence: z.number().min(0).max(1),
  affected_components: z.array(z.string()),
  override_value: z.string().optional(),
  confirmed_at: z.string().optional(),
  confirmed_by: z.string().optional(),
});

export const AssumptionsSectionSchema = z.object({
  confirmed: z.array(AssumptionSchema),
  pending: z.array(AssumptionSchema),
  forbidden_defaults: z.array(z.string()),
});

// ─── Conflicts ─────────────────────────────────────────────────
const FactReferenceSchema = z.object({
  statement: z.string(),
  source: z.string(),
  turn: z.number(),
});

const ConflictSchema = z.object({
  id: z.string(),
  type: z.enum(CONFLICT_TYPES),
  blocking: z.boolean(),
  fact_a: FactReferenceSchema,
  fact_b: FactReferenceSchema,
  resolution_options: z.array(z.string()),
  resolved: z.boolean(),
  resolution: z.string().optional(),
  resolved_at: z.string().optional(),
  resolved_by: z.string().optional(),
  adr_id: z.string().optional(),
});

// ─── Gaps ──────────────────────────────────────────────────────
const GapSchema = z.object({
  id: z.string(),
  type: z.enum(GAP_TYPES),
  field_path: z.string(),
  description: z.string(),
  severity: SeveritySchema,
  blocking: z.boolean(),
  question: z.string().optional(),
  resolved: z.boolean(),
  resolution: z.string().optional(),
});

// ─── Amendments & Audit ────────────────────────────────────────
const AmendmentSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  turn_number: z.number(),
  agent_id: AgentIdSchema.optional(),
  user_id: z.string().optional(),
  section_path: z.string(),
  operation: z.string(),
  before_summary: z.string(),
  after_summary: z.string(),
  rationale: z.string(),
  created_at: z.string(),
});

const AuditEventSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  tenant_id: z.string(),
  turn_number: z.number(),
  event_type: z.string(),
  actor_type: z.enum(['user', 'agent', 'system']),
  actor_id: z.string(),
  payload: z.record(z.unknown()),
  created_at: z.string(),
});

// ─── Human Gate ────────────────────────────────────────────────
const HumanGateSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  tenant_id: z.string(),
  triggered_by_agent: AgentIdSchema,
  description: z.string(),
  context_json: z.record(z.unknown()),
  status: z.enum(['pending', 'approved', 'rejected']),
  reviewed_by: z.string().optional(),
  review_notes: z.string().optional(),
  created_at: z.string(),
  resolved_at: z.string().optional(),
});

// ─── Session Lineage ───────────────────────────────────────────
const SessionLineageSchema = z.object({
  parent_session_id: z.string().optional(),
  fork_turn: z.number().optional(),
  fork_reason: z.string().optional(),
});

// ─── Exported Artifact ─────────────────────────────────────────
const ExportedArtifactSchema = z.object({
  id: z.string(),
  artifact_type: z.string(),
  version: z.number(),
  s3_key: z.string(),
  exported_at: z.string(),
  exported_by: z.string(),
});

// ─── Design Blackboard ────────────────────────────────────────
export const DesignBlackboardSchema = z.object({
  session_id: z.string(),
  grid_id: z.string(),
  workspace_id: z.string(),
  tenant_id: z.string(),
  created_by: z.string(),
  kb_version: z.string(),
  schema_version: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  turn_count: z.number(),

  intent: IntentSectionSchema,
  requirements: RequirementsSectionSchema,
  architecture: ArchitectureSectionSchema,
  diagrams: DiagramsSectionSchema,
  analysis: AnalysisSectionSchema,
  estimates: EstimatesSectionSchema,

  assumptions: AssumptionsSectionSchema,
  conflicts: z.array(ConflictSchema),
  gaps: z.array(GapSchema),

  amendments: z.array(AmendmentSchema),
  audit_trail: z.array(AuditEventSchema),

  session_lineage: SessionLineageSchema,
  human_gates: z.array(HumanGateSchema),
  exported_artifacts: z.array(ExportedArtifactSchema),
}).superRefine((data, ctx) => {
  // Block if any unresolved blocking conflict
  const unresolvedBlocking = data.conflicts.filter(c => c.blocking && !c.resolved);
  if (unresolvedBlocking.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Generation blocked: ${unresolvedBlocking.length} unresolved blocking conflict(s)`,
      path: ['conflicts'],
    });
  }

  // For Tier 1/2: forbidden defaults must be confirmed
  if (data.intent.criticality_tier <= 2) {
    const unconfirmedForbidden = data.assumptions.forbidden_defaults.filter(fd => {
      return !data.assumptions.confirmed.some(a => a.id === fd);
    });
    if (unconfirmedForbidden.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Tier ${data.intent.criticality_tier}: ${unconfirmedForbidden.length} forbidden default(s) not yet confirmed`,
        path: ['assumptions', 'forbidden_defaults'],
      });
    }
  }

  // For Tier 1/2: all human gates must be approved
  if (data.intent.criticality_tier <= 2) {
    const unapprovedGates = data.human_gates.filter(g => g.status !== 'approved');
    if (unapprovedGates.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Tier ${data.intent.criticality_tier}: ${unapprovedGates.length} unapproved human gate(s)`,
        path: ['human_gates'],
      });
    }
  }
});

// ─── Blackboard Patch ──────────────────────────────────────────
export const BlackboardPatchSchema = z.object({
  intent: IntentSectionSchema.partial().optional(),
  requirements: RequirementsSectionSchema.partial().optional(),
  architecture: ArchitectureSectionSchema.partial().optional(),
  diagrams: DiagramsSectionSchema.partial().optional(),
  analysis: AnalysisSectionSchema.partial().optional(),
  estimates: EstimatesSectionSchema.partial().optional(),
  assumptions: AssumptionsSectionSchema.partial().optional(),
  conflicts: z.array(ConflictSchema).optional(),
  gaps: z.array(GapSchema).optional(),
  amendments: z.array(AmendmentSchema).optional(),
  audit_events: z.array(AuditEventSchema).optional(),
});

// ─── Agent Context & Result ────────────────────────────────────
export const AgentContextSchema = z.object({
  session_id: z.string(),
  tenant_id: z.string(),
  turn: z.number(),
  blackboard: DesignBlackboardSchema,
  trigger: z.object({
    type: z.enum(['initial_generation', 'user_refinement', 'tarka_challenge']),
    changed_paths: z.array(z.string()).optional(),
    user_message: z.string().optional(),
  }),
  kb_version: z.string(),
});

export const AgentResultSchema = z.object({
  agent_id: AgentIdSchema,
  session_id: z.string(),
  turn: z.number(),
  success: z.boolean(),
  patch: BlackboardPatchSchema,
  error: z.string().optional(),
  duration_ms: z.number(),
  bedrock_tokens_used: z.number().optional(),
});
