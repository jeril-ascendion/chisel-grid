/**
 * In-memory article store for dev mode.
 * In production, this would be replaced by Aurora DB queries via @chiselgrid/db.
 * Module-level state persists across requests within the same server process.
 */

export interface StoredArticle {
  contentId: string;
  title: string;
  slug: string;
  description: string;
  status: 'draft' | 'submitted' | 'in_review' | 'approved' | 'published' | 'rejected';
  blocks: unknown[];
  category: string;
  tags: string[];
  authorId: string;
  readTimeMinutes: number;
  createdAt: string;
}

const articles = new Map<string, StoredArticle>();

export function addArticle(article: StoredArticle) {
  articles.set(article.contentId, article);
}

export function getArticle(contentId: string): StoredArticle | undefined {
  return articles.get(contentId);
}

export function updateArticleStatus(contentId: string, status: StoredArticle['status']): boolean {
  const article = articles.get(contentId);
  if (!article) return false;
  article.status = status;
  return true;
}

export function updateArticle(contentId: string, updates: Partial<StoredArticle>): boolean {
  const article = articles.get(contentId);
  if (!article) return false;
  Object.assign(article, updates);
  return true;
}

export function getQueueArticles(statusFilter?: string): StoredArticle[] {
  const all = Array.from(articles.values());
  if (!statusFilter || statusFilter === 'all') {
    return all
      .filter((a) => a.status === 'in_review' || a.status === 'submitted' || a.status === 'draft')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return all
    .filter((a) => a.status === statusFilter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
