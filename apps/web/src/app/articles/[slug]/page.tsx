import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getArticleBySlug, getRelatedArticles, MOCK_ARTICLES } from '@/lib/mock-data';
import { BlockRenderer } from '@/components/content/block-renderer';
import { TableOfContents } from '@/components/content/table-of-contents';
import { AudioPlayer } from '@/components/content/audio-player';
import { ArticleCard } from '@/components/common/article-card';
import { formatDate, SITE_NAME, SITE_URL } from '@/lib/utils';
import type { ContentBlock } from '@chiselgrid/types';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};

  const title = article.seoMetaTitle ?? article.title;
  const description = article.seoMetaDescription ?? article.description;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: article.publishedAt,
      authors: [article.authorName],
      tags: article.tags.map((t) => t.name),
      url: `${SITE_URL}/articles/${article.slug}`,
    },
    alternates: {
      canonical: `${SITE_URL}/articles/${article.slug}`,
    },
  };
}

export async function generateStaticParams() {
  return MOCK_ARTICLES.map((a) => ({ slug: a.slug }));
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) notFound();

  const related = getRelatedArticles(article.contentId, 3);

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    author: {
      '@type': 'Person',
      name: article.authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/articles/${article.slug}`,
    },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      {
        '@type': 'ListItem',
        position: 2,
        name: article.categoryName,
        item: `${SITE_URL}/category/${article.categorySlug}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: article.title,
        item: `${SITE_URL}/articles/${article.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <article className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <li>
              <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            </li>
            <li><span className="mx-1">/</span></li>
            <li>
              <Link
                href={`/category/${article.categorySlug}`}
                className="hover:text-foreground transition-colors"
              >
                {article.categoryName}
              </Link>
            </li>
            <li><span className="mx-1">/</span></li>
            <li className="text-foreground font-medium truncate max-w-[200px]">
              {article.title}
            </li>
          </ol>
        </nav>

        {/* Article Header */}
        <header className="max-w-3xl mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Link
              href={`/category/${article.categorySlug}`}
              className="font-medium text-primary hover:underline"
            >
              {article.categoryName}
            </Link>
            <span>&middot;</span>
            <span>{article.readTimeMinutes} min read</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
            {article.title}
          </h1>

          <p className="text-lg text-muted-foreground mb-6">{article.description}</p>

          <div className="flex items-center gap-3 pb-6 border-b border-border">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
              {article.authorName.charAt(0)}
            </div>
            <div>
              <p className="font-medium">{article.authorName}</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(article.publishedAt)}
              </p>
            </div>
          </div>
        </header>

        {/* Audio Player */}
        {article.audioUrl && (
          <div className="max-w-3xl mb-8">
            <AudioPlayer src={article.audioUrl} title={`Listen: ${article.title}`} />
          </div>
        )}

        {/* Content + ToC layout */}
        <div className="flex gap-12">
          {/* Main content */}
          <div className="max-w-3xl flex-1 min-w-0">
            <BlockRenderer blocks={article.blocks} />

            {/* Tags */}
            {article.tags.length > 0 && (
              <div className="mt-10 pt-6 border-t border-border">
                <h2 className="text-sm font-semibold text-muted-foreground mb-3">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag) => (
                    <Link
                      key={tag.slug}
                      href={`/search?tag=${tag.slug}`}
                      className="px-3 py-1 text-sm rounded-full bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      {tag.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sticky ToC (desktop) */}
          <aside className="hidden xl:block w-64 shrink-0">
            <TableOfContents blocks={article.blocks} />
          </aside>
        </div>

        {/* Related Articles */}
        {related.length > 0 && (
          <section className="mt-16 pt-8 border-t border-border">
            <h2 className="text-xl font-bold mb-6">Related Articles</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((a) => (
                <ArticleCard key={a.contentId} article={a} />
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}
