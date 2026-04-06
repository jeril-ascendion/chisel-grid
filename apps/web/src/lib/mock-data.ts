/**
 * Mock data for reader frontend development.
 * This will be replaced by real API calls once the backend is connected.
 */

import type { ContentBlock } from '@chiselgrid/types';

export interface Article {
  contentId: string;
  tenantId: string;
  title: string;
  slug: string;
  description: string;
  status: 'published';
  blocks: ContentBlock[];
  heroImageUrl: string | null;
  audioUrl: string | null;
  readTimeMinutes: number;
  authorName: string;
  authorAvatar: string | null;
  categoryName: string;
  categorySlug: string;
  tags: { name: string; slug: string }[];
  publishedAt: string;
  seoMetaTitle: string | null;
  seoMetaDescription: string | null;
  seoOgImageUrl: string | null;
}

export interface Category {
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  iconName: string | null;
  parentId: string | null;
  articleCount: number;
}

const SAMPLE_BLOCKS: ContentBlock[] = [
  { type: 'heading', level: 2, content: 'Introduction' },
  {
    type: 'text',
    content:
      'Modern cloud-native architectures demand a thoughtful approach to service design, deployment strategies, and observability. In this article, we explore the key patterns that engineering teams at Ascendion use to build resilient, scalable systems.',
  },
  {
    type: 'callout',
    variant: 'info',
    content:
      'This article is part of our Cloud Architecture series. Check out the related articles at the bottom of the page.',
  },
  { type: 'heading', level: 2, content: 'Microservices Communication Patterns' },
  {
    type: 'text',
    content:
      'When designing inter-service communication, teams must choose between synchronous (HTTP/gRPC) and asynchronous (event-driven) patterns. Each has trade-offs in terms of coupling, latency, and failure handling.',
  },
  {
    type: 'diagram',
    diagramType: 'mermaid',
    content: `graph LR
    A[API Gateway] --> B[Auth Service]
    A --> C[Content Service]
    C --> D[AI Pipeline]
    D --> E[Review Queue]
    E --> F[Publisher]`,
    caption: 'ChiselGrid service architecture overview',
  },
  { type: 'heading', level: 3, content: 'Event-Driven Architecture' },
  {
    type: 'text',
    content:
      'Event-driven architecture decouples producers from consumers, allowing services to evolve independently. We use Amazon EventBridge as our event bus, with SQS queues for reliable delivery and DLQ for failed message handling.',
  },
  {
    type: 'code',
    language: 'typescript',
    filename: 'event-publisher.ts',
    content: `import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const client = new EventBridgeClient({ region: 'ap-southeast-1' });

export async function publishContentEvent(
  contentId: string,
  action: 'created' | 'published' | 'updated',
) {
  await client.send(new PutEventsCommand({
    Entries: [{
      Source: 'chiselgrid.content',
      DetailType: \`content.\${action}\`,
      Detail: JSON.stringify({ contentId, timestamp: new Date().toISOString() }),
      EventBusName: 'chiselgrid-events',
    }],
  }));
}`,
  },
  { type: 'heading', level: 2, content: 'Deployment Strategies' },
  {
    type: 'text',
    content:
      'Blue-green deployments and canary releases reduce the risk of shipping changes to production. AWS CDK makes it straightforward to define infrastructure-as-code pipelines that implement these patterns.',
  },
  {
    type: 'callout',
    variant: 'warning',
    content:
      'Always run load tests against canary deployments before promoting to full traffic. A 5% canary can mask issues that surface at scale.',
  },
  { type: 'heading', level: 2, content: 'Observability Stack' },
  {
    type: 'text',
    content:
      'Our observability stack consists of three pillars: structured logging (CloudWatch Logs), distributed tracing (X-Ray), and metrics (CloudWatch Metrics with custom dashboards). Every Lambda function emits structured JSON logs with correlation IDs that flow through the entire request lifecycle.',
  },
  {
    type: 'code',
    language: 'typescript',
    filename: 'logger.ts',
    content: `import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({
  serviceName: 'content-api',
  logLevel: 'INFO',
});

export function withCorrelation(correlationId: string) {
  logger.appendKeys({ correlationId });
  return logger;
}`,
  },
  { type: 'heading', level: 2, content: 'Conclusion' },
  {
    type: 'text',
    content:
      'Building cloud-native applications is a continuous journey. By adopting these patterns — event-driven architecture, automated deployments, and comprehensive observability — teams can ship faster with greater confidence.',
  },
];

