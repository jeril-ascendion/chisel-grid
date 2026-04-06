/**
 * T-11.3: Sitemap generation
 * Auto-generated from published content, submitted to Google Search Console.
 */
import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ascendion.engineering';

// In production, this queries the database. For now, uses static data.
// Will be connected to ContentRepository.list({ status: 'published' }) in deployment.

interface SitemapArticle {
  slug: string;
  updatedAt: Date;
}

interface SitemapCategory {
  slug: string;
}

async function getPublishedArticles(): Promise<SitemapArticle[]> {
  // Placeholder: will be replaced with DB query
  return [
    { slug: 'building-cloud-native-applications-aws', updatedAt: new Date('2026-03-28') },
    { slug: 'type-safe-fullstack-typescript-zod', updatedAt: new Date('2026-03-25') },
    { slug: 'rag-pipelines-amazon-bedrock', updatedAt: new Date('2026-03-20') },
    { slug: 'gitops-argocd-kubernetes', updatedAt: new Date('2026-03-15') },
    { slug: 'realtime-data-kafka-flink', updatedAt: new Date('2026-03-10') },
    { slug: 'engineering-team-topologies', updatedAt: new Date('2026-03-05') },
  ];
}

async function getCategories(): Promise<SitemapCategory[]> {
  return [
    { slug: 'cloud-architecture' },
    { slug: 'ai-ml' },
    { slug: 'full-stack' },
    { slug: 'devops-sre' },
    { slug: 'data-engineering' },
    { slug: 'engineering-culture' },
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getPublishedArticles();
  const categories = await getCategories();

  const articleUrls: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${SITE_URL}/articles/${article.slug}`,
    lastModified: article.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const categoryUrls: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${SITE_URL}/category/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.6,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.3,
    },
    ...categoryUrls,
    ...articleUrls,
  ];
}
