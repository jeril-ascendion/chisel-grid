import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getArticles } from '@/lib/mock-data';
import { ArticleCard } from '@/components/common/article-card';
import { SearchInput } from '@/components/common/search-input';

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search engineering articles on Ascendion Engineering',
};

type Props = {
  searchParams: Promise<{ q?: string; tag?: string }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const { q, tag } = await searchParams;

  const { items: results, total } = getArticles({
    search: q,
    tag,
    limit: 20,
  });

  const hasQuery = !!(q?.trim() || tag);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6">Search</h1>

      <Suspense>
        <SearchInput />
      </Suspense>

      {tag && (
        <p className="mt-4 text-sm text-muted-foreground">
          Filtering by tag: <span className="font-medium text-foreground">{tag}</span>
        </p>
      )}

      {hasQuery && (
        <p className="mt-4 text-sm text-muted-foreground">
          {total} result{total !== 1 ? 's' : ''}{q ? ` for "${q}"` : ''}
        </p>
      )}

      <div className="mt-8">
        {results.length > 0 ? (
          <div className="space-y-4">
            {results.map((article) => (
              <SearchResult key={article.contentId} article={article} query={q ?? ''} />
            ))}
          </div>
        ) : hasQuery ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground">No articles found. Try a different search term.</p>
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="text-muted-foreground">Enter a search term to find articles.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SearchResult({ article, query }: { article: ReturnType<typeof getArticles>['items'][number]; query: string }) {
  const highlightedTitle = highlightText(article.title, query);
  const highlightedDesc = highlightText(article.description, query);

  return (
    <a
      href={`/articles/${article.slug}`}
      className="block rounded-xl border border-border bg-card p-5 hover:border-primary/20 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <span className="font-medium text-primary">{article.categoryName}</span>
        <span>&middot;</span>
        <span>{article.readTimeMinutes} min read</span>
      </div>
      <h2
        className="text-lg font-semibold mb-1"
        dangerouslySetInnerHTML={{ __html: highlightedTitle }}
      />
      <p
        className="text-sm text-muted-foreground line-clamp-2"
        dangerouslySetInnerHTML={{ __html: highlightedDesc }}
      />
      <div className="flex flex-wrap gap-1.5 mt-3">
        {article.tags.map((tag) => (
          <span key={tag.slug} className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
            {tag.name}
          </span>
        ))}
      </div>
    </a>
  );
}

function highlightText(text: string, query: string): string {
  if (!query.trim()) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const escapedQuery = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(
    new RegExp(`(${escapedQuery})`, 'gi'),
    '<mark class="bg-warning/30 rounded px-0.5">$1</mark>',
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
