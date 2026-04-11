// ─── Criticality ───────────────────────────────────────────────
export const CRITICALITY_TIERS = [1, 2, 3, 4] as const;
export type CriticalityTier = (typeof CRITICALITY_TIERS)[number];

export const CRITICALITY_GENERATION_GATES: Record<CriticalityTier, number> = {
  1: 95,
  2: 85,
  3: 76,
  4: 20,
};

// ─── Intent ────────────────────────────────────────────────────
export const INTENT_TYPES = [
  'greenfield',
  'brownfield_enhancement',
  'migration',
  'modernization',
  'reverse_engineering',
  'assessment',
  'troubleshooting',
  'deployment_design',
  'solution_blueprint',
  'current_state_doc',
  'future_state_design',
  'options_comparison',
  'compliance_review',
  'operating_model',
] as const;
export type IntentType = (typeof INTENT_TYPES)[number];

// ─── Fidelity ──────────────────────────────────────────────────
export const FIDELITY_LEVELS = [
  'conceptual',
  'logical',
  'physical',
  'deployment_ready',
  'production_grade',
  'review_only',
] as const;
export type FidelityLevel = (typeof FIDELITY_LEVELS)[number];

// ─── Cloud platforms ───────────────────────────────────────────
export const CLOUD_PLATFORMS = [
  'aws',
  'azure',
  'gcp',
  'oracle_cloud',
  'alibaba',
  'on_premise',
  'private_cloud',
  'hybrid',
  'multi_cloud',
  'saas_heavy',
  'mainframe',
] as const;
export type CloudPlatform = (typeof CLOUD_PLATFORMS)[number];

// ─── Compliance ────────────────────────────────────────────────
export const COMPLIANCE_TAGS = [
  'pci_dss_v4',
  'hipaa',
  'gdpr',
  'sox',
  'iso27001',
  'soc2_type2',
  'bsp_morb',
  'mas_trm',
  'rbi_it_framework',
  'do_178c',
  'iec_62443',
  'nist_csf',
  'cis_benchmarks',
  'fedramp',
] as const;
export type ComplianceTag = (typeof COMPLIANCE_TAGS)[number];

// ─── Pillars ───────────────────────────────────────────────────
export const PILLARS = [
  'performance',
  'security',
  'cost',
  'reliability',
  'operational_excellence',
  'sustainability',
] as const;
export type Pillar = (typeof PILLARS)[number];

// ─── Gaps ──────────────────────────────────────────────────────
export const GAP_TYPES = [
  'existence',
  'accuracy',
  'completeness',
  'coherence',
] as const;
export type GapType = (typeof GAP_TYPES)[number];

// ─── Diagrams ──────────────────────────────────────────────────
export const DIAGRAM_TYPES = [
  'c4_context',
  'c4_container',
  'c4_component',
  'c4_deployment',
  'network_security',
  'sequence',
  'event_flow',
  'dr_ha_topology',
  'iam_identity',
  'ci_cd_pipeline',
  'data_flow',
  'integration_landscape',
] as const;
export type DiagramType = (typeof DIAGRAM_TYPES)[number];

export type DiagramFormat = 'drawio_xml' | 'mermaid';

export const DIAGRAM_FORMAT_MAP: Record<DiagramType, DiagramFormat> = {
  c4_context: 'drawio_xml',
  c4_container: 'drawio_xml',
  c4_component: 'drawio_xml',
  c4_deployment: 'drawio_xml',
  network_security: 'drawio_xml',
  sequence: 'mermaid',
  event_flow: 'mermaid',
  dr_ha_topology: 'drawio_xml',
  iam_identity: 'drawio_xml',
  ci_cd_pipeline: 'mermaid',
  data_flow: 'mermaid',
  integration_landscape: 'drawio_xml',
};

// ─── Agents ────────────────────────────────────────────────────
export const AGENT_IDS = [
  'context_analyzer',
  'architecture_generator',
  'diagram_generator',
  'tradeoff_analyzer',
  'review_validator',
  'estimator',
  'document_generator',
] as const;
export type AgentId = (typeof AGENT_IDS)[number];

export const AGENT_SECTION_OWNERSHIP: Record<AgentId, string[]> = {
  context_analyzer: ['intent', 'requirements', 'assumptions.pending'],
  architecture_generator: ['architecture.components', 'architecture.relationships'],
  diagram_generator: ['diagrams'],
  tradeoff_analyzer: ['architecture.decisions', 'analysis.tradeoffs', 'analysis.adrs', 'analysis.risks'],
  review_validator: ['analysis.pillar_scores'],
  estimator: ['estimates'],
  document_generator: [],
};

// ─── Conflicts ─────────────────────────────────────────────────
export const BLOCKING_CONFLICT_TYPES = new Set([
  'compliance_architecture_contradiction',
  'requirement_capability_contradiction',
]);

export const CONFLICT_TYPES = [
  'compliance_architecture_contradiction',
  'requirement_capability_contradiction',
  'nfr_architecture_mismatch',
  'assumption_contradiction',
] as const;
export type ConflictType = (typeof CONFLICT_TYPES)[number];

// ─── Inference confidence ──────────────────────────────────────
export const INFERENCE_CONFIDENCE = {
  AUTO_RESOLVE: 0.95,
  SURFACE_CONFIRM: 0.75,
  TENTATIVE: 0.60,
  MUST_ASK: 0.00,
} as const;

// ─── Section status ────────────────────────────────────────────
export const SECTION_STATUSES = [
  'empty',
  'partial',
  'complete',
  'validated',
] as const;
export type SectionStatus = (typeof SECTION_STATUSES)[number];

// ─── Severity ──────────────────────────────────────────────────
export const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type Severity = (typeof SEVERITIES)[number];

// ─── Assumption source ─────────────────────────────────────────
export const ASSUMPTION_SOURCES = [
  'inferred',
  'user_stated',
  'agent_generated',
  'kb_derived',
] as const;
export type AssumptionSource = (typeof ASSUMPTION_SOURCES)[number];

// ─── Project type ──────────────────────────────────────────────
export const PROJECT_TYPES = [
  'greenfield',
  'brownfield',
  'migration',
  'modernization',
  'assessment',
] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];
