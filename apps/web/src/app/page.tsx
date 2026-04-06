import Link from 'next/link';
import { getArticles, getCategories } from '@/lib/mock-data';
import { ArticleCard } from '@/components/common/article-card';
import { NewsletterForm } from '@/components/common/newsletter-form';
import { formatDate } from '@/lib/utils';

const CATEGORY_ICONS: Record<string, string> = {
  cloud: 'M3 15a4 4 0 0 0 4 4h9a5 5 0 1 0-.1-9.999 5.002 5.002 0 0 0-9.78 2.096A4.001 4.001 0 0 0 3 15z',
  brain: 'M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z',
  code: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
  server: 'M2 4h20v6H2zM2 14h20v6H2zM6 7h.01M6 17h.01',
  database: 'M12 2C6.48 2 2 4.02 2 6.5v11C2 19.98 6.48 22 12 22s10-2.02 10-4.5v-11C22 4.02 17.52 2 12 2z',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
};

export default function HomePage() {
  const { items: articles } = getArticles({ limit: 6 });
  const categories = getCategories();
  const featured = articles[0];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Hero: Featured Article */}
      {featured && (
        <section className="py-8 sm:py-12">
          <Link
            href={`/articles/${featured.slug}`}
            className="group block rounded-2xl border border-border bg-card overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all duration-300"
          >
            <div className="grid md:grid-cols-2 gap-0">
              <div className="aspect-video md:aspect-auto bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center min-h-[200px]">
                <svg width="80" height="80" viewBox="0 0 32 32" fill="none" className="text-primary/20">
                  <rect x="2" y="2" width="12" height="12" rx="2" fill="currentColor" />
                  <rect x="18" y="2" width="12" height="12" rx="2" fill="currentColor" opacity="0.6" />
                  <rect x="2" y="18" width="12" height="12" rx="2" fill="currentColor" opacity="0.6" />
                  <rect x="18" y="18" width="12" height="12" rx="2" fill="currentColor" opacity="0.3" />
                </svg>
              </div>
              <div className="p-6 sm:p-8 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <span className="font-medium text-primary">{featured.categoryName}</span>
                  <span>&middot;</span>
                  <span>{featured.readTimeMinutes} min read</span>
                  <span>&middot;</span>
                  <span>{formatDate(featured.publishedAt)}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-3 group-hover:text-primary transition-colors">
                  {featured.title}
                </h2>
                <p className="text-muted-foreground mb-4 line-clamp-3">
                  {featured.description}
                </p>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                    {featured.authorName.charAt(0)}
                  </div>
                  <span className="text-sm font-medium">{featured.authorName}</span>
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Category Grid */}
      <section className="py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Explore Topics</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-md transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={CATEGORY_ICONS[cat.iconName ?? 'code'] ?? CATEGORY_ICONS.code} />
                </svg>
              </div>
              <span className="text-sm font-medium text-center">{cat.name}</span>
              <span className="text-xs text-muted-foreground">{cat.articleCount} articles</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Articles */}
      <section className="py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Recent Articles</h2>
          <Link href="/search" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.slice(0, 6).map((article) => (
            <ArticleCard key={article.contentId} article={article} />
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-8 pb-16">
        <div className="rounded-2xl bg-gradient-to-r from-primary/5 to-secondary/5 border border-border p-8 sm:p-12 text-center">
          <h2 className="text-2xl font-bold mb-2">Stay in the loop</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Get the latest engineering insights delivered to your inbox. No spam, just quality technical content.
          </p>
          <NewsletterForm className="flex gap-2 max-w-sm mx-auto" />
        </div>
      </section>
    </div>
  );
}
