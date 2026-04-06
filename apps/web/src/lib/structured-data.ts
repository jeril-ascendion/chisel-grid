/**
 * T-11.4: Structured data — JSON-LD schemas
 * Article, BreadcrumbList, Organization, WebSite schemas for all pages.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ascendion.engineering';
const SITE_NAME = 'Ascendion Engineering';

export interface ArticleStructuredData {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  updatedAt?: string;
  authorName: string;
  categoryName: string;
  categorySlug: string;
  tags?: string[];
  heroImageUrl?: string | null;
  readTimeMinutes?: number;
}

/** JSON-LD for an Article page */
export function articleJsonLd(data: ArticleStructuredData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: data.title,
    description: data.description,
    datePublished: data.publishedAt,
    dateModified: data.updatedAt ?? data.publishedAt,
    author: {
      '@type': 'Person',
      name: data.authorName,
    },
    publisher: organizationJsonLd(),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/articles/${data.slug}`,
    },
    ...(data.heroImageUrl ? { image: data.heroImageUrl } : {}),
    ...(data.tags ? { keywords: data.tags.join(', ') } : {}),
    ...(data.readTimeMinutes
      ? { timeRequired: `PT${data.readTimeMinutes}M` }
      : {}),
    articleSection: data.categoryName,
    inLanguage: 'en-US',
  };
}

/** JSON-LD for BreadcrumbList */
export function breadcrumbJsonLd(
  items: { name: string; url: string }[],
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}

/** JSON-LD for Organization (publisher) */
export function organizationJsonLd() {
  return {
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/logo.png`,
    },
  };
}

/** JSON-LD for WebSite (homepage, enables sitelinks search box) */
export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: 'Engineering knowledge portal powered by ChiselGrid',
    publisher: organizationJsonLd(),
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    inLanguage: 'en-US',
  };
}

/** Render JSON-LD as a script tag string (for dangerouslySetInnerHTML) */
export function jsonLdScript(data: object): string {
  return JSON.stringify(data);
}
