/**
 * Seed 10 built-in Studio document templates — TASK-P09-02.
 *
 * Each template defines an ordered list of sections. Each section has:
 *   - title       short heading
 *   - description prompt for the section
 *   - source      'chamber' | 'grid' | 'manual'
 *                   chamber: pre-populate from a Chamber session
 *                   grid:    embed a Grid diagram
 *                   manual:  user writes from scratch
 *   - placeholder body shown until populated
 *
 * Idempotent: re-runs upsert by (tenant_id, name).
 *
 * Usage:
 *   pnpm --filter @chiselgrid/migration templates:seed
 */

import { query, rdsTyped } from './rds-client.js';

const DEFAULT_TENANT_ID =
  process.env['DEFAULT_TENANT_ID'] ?? '7d4e7c4f-4ded-4859-8db2-c7b5e2438f8c';

type Source = 'chamber' | 'grid' | 'manual';

interface TemplateSection {
  title: string;
  description: string;
  source: Source;
  placeholder: string;
}

interface TemplateSeed {
  name: string;
  description: string;
  category:
    | 'solutions_design'
    | 'rfp_response'
    | 'architecture_review'
    | 'incident_report'
    | 'migration_runbook'
    | 'api_design'
    | 'feasibility_study'
    | 'security_review'
    | 'data_architecture'
    | 'engineering_proposal';
  sections: TemplateSection[];
}

