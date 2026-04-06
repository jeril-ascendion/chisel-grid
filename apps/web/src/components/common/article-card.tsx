import Link from 'next/link';
import type { Article } from '@/lib/mock-data';
import { formatDate } from '@/lib/utils';

export function ArticleCard({ article }: { article: Article }) {
  return (
    <article className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-200">
      {/* Hero image placeholder */}
      {article.heroImageUrl ? (
        <div className="aspect-video bg-muted overflow-hidden">
          <img
            src={article.heroImageUrl}
            alt={article.title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="aspect-video bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none" className="text-primary/20">
            <rect x="2" y="2" width="12" height="12" rx="2" fill="currentColor" />
            <rect x="18" y="2" width="12" height="12" rx="2" fill="currentColor" opacity="0.6" />
            <rect x="2" y="18" width="12" height="12" rx="2" fill="currentColor" opacity="0.6" />
            <rect x="18" y="18" width="12" height="12" rx="2" fill="currentColor" opacity="0.3" />
          </svg>
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        {/* Category & Read time */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Link
            href={`/category/${article.categorySlug}`}
            className="font-medium text-primary hover:underline"
          >
            {article.categoryName}
          </Link>
          <span>&middot;</span>
          <span>{article.readTimeMinutes} min read</span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold leading-snug mb-2 group-hover:text-primary transition-colors">
          <Link href={`/articles/${article.slug}`} className="after:absolute after:inset-0">
            {article.title}
          </Link>
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
          {article.description}
        </p>

        {/* Footer: Author & Date */}
        <div className="flex items-center gap-3 pt-3 border-t border-border">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
            {article.authorName.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{article.authorName}</p>
            <p className="text-xs text-muted-foreground">{formatDate(article.publishedAt)}</p>
          </div>
        </div>

        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {article.tags.map((tag) => (
              <span
                key={tag.slug}
                className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
