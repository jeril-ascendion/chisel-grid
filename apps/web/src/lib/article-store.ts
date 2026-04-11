/**
 * Article persistence layer.
 * Uses Aurora (Drizzle ORM) when DATABASE_URL is set (production).
 * Falls back to in-memory Map when Aurora is unavailable (dev mode).
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

// ---------------------------------------------------------------------------
// In-memory store (always available)
// ---------------------------------------------------------------------------
const memoryStore = new Map<string, StoredArticle>();

// ---------------------------------------------------------------------------
// Aurora helpers — fully dynamic, only run when DATABASE_URL is set
// ---------------------------------------------------------------------------
function hasAurora(): boolean {
  return !!process.env['DATABASE_URL'];
}

async function withAurora<T>(fn: (db: any, schema: any, orm: any) => Promise<T>): Promise<T | null> {
  if (!hasAurora()) return null;
  try {
    // Dynamic require avoids build-time resolution of @chiselgrid/db
    const dbMod = require('@chiselgrid/db');
    const orm = require('drizzle-orm');
    const db = dbMod.getDb();
    return await fn(db, dbMod, orm);
  } catch (e) {
    console.warn('[article-store] Aurora operation failed:', (e as Error).message);
    return null;
  }
}

function dbRowToArticle(row: any): StoredArticle {
  return {
    contentId: row.contentId,
    title: row.title,
    slug: row.slug,
    description: row.description ?? '',
    status: row.status,
    blocks: row.blocks ?? [],
    category: row.categoryId ?? '',
    tags: [],
    authorId: row.authorId ?? '',
    readTimeMinutes: row.readTimeMinutes ?? 5,
    createdAt: row.createdAt?.toISOString?.() ?? new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function addArticle(article: StoredArticle): Promise<void> {
  memoryStore.set(article.contentId, article);
  await withAurora(async (db, schema) => {
    await db.insert(schema.content).values({
      contentId: article.contentId,
      tenantId: process.env['DEFAULT_TENANT_ID'] ?? '00000000-0000-0000-0000-000000000001',
      authorId: process.env['DEFAULT_AUTHOR_ID'] ?? '00000000-0000-0000-0000-000000000001',
      title: article.title,
      slug: article.slug,
      description: article.description,
      status: article.status,
      blocks: article.blocks,
      readTimeMinutes: article.readTimeMinutes,
      createdAt: new Date(article.createdAt),
      updatedAt: new Date(),
    });
  });
}

export async function getArticle(contentId: string): Promise<StoredArticle | undefined> {
  const mem = memoryStore.get(contentId);
  if (mem) return mem;
  const row = await withAurora(async (db, schema, orm) => {
    const rows = await db.select().from(schema.content).where(orm.eq(schema.content.contentId, contentId)).limit(1);
    return rows[0] ?? null;
  });
  return row ? dbRowToArticle(row) : undefined;
}

export async function updateArticleStatus(contentId: string, status: StoredArticle['status']): Promise<boolean> {
  const article = memoryStore.get(contentId);
  if (article) article.status = status;
  await withAurora(async (db, schema, orm) => {
    await db.update(schema.content).set({ status, updatedAt: new Date() }).where(orm.eq(schema.content.contentId, contentId));
  });
  return !!article;
}

export async function updateArticle(contentId: string, updates: Partial<StoredArticle>): Promise<boolean> {
  const article = memoryStore.get(contentId);
  if (article) Object.assign(article, updates);
  await withAurora(async (db, schema, orm) => {
    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.title) data.title = updates.title;
    if (updates.description) data.description = updates.description;
    if (updates.status) data.status = updates.status;
    if (updates.blocks) data.blocks = updates.blocks;
    if (updates.readTimeMinutes) data.readTimeMinutes = updates.readTimeMinutes;
    await db.update(schema.content).set(data).where(orm.eq(schema.content.contentId, contentId));
  });
  return !!article;
}

export async function getQueueArticles(statusFilter?: string): Promise<StoredArticle[]> {
  const auroraResult = await withAurora(async (db, schema, orm) => {
    let query = db.select().from(schema.content).orderBy(orm.desc(schema.content.createdAt)).limit(100);
    if (statusFilter && statusFilter !== 'all') {
      query = query.where(orm.eq(schema.content.status, statusFilter));
    } else if (!statusFilter) {
      query = query.where(orm.or(
        orm.eq(schema.content.status, 'in_review'),
        orm.eq(schema.content.status, 'submitted'),
        orm.eq(schema.content.status, 'draft'),
      ));
    }
    return (await query).map(dbRowToArticle);
  });
  if (auroraResult) return auroraResult;

  // Fallback to memory
  const all = Array.from(memoryStore.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (statusFilter === 'all') return all;
  if (!statusFilter) return all.filter((a) => a.status === 'in_review' || a.status === 'submitted' || a.status === 'draft');
  return all.filter((a) => a.status === statusFilter);
}

export async function getAllArticles(): Promise<StoredArticle[]> {
  return getQueueArticles('all');
}
