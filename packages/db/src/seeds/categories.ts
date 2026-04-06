/**
 * Ascendion Engineering domain taxonomy seed data.
 * 6 top-level domains, 18 subcategories.
 */

export interface CategorySeed {
  name: string;
  slug: string;
  description: string;
  iconName: string;
  sortOrder: number;
  children: Omit<CategorySeed, 'children' | 'iconName'>[];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const CATEGORY_TREE: CategorySeed[] = [
  {
    name: 'Cloud & Infrastructure',
    slug: slugify('Cloud & Infrastructure'),
    description:
      'AWS, Azure, GCP architecture, IaC, Kubernetes, serverless patterns',
    iconName: 'cloud',
    sortOrder: 1,
    children: [
      {
        name: 'AWS',
        slug: slugify('AWS'),
        description: 'Amazon Web Services services, best practices, and architectures',
        sortOrder: 1,
      },
      {
        name: 'Kubernetes & Containers',
        slug: slugify('Kubernetes & Containers'),
        description: 'Container orchestration, Docker, ECS, EKS, and microservices',
        sortOrder: 2,
      },
      {
        name: 'Infrastructure as Code',
        slug: slugify('Infrastructure as Code'),
        description: 'CDK, Terraform, CloudFormation, Pulumi',
        sortOrder: 3,
      },
    ],
  },
  {
    name: 'AI & Machine Learning',
    slug: slugify('AI & Machine Learning'),
    description:
      'LLMs, GenAI, ML pipelines, computer vision, NLP, AI agents',
    iconName: 'brain',
    sortOrder: 2,
    children: [
      {
        name: 'Generative AI',
        slug: slugify('Generative AI'),
        description: 'LLMs, prompt engineering, RAG, AI agents, Claude, GPT',
        sortOrder: 1,
      },
      {
        name: 'ML Engineering',
        slug: slugify('ML Engineering'),
        description: 'SageMaker, MLflow, feature stores, model deployment',
        sortOrder: 2,
      },
      {
        name: 'Data Science',
        slug: slugify('Data Science'),
        description: 'Statistical analysis, experiment design, Jupyter, pandas',
        sortOrder: 3,
      },
    ],
  },
  {
    name: 'Software Engineering',
    slug: slugify('Software Engineering'),
    description:
      'Architecture patterns, system design, API design, testing, TypeScript, Go, Java',
    iconName: 'code',
    sortOrder: 3,
    children: [
      {
        name: 'Architecture & Design',
        slug: slugify('Architecture & Design'),
        description: 'System design, DDD, microservices, event-driven patterns',
        sortOrder: 1,
      },
      {
        name: 'Frontend Engineering',
        slug: slugify('Frontend Engineering'),
        description: 'React, Next.js, performance, accessibility, design systems',
        sortOrder: 2,
      },
      {
        name: 'Backend Engineering',
        slug: slugify('Backend Engineering'),
        description: 'APIs, databases, message queues, caching, Node.js, Go, Java',
        sortOrder: 3,
      },
    ],
  },
  {
    name: 'Data & Analytics',
    slug: slugify('Data & Analytics'),
    description:
      'Data engineering, lakehouse architecture, streaming, BI, data governance',
    iconName: 'database',
    sortOrder: 4,
    children: [
      {
        name: 'Data Engineering',
        slug: slugify('Data Engineering'),
        description: 'ETL/ELT, data pipelines, Spark, Airflow, dbt',
        sortOrder: 1,
      },
      {
        name: 'Analytics & BI',
        slug: slugify('Analytics & BI'),
        description: 'Dashboards, metrics, QuickSight, Tableau, SQL analytics',
        sortOrder: 2,
      },
      {
        name: 'Data Governance',
        slug: slugify('Data Governance'),
        description: 'Data quality, lineage, cataloging, privacy, compliance',
        sortOrder: 3,
      },
    ],
  },
  {
    name: 'DevOps & Platform',
    slug: slugify('DevOps & Platform'),
    description:
      'CI/CD, observability, SRE, developer experience, internal platforms',
    iconName: 'rocket',
    sortOrder: 5,
    children: [
      {
        name: 'CI/CD',
        slug: slugify('CI/CD'),
        description: 'GitHub Actions, CodePipeline, deployment strategies, GitOps',
        sortOrder: 1,
      },
      {
        name: 'Observability',
        slug: slugify('Observability'),
        description: 'Monitoring, logging, tracing, CloudWatch, Datadog, OpenTelemetry',
        sortOrder: 2,
      },
      {
        name: 'Developer Experience',
        slug: slugify('Developer Experience'),
        description: 'Internal developer platforms, tooling, productivity',
        sortOrder: 3,
      },
    ],
  },
  {
    name: 'Security & Compliance',
    slug: slugify('Security & Compliance'),
    description:
      'Application security, IAM, zero trust, compliance frameworks, threat modeling',
    iconName: 'shield',
    sortOrder: 6,
    children: [
      {
        name: 'Application Security',
        slug: slugify('Application Security'),
        description: 'OWASP, secure coding, dependency scanning, SAST/DAST',
        sortOrder: 1,
      },
      {
        name: 'Identity & Access',
        slug: slugify('Identity & Access'),
        description: 'IAM, OAuth, OIDC, SSO, RBAC, zero trust',
        sortOrder: 2,
      },
      {
        name: 'Compliance',
        slug: slugify('Compliance'),
        description: 'SOC 2, HIPAA, GDPR, audit logging, policy as code',
        sortOrder: 3,
      },
    ],
  },
];