const SAMPLE_BLOCKS_2: ContentBlock[] = [
  { type: 'heading', level: 2, content: 'Why Type Safety Matters' },
  {
    type: 'text',
    content:
      'TypeScript has become the standard for large-scale JavaScript applications. At Ascendion, we leverage TypeScript not just for catching type errors, but as a design tool that makes invalid states unrepresentable.',
  },
  {
    type: 'code',
    language: 'typescript',
    filename: 'content-block.ts',
    content: `// Discriminated union ensures exhaustive handling
type ContentBlock =
  | { type: 'text'; content: string }
  | { type: 'heading'; level: 1 | 2 | 3 | 4; content: string }
  | { type: 'code'; language: string; content: string }
  | { type: 'callout'; variant: 'info' | 'warning'; content: string };

function renderBlock(block: ContentBlock): string {
  switch (block.type) {
    case 'text': return \`<p>\${block.content}</p>\`;
    case 'heading': return \`<h\${block.level}>\${block.content}</h\${block.level}>\`;
    case 'code': return \`<pre><code>\${block.content}</code></pre>\`;
    case 'callout': return \`<aside class="\${block.variant}">\${block.content}</aside>\`;
  }
}`,
  },
  { type: 'heading', level: 2, content: 'Zod for Runtime Validation' },
  {
    type: 'text',
    content:
      'While TypeScript catches errors at compile time, Zod schemas validate data at runtime boundaries — API inputs, database outputs, and external service responses. Our shared types package uses Zod as the single source of truth.',
  },
  {
    type: 'callout',
    variant: 'success',
    content: 'Zod schemas can infer TypeScript types, so you never have to keep them in sync manually.',
  },
];

export const MOCK_CATEGORIES: Category[] = [
  { categoryId: 'cat-1', name: 'Cloud Architecture', slug: 'cloud-architecture', description: 'AWS, Azure, GCP infrastructure patterns and best practices', iconName: 'cloud', parentId: null, articleCount: 12 },
  { categoryId: 'cat-2', name: 'AI & Machine Learning', slug: 'ai-ml', description: 'Machine learning, LLMs, and AI engineering at scale', iconName: 'brain', parentId: null, articleCount: 8 },
  { categoryId: 'cat-3', name: 'Full-Stack Development', slug: 'full-stack', description: 'React, Next.js, Node.js, and modern web development', iconName: 'code', parentId: null, articleCount: 15 },
  { categoryId: 'cat-4', name: 'DevOps & SRE', slug: 'devops-sre', description: 'CI/CD, observability, incident response, and platform engineering', iconName: 'server', parentId: null, articleCount: 10 },
  { categoryId: 'cat-5', name: 'Data Engineering', slug: 'data-engineering', description: 'Pipelines, warehousing, streaming, and analytics infrastructure', iconName: 'database', parentId: null, articleCount: 7 },
  { categoryId: 'cat-6', name: 'Engineering Culture', slug: 'engineering-culture', description: 'Team practices, leadership, career growth, and knowledge sharing', iconName: 'users', parentId: null, articleCount: 5 },
];

