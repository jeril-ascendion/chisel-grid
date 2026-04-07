/**
 * Generate feed.xml as a static file for S3 deployment.
 * Run: npx tsx scripts/generate-feed.ts
 */
import { writeFileSync } from 'fs';
import { join } from 'path';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ascendion.engineering';
const SITE_NAME = 'Ascendion Engineering';
const SITE_DESCRIPTION = 'Engineering knowledge portal powered by ChiselGrid';

// Import mock data inline to avoid path alias issues
const articles = [
  { slug: 'building-cloud-native-applications-aws', title: 'Building Cloud-Native Applications with AWS: Patterns and Practices', description: 'A deep dive into microservices communication, deployment strategies, and observability.', categoryName: 'Cloud Architecture', authorName: 'Priya Sharma', publishedAt: '2026-03-28T10:00:00Z' },
  { slug: 'type-safe-fullstack-typescript-zod', title: 'Type-Safe Full-Stack Development with TypeScript and Zod', description: 'How we use TypeScript discriminated unions and Zod schemas.', categoryName: 'Full-Stack Development', authorName: 'Alex Chen', publishedAt: '2026-03-25T14:30:00Z' },
  { slug: 'rag-pipelines-amazon-bedrock', title: 'Implementing RAG Pipelines with Amazon Bedrock', description: 'A practical guide to building RAG pipelines.', categoryName: 'AI & Machine Learning', authorName: 'Rahul Mehta', publishedAt: '2026-03-20T09:00:00Z' },
  { slug: 'gitops-argocd-kubernetes', title: 'GitOps with ArgoCD: Declarative Kubernetes Deployments', description: 'How we moved to GitOps with ArgoCD.', categoryName: 'DevOps & SRE', authorName: 'David Park', publishedAt: '2026-03-15T11:00:00Z' },
  { slug: 'realtime-data-kafka-flink', title: 'Real-Time Data Pipelines with Apache Kafka and Flink', description: 'Building sub-second data pipelines.', categoryName: 'Data Engineering', authorName: 'Sneha Iyer', publishedAt: '2026-03-10T16:00:00Z' },
  { slug: 'engineering-team-topologies', title: 'Engineering Team Topologies: From Silos to Stream-Aligned Teams', description: 'Restructuring engineering teams using Team Topologies.', categoryName: 'Engineering Culture', authorName: 'Maya Johnson', publishedAt: '2026-03-05T08:00:00Z' },
  { slug: 'serverless-lambda-cold-starts', title: 'Serverless at Scale: Lambda Cold Starts and Beyond', description: 'Strategies for managing Lambda cold starts.', categoryName: 'Cloud Architecture', authorName: 'Priya Sharma', publishedAt: '2026-02-28T13:00:00Z' },
];

const rssItems = articles
  .map(
    (article) => `    <item>
      <title><![CDATA[${article.title}]]></title>
      <link>${SITE_URL}/articles/${article.slug}/</link>
      <guid isPermaLink="true">${SITE_URL}/articles/${article.slug}/</guid>
      <description><![CDATA[${article.description}]]></description>
      <pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>
      <category>${article.categoryName}</category>
      <author>${article.authorName}</author>
    </item>`,
  )
  .join('\n');

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_NAME}</title>
    <link>${SITE_URL}</link>
    <description>${SITE_DESCRIPTION}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${rssItems}
  </channel>
</rss>`;

const outPath = join(__dirname, '..', 'public', 'feed.xml');
writeFileSync(outPath, rss, 'utf-8');
console.log(`Generated ${outPath}`);
