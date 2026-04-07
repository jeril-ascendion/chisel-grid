import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getCategoryBySlug, getArticles, getCategories } from '@/lib/mock-data';
import { ArticleCard } from '@/components/common/article-card';
import { HeroAnimation } from '@/components/animations/HeroAnimation';
import { SITE_URL } from '@/lib/utils';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return {};

  return {
    title: category.name,
    description: category.description ?? `Articles about ${category.name} on Ascendion Engineering`,
    alternates: {
      canonical: `${SITE_URL}/category/${category.slug}`,
    },
  };
}

export async function generateStaticParams() {
  return getCategories().map((c) => ({ slug: c.slug }));
}

const ITEMS_PER_PAGE = 12;

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;

  const category = getCategoryBySlug(slug);
  if (!category) notFound();

  const { items: articles, total } = getArticles({
    categorySlug: slug,
    limit: ITEMS_PER_PAGE,
  });

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  // Collect unique tags from articles for filter
  const allTags = new Map<string, string>();
  articles.forEach((a) => a.tags.forEach((t) => allTags.set(t.slug, t.name)));

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      {
        '@type': 'ListItem',
        position: 2,
        name: category.name,
        item: `${SITE_URL}/category/${category.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <li>
              <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            </li>
            <li><span className="mx-1">/</span></li>
            <li className="text-foreground font-medium">{category.name}</li>
          </ol>
        </nav>

        {/* Header with animation */}
        <header className="mb-8">
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ height: '180px', borderRadius: '10px', background: 'var(--bg-subtle, #F8F7F5)', border: '1px solid var(--border-ae, #E8E8E6)', overflow: 'hidden' }}>
              <HeroAnimation category={slug} />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">{category.name}</h1>
              {category.description && (
                <p className="text-lg text-muted-foreground">{category.description}</p>
              )}
            </div>
          </div>
        </header>

        {/* Tag filters */}
        {allTags.size > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <Link
              href={`/category/${slug}`}
              className="px-3 py-1 text-sm rounded-full transition-colors bg-primary text-primary-foreground"
            >
              All
            </Link>
            {[...allTags.entries()].map(([tagSlug, tagName]) => (
              <Link
                key={tagSlug}
                href={`/search?tag=${tagSlug}`}
                className="px-3 py-1 text-sm rounded-full transition-colors bg-muted text-muted-foreground hover:bg-accent"
              >
                {tagName}
              </Link>
            ))}
          </div>
        )}

        {/* Articles grid */}
        {articles.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <ArticleCard key={article.contentId} article={article} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="text-muted-foreground">No articles found in this category.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Showing {articles.length} of {total} articles
          </p>
        )}
      </div>
    </>
  );
}
