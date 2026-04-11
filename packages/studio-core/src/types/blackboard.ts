import type {
  AgentId,
  AssumptionSource,
  CloudPlatform,
  ComplianceTag,
  ConflictType,
  CriticalityTier,
  DiagramFormat,
  DiagramType,
  FidelityLevel,
  GapType,
  IntentType,
  Pillar,
  ProjectType,
  SectionStatus,
  Severity,
} from '../constants/enums.js';

// ─── Intent ────────────────────────────────────────────────────
export interface IntentSection {
  type: IntentType;
  project_type: ProjectType;
  fidelity: FidelityLevel;
  criticality_tier: CriticalityTier;
  criticality_challenged: boolean;
  criticality_signals: string[];
  domain: string;
  sub_domain?: string | undefined;
  jurisdiction: string[];
  cloud_platforms: CloudPlatform[];
  compliance_tags: ComplianceTag[];
  status: SectionStatus;
}

// ─── Requirements ──────────────────────────────────────────────
export interface FunctionalRequirement {
  id: string;
  title: string;
  description: string;
  priority: 'must_have' | 'should_have' | 'nice_to_have';
  source: string;
}

export interface NonFunctionalRequirements {
  availability_sla?: string | undefined;
  rto_minutes?: number | undefined;
  rpo_minutes?: number | undefined;
  latency_p99_ms?: number | undefined;
  throughput_rps?: number | undefined;
  concurrent_users?: number | undefined;
  data_residency?: string[] | undefined;
  retention_years?: number | undefined;
  has_ha_claim: boolean;
  has_dr_strategy: boolean;
}

export interface Constraint {
  id: string;
  description: string;
  type: 'technical' | 'business' | 'regulatory' | 'timeline';
  source: string;
}

export interface RequirementsSection {
  functional: FunctionalRequirement[];
  nfr: NonFunctionalRequirements;
  compliance: ComplianceTag[];
  constraints: Constraint[];
  status: SectionStatus;
}

// ─── Architecture ──────────────────────────────────────────────
export interface Component {
  id: string;
  name: string;
  type: string;
  cloud_service?: string | undefined;
  cloud_icon_id?: string | undefined;
  description: string;
  rationale: string;
  alternatives_considered: string[];
  failure_modes: string[];
  assumptions: string[];
  status: SectionStatus;
}

export interface Relationship {
  id: string;
  from_id: string;
  to_id: string;
  label: string;
  protocol?: string | undefined;
  sync: boolean;
  description: string;
}

export interface ArchitecturalDecision {
  id: string;
  title: string;
  description: string;
  rationale: string;
  status: 'proposed' | 'accepted' | 'rejected';
}

export interface ArchitectureSection {
  components: Component[];
  relationships: Relationship[];
  decisions: ArchitecturalDecision[];
  status: SectionStatus;
}

// ─── Diagrams ──────────────────────────────────────────────────
export interface GeneratedDiagram {
  id: string;
  type: DiagramType;
  format: DiagramFormat;
  content: string;
  title: string;
  description: string;
  version: number;
  has_pending_assumptions: boolean;
  s3_key?: string | undefined;
  generated_at: string;
  agent_turn: number;
}

export interface DiagramsSection {
  c4_context?: GeneratedDiagram | undefined;
  c4_container?: GeneratedDiagram | undefined;
  c4_deployment?: GeneratedDiagram | undefined;
  network_security?: GeneratedDiagram | undefined;
  sequence: GeneratedDiagram[];
  additional: GeneratedDiagram[];
  status: SectionStatus;
}

// ─── Analysis ──────────────────────────────────────────────────
export interface TradeOff {
  id: string;
  decision_area: string;
  option_a: string;
  option_b: string;
  chosen: 'a' | 'b' | 'neither';
  criteria: Array<{
    criterion: string;
    a_score: 1 | 2 | 3 | 4 | 5;
    b_score: 1 | 2 | 3 | 4 | 5;
    weight: number;
  }>;
  rationale: string;
  tarka_challenges: Array<{
    challenge: string;
    response: string;
    resolution: 'accepted' | 'overridden' | 'escalated';
  }>;
}

export interface ADR {
  id: string;
  title: string;
  status: 'proposed' | 'accepted' | 'superseded' | 'deprecated';
  context: string;
  decision: string;
  rationale: string;
  alternatives: Array<{ option: string; reason_rejected: string }>;
  consequences: string[];
  superseded_by?: string | undefined;
  created_at: string;
  confirmed_by?: string | undefined;
}

export interface PillarScore {
  score: number;
  findings: string[];
  recommendations: string[];
}

export interface Risk {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  likelihood: 'low' | 'medium' | 'high';
  mitigation: string;
  component_ids: string[];
}

export interface TwelveFactorFinding {
  factor: string;
  compliant: boolean;
  notes: string;
}

export interface AnalysisSection {
  tradeoffs: TradeOff[];
  adrs: ADR[];
  pillar_scores: Partial<Record<Pillar, PillarScore>>;
  risks: Risk[];
  overall_readiness_score: number;
  twelve_factor_findings: TwelveFactorFinding[];
  status: SectionStatus;
}

// ─── Estimates ─────────────────────────────────────────────────
export interface WBSItem {
  id: string;
  type: 'epic' | 'story' | 'task';
  parent_id?: string | undefined;
  title: string;
  description: string;
  acceptance_criteria: string[];
  story_points?: number | undefined;
  t_shirt_size?: string | undefined;
  component_ids: string[];
  role_required: string;
}