const TEMPLATES: TemplateSeed[] = [
  {
    name: 'Solutions Design Document',
    description:
      'Ascendion-standard solutions design covering requirements, architecture, trade-offs and ADRs.',
    category: 'solutions_design',
    sections: [
      { title: 'Executive Summary', description: 'One-page overview of the engagement, problem, and recommended approach.', source: 'chamber', placeholder: 'Summarise the business outcome and the proposed solution in two paragraphs.' },
      { title: 'Requirements', description: 'Functional and non-functional requirements gathered from the client.', source: 'chamber', placeholder: 'List functional requirements as bullets. Group NFRs by performance, security, compliance.' },
      { title: 'Architecture', description: 'Target architecture diagram and component descriptions.', source: 'grid', placeholder: 'Embed the target architecture diagram here. Describe each component and the request flow.' },
      { title: 'Trade-off Analysis', description: 'Options considered, scoring, and why the chosen path wins.', source: 'chamber', placeholder: 'For each major decision, list 2–3 options with pros, cons, and the recommendation.' },
      { title: 'Architecture Decision Records', description: 'ADRs in MADR format for each accepted decision.', source: 'chamber', placeholder: 'Title / Status / Context / Decision / Consequences for each ADR.' },
      { title: 'Work Breakdown', description: 'WBS with effort estimates by sprint.', source: 'manual', placeholder: 'Phase → Epic → Story breakdown with effort in story points or person-days.' },
      { title: 'Risk Register', description: 'Top risks with likelihood, impact, and mitigation.', source: 'chamber', placeholder: 'Risk / Likelihood / Impact / Mitigation / Owner table.' },
    ],
  },
  {
    name: 'RFP Response',
    description: 'Standard structure for responding to client RFPs.',
    category: 'rfp_response',
    sections: [
      { title: 'Cover Letter', description: 'Signed cover letter from the engagement lead.', source: 'manual', placeholder: 'Address to procurement contact. Restate intent. Sign-off block.' },
      { title: 'Understanding the Requirement', description: 'Demonstrate that we have read and understood the RFP.', source: 'chamber', placeholder: 'Restate the client problem in our own words. Identify implicit constraints.' },
      { title: 'Proposed Solution', description: 'Solution narrative tied directly to RFP evaluation criteria.', source: 'chamber', placeholder: 'Map each evaluation criterion to a capability of the proposed solution.' },
      { title: 'Architecture', description: 'Reference architecture diagram for the proposed solution.', source: 'grid', placeholder: 'Embed the proposed architecture diagram. Highlight zones, integrations, and data flow.' },
      { title: 'Team', description: 'Proposed team structure, roles, and bios.', source: 'manual', placeholder: 'Org chart for the engagement. Bios for key roles.' },
      { title: 'Commercials', description: 'Pricing model, milestones, and payment terms.', source: 'manual', placeholder: 'T&M vs fixed-price breakdown. Milestones with payment percentages.' },
    ],
  },
  {
    name: 'Architecture Review Board Submission',
    description: 'Format expected by client ARB / TDA forums.',
    category: 'architecture_review',
    sections: [
      { title: 'Current State', description: 'Existing architecture and pain points being addressed.', source: 'grid', placeholder: 'Embed the current-state diagram. List the top three pain points.' },
      { title: 'Proposed Change', description: 'What is changing, and why now.', source: 'chamber', placeholder: 'Describe the delta from current state. Justify the timing.' },
      { title: 'Risk Assessment', description: 'Risks introduced by the change and residual risk after mitigation.', source: 'chamber', placeholder: 'Risk → Inherent → Mitigation → Residual table.' },
      { title: 'Compliance Evidence', description: 'How the proposal satisfies governance, security and regulatory requirements.', source: 'chamber', placeholder: 'Map each obligation (BSP, PCI, SOC2) to the controls in the design.' },
      { title: 'Approval Checklist', description: 'Pre-merge gates the ARB needs to sign off.', source: 'manual', placeholder: 'Checklist of approvals required, with assigned reviewers.' },
    ],
  },
  {
    name: 'Cloud Migration Runbook',
    description: 'Step-by-step runbook for a wave of cloud migrations.',
    category: 'migration_runbook',
    sections: [
      { title: 'Application Inventory', description: 'Apps in scope for this wave.', source: 'manual', placeholder: 'Application / Owner / Tier / Strategy (rehost, replatform, refactor).' },
      { title: 'Dependencies', description: 'Inter-app dependencies that constrain ordering.', source: 'grid', placeholder: 'Embed the dependency graph. Highlight blocking edges.' },
      { title: 'Migration Waves', description: 'Wave-by-wave schedule with cut-over windows.', source: 'manual', placeholder: 'Wave / Apps / Window / Lead. Note maintenance windows and freezes.' },
      { title: 'Rollback Plan', description: 'Per-app rollback steps and decision criteria.', source: 'chamber', placeholder: 'For each app: rollback trigger, owner, expected RTO.' },
      { title: 'Success Criteria', description: 'Quantitative and qualitative gates for each wave.', source: 'chamber', placeholder: 'SLO targets, error budget, business sign-off criteria.' },
    ],
  },
  {
    name: 'API Design Review',
    description: 'API design specification and reviewer checklist.',
    category: 'api_design',
    sections: [
      { title: 'Overview', description: 'API purpose, consumers, and SLAs.', source: 'chamber', placeholder: 'Who calls this API, why, and what SLA they expect.' },
      { title: 'Endpoints', description: 'Resource model and endpoint catalogue.', source: 'manual', placeholder: 'METHOD /resource — purpose, request, response, status codes.' },
      { title: 'Auth', description: 'Authentication and authorization model.', source: 'chamber', placeholder: 'Auth scheme (OAuth2 / mTLS / API key). Authorization rules per endpoint.' },
      { title: 'Error Handling', description: 'Error envelope and retry guidance.', source: 'manual', placeholder: 'Error code taxonomy. Retryable vs non-retryable. Idempotency key rules.' },
      { title: 'Rate Limits', description: 'Per-consumer quotas and throttling behaviour.', source: 'manual', placeholder: 'Quota per tier, burst handling, 429 response shape.' },
      { title: 'Versioning', description: 'Versioning strategy and deprecation policy.', source: 'manual', placeholder: 'URL vs header versioning. Deprecation notice window.' },
      { title: 'Security', description: 'Threat model and security controls for the API surface.', source: 'chamber', placeholder: 'OWASP API Top 10 coverage. Sensitive field handling.' },
    ],
  },
  {
    name: 'Incident Post-Mortem',
    description: 'Blameless post-mortem for a customer-impacting incident.',
    category: 'incident_report',
    sections: [
      { title: 'Timeline', description: 'Minute-by-minute sequence of events.', source: 'chamber', placeholder: 'HH:MM — event description, with link to evidence (alert, log, chat).' },
      { title: 'Root Cause', description: 'Underlying cause identified via 5 Whys.', source: 'chamber', placeholder: 'State the root cause and how it was confirmed.' },
      { title: 'Impact Assessment', description: 'Customer and business impact quantified.', source: 'chamber', placeholder: 'Affected users, transactions, revenue. Time to detect, time to resolve.' },
      { title: 'Resolution', description: 'Steps taken to restore service.', source: 'chamber', placeholder: 'Mitigation applied, verification steps, communication issued.' },
      { title: 'Action Items', description: 'Follow-up tasks with owners and dates.', source: 'manual', placeholder: 'Action / Owner / Due / Status. Mark P0 items as blockers.' },
      { title: 'Prevention', description: 'Systemic changes to prevent recurrence.', source: 'chamber', placeholder: 'Detection improvements, process changes, tests added.' },
    ],
  },
  {
    name: 'Technical Feasibility Study',
    description: 'Pre-engagement feasibility analysis for a new initiative.',
    category: 'feasibility_study',
    sections: [
      { title: 'Executive Summary', description: 'Recommendation and confidence level in two paragraphs.', source: 'chamber', placeholder: 'Go / No-go recommendation, with confidence and key assumptions.' },
      { title: 'Requirements', description: 'In-scope and out-of-scope requirements.', source: 'chamber', placeholder: 'Must-have, should-have, won\'t-have grouping.' },
      { title: 'Options Analysis', description: 'Candidate approaches scored against criteria.', source: 'chamber', placeholder: 'Option / Effort / Risk / Time-to-value / Score.' },
      { title: 'Recommendation', description: 'Selected option and rationale.', source: 'chamber', placeholder: 'Chosen option, why it wins, and what would change the answer.' },
      { title: 'Effort Estimate', description: 'High-level effort, team shape and timeline.', source: 'manual', placeholder: 'Person-months, team composition, calendar duration.' },
      { title: 'Risks', description: 'Top risks with likelihood and mitigation.', source: 'chamber', placeholder: 'Risk / Likelihood / Impact / Mitigation table.' },
    ],
  },
  {
    name: 'Security Architecture Review',
    description: 'STRIDE-driven security review for a new or changed system.',
    category: 'security_review',
    sections: [
      { title: 'Threat Model', description: 'Trust boundaries, data flows, and threat actors.', source: 'grid', placeholder: 'Embed the data-flow diagram with trust boundaries highlighted.' },
      { title: 'STRIDE Analysis', description: 'Per-component STRIDE breakdown.', source: 'chamber', placeholder: 'Spoofing / Tampering / Repudiation / Info disclosure / DoS / EoP — per component.' },
      { title: 'Security Controls', description: 'Implemented and planned security controls.', source: 'chamber', placeholder: 'Control / Type (preventive, detective, corrective) / Status / Owner.' },
      { title: 'Compliance Gaps', description: 'Gaps against regulatory and contractual obligations.', source: 'chamber', placeholder: 'Obligation / Current state / Gap / Severity.' },
      { title: 'Remediation Plan', description: 'Plan to close identified gaps.', source: 'manual', placeholder: 'Item / Owner / Target date / Acceptance criteria.' },
    ],
  },
  {
    name: 'Data Architecture Document',
    description: 'Domain model, data flow, and governance for a data platform.',
    category: 'data_architecture',
    sections: [
      { title: 'Domain Model', description: 'Entities, relationships and aggregate boundaries.', source: 'grid', placeholder: 'Embed the domain model diagram. Describe each aggregate root.' },
      { title: 'Data Flow', description: 'Sources, sinks, and transformations.', source: 'grid', placeholder: 'Embed the data-flow diagram. List source systems and target stores.' },
      { title: 'Storage Decisions', description: 'Per-store choice rationale.', source: 'chamber', placeholder: 'Workload / Store / Why (consistency, cost, latency).' },
      { title: 'Privacy', description: 'PII handling, classification, and access controls.', source: 'chamber', placeholder: 'Field-level classification (public, internal, confidential, restricted).' },
      { title: 'Governance', description: 'Ownership, stewardship, and quality SLAs.', source: 'chamber', placeholder: 'Domain / Owner / Steward / Quality SLA.' },
      { title: 'Retention', description: 'Retention and deletion policy per data class.', source: 'manual', placeholder: 'Class / Retention period / Deletion method / Legal basis.' },
    ],
  },
  {
    name: 'Engineering Proposal',
    description: 'Internal engineering proposal for a non-trivial change.',
    category: 'engineering_proposal',
    sections: [
      { title: 'Problem Statement', description: 'What problem this proposal solves and for whom.', source: 'chamber', placeholder: 'State the problem in user terms. Quantify the impact today.' },
      { title: 'Solution Options', description: 'Considered approaches with high-level trade-offs.', source: 'chamber', placeholder: 'Option / Pros / Cons / Effort estimate.' },
      { title: 'Recommendation', description: 'Chosen option and the reasoning.', source: 'chamber', placeholder: 'Selected option and the deciding criteria.' },
      { title: 'Effort', description: 'Engineering effort and skills needed.', source: 'manual', placeholder: 'Person-weeks per discipline. Skills required.' },
      { title: 'Timeline', description: 'Major milestones and dependencies.', source: 'manual', placeholder: 'Milestone / Date / Dependency / Owner.' },
      { title: 'Dependencies', description: 'Cross-team or cross-system dependencies that gate delivery.', source: 'manual', placeholder: 'Dependency / Team / Status / Risk if delayed.' },
    ],
  },
];

