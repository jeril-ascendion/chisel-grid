/**
 * Category mapping from ascendion.engineering URL paths to ChiselGrid categories.
 * Used by import-taxonomy.ts to seed categories and map articles.
 */

export interface CategoryDef {
  slug: string;
  name: string;
  parentSlug?: string;
  description?: string;
}

/** URL path → category slug */
export const URL_TO_CATEGORY: Record<string, string> = {
  'ai': 'ai-native-architecture',
  'ai/architecture': 'ai-architecture',
  'ai/ethics': 'ai-ethics',
  'ai/monitoring': 'ai-monitoring',
  'ai/rag': 'rag-architecture',
  'ai/security': 'ai-security',
  'cloud': 'cloud-infrastructure',
  'cloud/architecture': 'cloud-architecture',
  'cloud/aws': 'aws',
  'cloud/azure': 'azure',
  'cloud/containerization': 'containerization',
  'cloud/gcp': 'gcp',
  'cloud/iac': 'infrastructure-as-code',
  'cloud/oracle': 'oracle-cloud',
  'security': 'security',
  'security/appsec': 'application-security',
  'security/authn-authz': 'authentication-authorization',
  'security/cloud': 'cloud-security',
  'security/encryption': 'encryption',
  'security/vulnerability': 'vulnerability-management',
  'data': 'data-engineering',
  'data/analytics': 'data-analytics',
  'data/governance': 'data-governance',
  'data/integration': 'data-integration',
  'data/lineage': 'data-lineage',
  'data/mesh': 'data-mesh',
  'data/modeling': 'data-modeling',
  'patterns': 'design-patterns',
  'patterns/data': 'data-patterns',
  'patterns/deployment': 'deployment-patterns',
  'patterns/integration': 'integration-patterns',
  'patterns/security': 'security-patterns',
  'patterns/structural': 'structural-patterns',
  'system-design': 'system-design',
  'system-design/edge-ai': 'edge-ai',
  'system-design/event-driven': 'event-driven-architecture',
  'system-design/ha-dr': 'high-availability',
  'system-design/scalable': 'scalable-systems',
  'principles': 'architecture-principles',
  'principles/ai-native': 'ai-native-principles',
  'principles/domain-specific': 'domain-specific-principles',
  'principles/foundational': 'foundational-principles',
  'principles/modernization': 'modernization-principles',
  'observability': 'observability',
  'observability/incident-response': 'incident-response',
  'observability/logs': 'logging',
  'observability/metrics': 'metrics',
  'observability/sli-slo': 'sli-slo',
  'observability/traces': 'distributed-tracing',
  'infra': 'infrastructure',
  'infra/ci-cd': 'ci-cd',
  'infra/monitoring': 'infrastructure-monitoring',
  'infra/network': 'network-architecture',
  'infra/resilience': 'infrastructure-resilience',
  'infra/security': 'infrastructure-security',
  'governance': 'engineering-governance',
  'governance/checklists': 'governance-checklists',
  'governance/review-templates': 'review-templates',
  'governance/roles': 'governance-roles',
  'governance/scorecards': 'governance-scorecards',
  'compliance': 'compliance',
  'compliance/bsp-afasa': 'bsp-afasa',
  'compliance/gdpr': 'gdpr',
  'compliance/iso27001': 'iso-27001',
  'compliance/pci-dss': 'pci-dss',
  'integration': 'integration-patterns',
  'integration/api': 'api-integration',
  'integration/event': 'event-integration',
  'integration/messaging': 'messaging-integration',
  'integration/partners': 'partner-integration',
  'integration/workflow': 'workflow-integration',
  'ddd': 'domain-driven-design',
  'ddd/aggregates': 'ddd-aggregates',
  'ddd/context-maps': 'ddd-context-maps',
  'ddd/events': 'ddd-events',
  'ddd/repositories': 'ddd-repositories',
  'design': 'technical-design',
  'design/data': 'data-design',
  'design/low-level': 'low-level-design',
  'design/performance': 'performance-design',
  'design/resilience': 'resilience-design',
  'design/security': 'security-design',
  'frameworks': 'architecture-frameworks',
  'frameworks/gartner': 'gartner-framework',
  'frameworks/internal': 'internal-frameworks',
  'frameworks/nist': 'nist-framework',
  'frameworks/togaf': 'togaf',
  'frameworks/zachman': 'zachman-framework',
  'adrs': 'architecture-decision-records',
  'adrs/ai': 'ai-adrs',
  'adrs/data': 'data-adrs',
  'adrs/platform': 'platform-adrs',
  'adrs/security': 'security-adrs',
  'maturity': 'maturity-models',
  'maturity/guidelines': 'maturity-guidelines',
  'maturity/models': 'maturity-assessment',
  'nfr': 'non-functional-requirements',
  'nfr/maintainability': 'maintainability',
  'nfr/performance': 'performance-nfr',
  'nfr/reliability': 'reliability',
  'nfr/security': 'security-nfr',
  'nfr/usability': 'usability',
  'playbooks': 'engineering-playbooks',
  'playbooks/api-lifecycle': 'api-lifecycle-playbook',
  'playbooks/migration': 'migration-playbook',
  'playbooks/resilience': 'resilience-playbook',
  'roadmaps': 'technology-roadmaps',
  'roadmaps/modernization': 'modernization-roadmap',
  'roadmaps/target-architecture': 'target-architecture-roadmap',
  'roadmaps/tech-evolution': 'tech-evolution-roadmap',
  'runbooks': 'runbooks',
  'runbooks/incident': 'incident-runbook',
  'runbooks/migration': 'migration-runbook',
  'runbooks/rollback': 'rollback-runbook',
  'scorecards': 'architecture-scorecards',
  'scorecards/architecture-review': 'architecture-review-scorecard',
  'scorecards/nfr': 'nfr-scorecard',
  'scorecards/principles': 'principles-scorecard',
  'strategy': 'engineering-strategy',
  'strategy/ai-readiness': 'ai-readiness-strategy',
  'strategy/modernization': 'modernization-strategy',
  'strategy/principles': 'strategy-principles',
  'tech': 'technology',
  'tech/ai-ml': 'ai-ml-technologies',
  'tech/angular': 'angular',
  'tech/aws': 'aws-technologies',
  'tech/azure': 'azure-technologies',
  'tech/databases': 'database-technologies',
  'tech/devops': 'devops-tools',
  'tech/gcp': 'gcp-technologies',
  'tech/java-spring': 'java-spring',
  'templates': 'engineering-templates',
  'templates/adr-template': 'adr-template',
  'templates/review-template': 'review-template',
  'templates/scorecard-template': 'scorecard-template',
  'tools': 'engineering-tools',
  'tools/ai-agents': 'ai-agent-tools',
  'tools/cli': 'cli-tools',
  'tools/scripts': 'automation-scripts',
  'tools/validators': 'validation-tools',
  'views': 'architecture-views',
  'views/deployment': 'deployment-view',
  'views/logical': 'logical-view',
  'views/physical': 'physical-view',
  'views/process': 'process-view',
  'views/scenario': 'scenario-view',
};

function slugToName(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** All categories with parent relationships */
export function getAllCategories(): CategoryDef[] {
  const seen = new Set<string>();
  const cats: CategoryDef[] = [];

  for (const [urlPath, slug] of Object.entries(URL_TO_CATEGORY)) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    const parts = urlPath.split('/');
    const parentSlug = parts.length > 1 ? URL_TO_CATEGORY[parts[0]!] : undefined;
    cats.push({ slug, name: slugToName(slug), parentSlug });
  }

  return cats;
}

export function urlPathToSlug(urlPath: string): string {
  return 'ascendion-' + urlPath.replace(/\//g, '-');
}

export function urlPathToCategory(urlPath: string): string {
  return URL_TO_CATEGORY[urlPath] ?? 'engineering-culture';
}