export interface ResourceRole {
  role: string;
  count: number;
  skills: string[];
}

export interface EstimatesSection {
  wbs: WBSItem[];
  total_story_points?: number | undefined;
  timeline_weeks_low: number;
  timeline_weeks_high: number;
  resource_plan: ResourceRole[];
  cost_estimate?: string | undefined;
  status: SectionStatus;
}

// ─── Assumptions ───────────────────────────────────────────────
export interface Assumption {
  id: string;
  statement: string;
  source: AssumptionSource;
  confidence: number;
  affected_components: string[];
  override_value?: string | undefined;
  confirmed_at?: string | undefined;
  confirmed_by?: string | undefined;
}

export interface AssumptionsSection {
  confirmed: Assumption[];
  pending: Assumption[];
  forbidden_defaults: string[];
}

// ─── Conflicts ─────────────────────────────────────────────────
export interface FactReference {
  statement: string;
  source: string;
  turn: number;
}

export interface Conflict {
  id: string;
  type: ConflictType;
  blocking: boolean;
  fact_a: FactReference;
  fact_b: FactReference;
  resolution_options: string[];
  resolved: boolean;
  resolution?: string | undefined;
  resolved_at?: string | undefined;
  resolved_by?: string | undefined;
  adr_id?: string | undefined;
}

// ─── Gaps ──────────────────────────────────────────────────────
export interface Gap {
  id: string;
  type: GapType;
  field_path: string;
  description: string;
  severity: Severity;
  blocking: boolean;
  question?: string | undefined;
  resolved: boolean;
  resolution?: string | undefined;
}

// ─── Amendments & Audit ────────────────────────────────────────
export interface Amendment {
  id: string;
  session_id: string;
  turn_number: number;
  agent_id?: AgentId | undefined;
  user_id?: string | undefined;
  section_path: string;
  operation: string;
  before_summary: string;
  after_summary: string;
  rationale: string;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  session_id: string;
  tenant_id: string;
  turn_number: number;
  event_type: string;
  actor_type: 'user' | 'agent' | 'system';
  actor_id: string;
  payload: Record<string, unknown>;
  created_at: string;
}

// ─── Human Gate ────────────────────────────────────────────────
export interface HumanGate {
  id: string;
  session_id: string;
  tenant_id: string;
  triggered_by_agent: AgentId;
  description: string;
  context_json: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string | undefined;
  review_notes?: string | undefined;
  created_at: string;
  resolved_at?: string | undefined;
}

// ─── Session Lineage ───────────────────────────────────────────
export interface SessionLineage {
  parent_session_id?: string | undefined;
  fork_turn?: number | undefined;
  fork_reason?: string | undefined;
}

// ─── Exported Artifact ─────────────────────────────────────────
export interface ExportedArtifact {
  id: string;
  artifact_type: string;
  version: number;
  s3_key: string;
  exported_at: string;
  exported_by: string;
}

// ─── Design Blackboard (central state) ─────────────────────────
export interface DesignBlackboard {
  // Identity
  session_id: string;
  grid_id: string;
  workspace_id: string;
  tenant_id: string;
  created_by: string;
  kb_version: string;
  schema_version: string;
  created_at: string;
  updated_at: string;
  turn_count: number;

  // Agent sections
  intent: IntentSection;
  requirements: RequirementsSection;
  architecture: ArchitectureSection;
  diagrams: DiagramsSection;
  analysis: AnalysisSection;
  estimates: EstimatesSection;

  // Cross-cutting
  assumptions: AssumptionsSection;
  conflicts: Conflict[];
  gaps: Gap[];

  // Immutable append-only
  amendments: Amendment[];
  audit_trail: AuditEvent[];

  // Lineage
  session_lineage: SessionLineage;

  // Gates
  human_gates: HumanGate[];

  // Exports
  exported_artifacts: ExportedArtifact[];
}

// ─── Patch types ───────────────────────────────────────────────
export interface BlackboardPatch {
  intent?: Partial<IntentSection> | undefined;
  requirements?: Partial<RequirementsSection> | undefined;
  architecture?: Partial<ArchitectureSection> | undefined;
  diagrams?: Partial<DiagramsSection> | undefined;
  analysis?: Partial<AnalysisSection> | undefined;
  estimates?: Partial<EstimatesSection> | undefined;
  assumptions?: Partial<AssumptionsSection> | undefined;
  conflicts?: Conflict[] | undefined;
  gaps?: Gap[] | undefined;
  amendments?: Amendment[] | undefined;
  audit_events?: AuditEvent[] | undefined;
}

// ─── Agent context & result ────────────────────────────────────
export interface AgentTrigger {
  type: 'initial_generation' | 'user_refinement' | 'tarka_challenge';
  changed_paths?: string[] | undefined;
  user_message?: string | undefined;
}

export interface AgentContext {
  session_id: string;
  tenant_id: string;
  turn: number;
  blackboard: DesignBlackboard;
  trigger: AgentTrigger;
  kb_version: string;
}

export interface AgentResult {
  agent_id: AgentId;
  session_id: string;
  turn: number;
  success: boolean;
  patch: BlackboardPatch;
  error?: string | undefined;
  duration_ms: number;
  bedrock_tokens_used?: number | undefined;
}