async function upsert(template: TemplateSeed): Promise<void> {
  const sectionsJson = template.sections.map((s) => ({
    title: s.title,
    description: s.description,
    source: s.source,
    placeholder: s.placeholder,
  }));

  await query(
    `INSERT INTO studio_templates
       (tenant_id, name, description, category, sections_json, is_public, created_by)
     VALUES ($1, $2, $3, $4, $5, TRUE, 'system')
     ON CONFLICT DO NOTHING`,
    [
      DEFAULT_TENANT_ID,
      template.name,
      template.description,
      template.category,
      rdsTyped(sectionsJson, 'JSON'),
    ],
  );
}

async function ensureUniqueIndex(): Promise<void> {
  // Allow ON CONFLICT DO NOTHING in upsert by name within tenant.
  await query(
    `CREATE UNIQUE INDEX IF NOT EXISTS studio_templates_tenant_name_uniq
       ON studio_templates(tenant_id, name)`,
  );
}

async function main(): Promise<void> {
  await ensureUniqueIndex();

  // Drop any existing system-seeded templates to keep section ordering and
  // copy in sync with this file. User-created templates (created_by != 'system')
  // are untouched.
  await query(`DELETE FROM studio_templates WHERE created_by = 'system' AND tenant_id = $1`, [
    DEFAULT_TENANT_ID,
  ]);

  for (const t of TEMPLATES) {
    console.log(`→ seeding template: ${t.name}`);
    await upsert(t);
  }

  const { rows } = await query(
    `SELECT category, name FROM studio_templates
      WHERE tenant_id = $1
      ORDER BY category, name`,
    [DEFAULT_TENANT_ID],
  );
  console.log(`seeded ${rows.length} templates:`);
  for (const r of rows) {
    console.log(`  [${r['category']}] ${r['name']}`);
  }
}

const entry = process.argv[1] ?? '';
if (entry.endsWith('seed-studio-templates.ts') || entry.endsWith('seed-studio-templates.js')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
