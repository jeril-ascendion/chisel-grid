import type { Metadata } from 'next';
import Link from 'next/link';
import { getArticles, getCategories } from '@/lib/mock-data';
import { ArticleCard } from '@/components/common/article-card';
import { SITE_URL } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'All Articles',
  description: 'Browse all engineering articles on Ascendion Engineering — cloud architecture, AI/ML, full-stack development, DevOps, and more.',
  alternates: {
    canonical: `${SITE_URL}/articles`,
  },
};

export default function ArticlesPage() {
  const { items: articles } = getArticles({ limit: 50 });
  const categories = getCategories();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          </li>
          <li><span className="mx-1">/</span></li>
          <li className="text-foreground font-medium">Articles</li>
        </ol>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">All Articles</h1>
        <p className="text-lg text-muted-foreground">
          Explore engineering insights from the Ascendion team
        </p>
      </header>

      {/* Category quick links */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/category/${cat.slug}/`}
            className="px-3 py-1 text-sm rounded-full bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {cat.name}
          </Link>
        ))}
      </div>

      {/* Articles grid */}
      {articles.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <ArticleCard key={article.contentId} article={article} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">No articles found.</p>
        </div>
      )}
    </div>
  );
}