export const MOCK_ARTICLES: Article[] = [
  {
    contentId: 'art-1',
    tenantId: 'tenant-1',
    title: 'Building Cloud-Native Applications with AWS: Patterns and Practices',
    slug: 'building-cloud-native-applications-aws',
    description: 'A deep dive into microservices communication, deployment strategies, and observability for modern cloud-native applications on AWS.',
    status: 'published',
    blocks: SAMPLE_BLOCKS,
    heroImageUrl: null,
    audioUrl: '/mock-audio.mp3',
    readTimeMinutes: 8,
    authorName: 'Priya Sharma',
    authorAvatar: null,
    categoryName: 'Cloud Architecture',
    categorySlug: 'cloud-architecture',
    tags: [
      { name: 'AWS', slug: 'aws' },
      { name: 'Microservices', slug: 'microservices' },
      { name: 'CDK', slug: 'cdk' },
    ],
    publishedAt: '2026-03-28T10:00:00Z',
    seoMetaTitle: 'Building Cloud-Native Applications with AWS | Ascendion Engineering',
    seoMetaDescription: 'Learn microservices communication patterns, deployment strategies, and observability best practices for AWS.',
    seoOgImageUrl: null,
  },
  {
    contentId: 'art-2',
    tenantId: 'tenant-1',
    title: 'Type-Safe Full-Stack Development with TypeScript and Zod',
    slug: 'type-safe-fullstack-typescript-zod',
    description: 'How we use TypeScript discriminated unions and Zod schemas to build type-safe applications from database to frontend.',
    status: 'published',
    blocks: SAMPLE_BLOCKS_2,
    heroImageUrl: null,
    audioUrl: null,
    readTimeMinutes: 6,
    authorName: 'Alex Chen',
    authorAvatar: null,
    categoryName: 'Full-Stack Development',
    categorySlug: 'full-stack',
    tags: [
      { name: 'TypeScript', slug: 'typescript' },
      { name: 'Zod', slug: 'zod' },
      { name: 'React', slug: 'react' },
    ],
    publishedAt: '2026-03-25T14:30:00Z',
    seoMetaTitle: null,
    seoMetaDescription: null,
    seoOgImageUrl: null,
  },
  {
    contentId: 'art-3',
    tenantId: 'tenant-1',
    title: 'Implementing RAG Pipelines with Amazon Bedrock',
    slug: 'rag-pipelines-amazon-bedrock',
    description: 'A practical guide to building Retrieval-Augmented Generation pipelines using Amazon Bedrock, Aurora pgvector, and Step Functions.',
    status: 'published',
    blocks: SAMPLE_BLOCKS,
    heroImageUrl: null,
    audioUrl: '/mock-audio.mp3',
    readTimeMinutes: 12,
    authorName: 'Rahul Mehta',
    authorAvatar: null,
    categoryName: 'AI & Machine Learning',
    categorySlug: 'ai-ml',
    tags: [
      { name: 'AWS Bedrock', slug: 'aws-bedrock' },
      { name: 'RAG', slug: 'rag' },
      { name: 'LLM', slug: 'llm' },
    ],
    publishedAt: '2026-03-20T09:00:00Z',
    seoMetaTitle: null,
    seoMetaDescription: null,
    seoOgImageUrl: null,
  },
  {
    contentId: 'art-4',
    tenantId: 'tenant-1',
    title: 'GitOps with ArgoCD: Declarative Kubernetes Deployments',
    slug: 'gitops-argocd-kubernetes',
    description: 'How we moved from imperative CI/CD pipelines to GitOps with ArgoCD, reducing deployment failures by 80%.',
    status: 'published',
    blocks: SAMPLE_BLOCKS_2,
    heroImageUrl: null,
    audioUrl: null,
    readTimeMinutes: 7,
    authorName: 'David Park',
    authorAvatar: null,
    categoryName: 'DevOps & SRE',
    categorySlug: 'devops-sre',
    tags: [
      { name: 'Kubernetes', slug: 'kubernetes' },
      { name: 'GitOps', slug: 'gitops' },
      { name: 'ArgoCD', slug: 'argocd' },
    ],
    publishedAt: '2026-03-15T11:00:00Z',
    seoMetaTitle: null,
    seoMetaDescription: null,
    seoOgImageUrl: null,
  },
  {
    contentId: 'art-5',
    tenantId: 'tenant-1',
    title: 'Real-Time Data Pipelines with Apache Kafka and Flink',
    slug: 'realtime-data-kafka-flink',
    description: 'Building sub-second data pipelines for event streaming using Kafka, Flink, and AWS managed services.',
    status: 'published',
    blocks: SAMPLE_BLOCKS,
    heroImageUrl: null,
    audioUrl: '/mock-audio.mp3',
    readTimeMinutes: 10,
    authorName: 'Sneha Iyer',
    authorAvatar: null,
    categoryName: 'Data Engineering',
    categorySlug: 'data-engineering',
    tags: [
      { name: 'Kafka', slug: 'kafka' },
      { name: 'Flink', slug: 'flink' },
      { name: 'Streaming', slug: 'streaming' },
    ],
    publishedAt: '2026-03-10T16:00:00Z',
    seoMetaTitle: null,
    seoMetaDescription: null,
    seoOgImageUrl: null,
  },
  {
    contentId: 'art-6',
    tenantId: 'tenant-1',
    title: 'Engineering Team Topologies: From Silos to Stream-Aligned Teams',
    slug: 'engineering-team-topologies',
    description: 'How Ascendion restructured engineering teams using Team Topologies principles to improve delivery velocity.',
    status: 'published',
    blocks: SAMPLE_BLOCKS_2,
    heroImageUrl: null,
    audioUrl: null,
    readTimeMinutes: 5,
    authorName: 'Maya Johnson',
    authorAvatar: null,
    categoryName: 'Engineering Culture',
    categorySlug: 'engineering-culture',
    tags: [
      { name: 'Team Topologies', slug: 'team-topologies' },
      { name: 'Leadership', slug: 'leadership' },
    ],
    publishedAt: '2026-03-05T08:00:00Z',
    seoMetaTitle: null,
    seoMetaDescription: null,
    seoOgImageUrl: null,
  },
  {
    contentId: 'art-7',
    tenantId: 'tenant-1',
    title: 'Serverless at Scale: Lambda Cold Starts and Beyond',
    slug: 'serverless-lambda-cold-starts',
    description: 'Strategies for managing Lambda cold starts, provisioned concurrency, and cost optimization at scale.',
    status: 'published',
    blocks: SAMPLE_BLOCKS,
    heroImageUrl: null,
    audioUrl: null,
    readTimeMinutes: 9,
    authorName: 'Priya Sharma',
    authorAvatar: null,
    categoryName: 'Cloud Architecture',
    categorySlug: 'cloud-architecture',
    tags: [
      { name: 'Serverless', slug: 'serverless' },
      { name: 'Lambda', slug: 'lambda' },
      { name: 'AWS', slug: 'aws' },
    ],
    publishedAt: '2026-02-28T13:00:00Z',
    seoMetaTitle: null,
    seoMetaDescription: null,
    seoOgImageUrl: null,
  },
];

