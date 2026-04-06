import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getCategoryBySlug, getArticles, getCategories } from '@/lib/mock-data';
import { ArticleCard } from '@/components/common/article-card';
import { SITE_URL } from '@/lib/utils';

export const revalidate = 60;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; tag?: string }>;
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

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageStr, tag } = await searchParams;

  const category = getCategoryBySlug(slug);
  if (!category) notFound();

  const page = Math.max(1, parseInt(pageStr ?? '1', 10));
  const offset = (page - 1) * ITEMS_PER_PAGE;

  const { items: articles, total } = getArticles({
    categorySlug: slug,
    tag,
    limit: ITEMS_PER_PAGE,
    offset,
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

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{category.name}</h1>
          {category.description && (
            <p className="text-lg text-muted-foreground">{category.description}</p>
          )}
        </header>

        {/* Tag filters */}
        {allTags.size > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <Link
              href={`/category/${slug}`}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                !tag
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              All
            </Link>
            {[...allTags.entries()].map(([tagSlug, tagName]) => (
              <Link
                key={tagSlug}
                href={`/category/${slug}?tag=${tagSlug}`}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  tag === tagSlug
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
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
          <nav aria-label="Pagination" className="mt-10 flex justify-center gap-2">
            {page > 1 && (
              <Link
                href={`/category/${slug}?page=${page - 1}${tag ? `&tag=${tag}` : ''}`}
                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-accent transition-colors"
              >
                Previous
              </Link>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/category/${slug}?page=${p}${tag ? `&tag=${tag}` : ''}`}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  p === page
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border hover:bg-accent'
                }`}
              >
                {p}
              </Link>
            ))}
            {page < totalPages && (
              <Link
                href={`/category/${slug}?page=${page + 1}${tag ? `&tag=${tag}` : ''}`}
                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-accent transition-colors"
              >
                Next
              </Link>
            )}
          </nav>
        )}
      </div>
    </>
  );
}