// Helper functions to simulate API calls
export function getArticles(options?: {
  categorySlug?: string;
  tag?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): { items: Article[]; total: number } {
  let filtered = [...MOCK_ARTICLES];

  if (options?.categorySlug) {
    filtered = filtered.filter((a) => a.categorySlug === options.categorySlug);
  }
  if (options?.tag) {
    filtered = filtered.filter((a) => a.tags.some((t) => t.slug === options.tag));
  }
  if (options?.search) {
    const q = options.search.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q),
    );
  }

  const total = filtered.length;
  const offset = options?.offset ?? 0;
  const limit = options?.limit ?? 12;
  const items = filtered.slice(offset, offset + limit);

  return { items, total };
}

export function getArticleBySlug(slug: string): Article | null {
  return MOCK_ARTICLES.find((a) => a.slug === slug) ?? null;
}

export function getCategories(): Category[] {
  return MOCK_CATEGORIES;
}

export function getCategoryBySlug(slug: string): Category | null {
  return MOCK_CATEGORIES.find((c) => c.slug === slug) ?? null;
}

export function getRelatedArticles(articleId: string, limit = 3): Article[] {
  const article = MOCK_ARTICLES.find((a) => a.contentId === articleId);
  if (!article) return [];
  return MOCK_ARTICLES.filter(
    (a) =>
      a.contentId !== articleId &&
      (a.categorySlug === article.categorySlug ||
        a.tags.some((t) => article.tags.some((at) => at.slug === t.slug))),
  ).slice(0, limit);
}
