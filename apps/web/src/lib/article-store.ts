/**
 * Article persistence layer.
 * Uses Aurora via RDS Data API when AURORA_CLUSTER_ARN is set (production).
 * Falls back to in-memory Map when Aurora is unavailable (dev mode).
 */

import { query, auroraConfigured, asUuid, asJson, DEFAULT_TENANT_ID } from './db/aurora';

export interface StoredArticle {
  contentId: string;
  title: string;
  slug: string;
  description: string;
  status: 'draft' | 'submitted' | 'in_review' | 'approved' | 'published' | 'rejected';
  blocks: unknown[];
  category: string;
  categoryName: string;
  categorySlug: string;
  categoryPath: string;
  categorySlugPath: string;
  categoryLevel: number;
  tags: string[];
  authorId: string;
  readTimeMinutes: number;
  timesReferenced?: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// In-memory fallback store
// ---------------------------------------------------------------------------
const memoryStore = new Map<string, StoredArticle>();

const DEFAULT_AUTHOR_ID =
  process.env['DEFAULT_AUTHOR_ID'] ?? '00000000-0000-0000-0000-000000000001';

// Lightweight columns for list queries — avoids the 1MB Data API cap
// that the large `blocks` JSONB hits when many rows are returned.
// Walks the category parent chain to build breadcrumb path + slug path
// so callers can show "Cloud Computing > AWS > Serverless" instead of
// just the leaf name. The CTE is evaluated once per row as a scalar
// subquery — cheap even on the queue's 500-row cap.
const CATEGORY_PATH_SUBQUERY = `
  (WITH RECURSIVE p AS (
     SELECT category_id, parent_id, name::text AS name_path, slug::text AS slug_path, 1 AS depth
       FROM categories
      WHERE category_id = c.category_id
     UNION ALL
     SELECT pc.category_id, pc.parent_id,
            pc.name || ' > ' || p.name_path,
            pc.slug || '/' || p.slug_path,
            p.depth + 1
       FROM categories pc JOIN p ON pc.category_id = p.parent_id
   )
   SELECT name_path FROM p WHERE parent_id IS NULL LIMIT 1)
`;
const CATEGORY_SLUG_PATH_SUBQUERY = `
  (WITH RECURSIVE p AS (
     SELECT category_id, parent_id, slug::text AS slug_path
       FROM categories
      WHERE category_id = c.category_id
     UNION ALL
     SELECT pc.category_id, pc.parent_id,
            pc.slug || '/' || p.slug_path
       FROM categories pc JOIN p ON pc.category_id = p.parent_id
   )
   SELECT slug_path FROM p WHERE parent_id IS NULL LIMIT 1)
`;
const LIST_COLS = `
  c.content_id, c.title, c.slug, c.description, c.status,
  c.category_id, c.author_id, c.read_time_minutes, c.times_referenced, c.created_at,
  cat.name AS category_name, cat.slug AS category_slug,
  cat.level AS category_level,
  ${CATEGORY_PATH_SUBQUERY} AS category_path,
  ${CATEGORY_SLUG_PATH_SUBQUERY} AS category_slug_path
`;
const FULL_COLS = `${LIST_COLS}, c.blocks`;
const CATEGORY_JOIN = ` LEFT JOIN categories cat ON cat.category_id = c.category_id`;

type Row = {
  content_id: string;
  title: string;
  slug: string;
  description: string | null;
  status: StoredArticle['status'];
  blocks?: unknown;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  category_level: number | null;
  category_path: string | null;
  category_slug_path: string | null;
  author_id: string | null;
  read_time_minutes: number | null;
  times_referenced: number | null;
  created_at: string;
};

function rowToArticle(row: Row): StoredArticle {
  let blocks: unknown[] = [];
  if (Array.isArray(row.blocks)) blocks = row.blocks;
  else if (typeof row.blocks === 'string') {
    try {
      blocks = JSON.parse(row.blocks);
    } catch {
      blocks = [];
    }
  }
  const created = row.created_at
    ? new Date(row.created_at.replace(' ', 'T') + 'Z').toISOString()
    : new Date().toISOString();
  const leafName = row.category_name ?? '';
  const leafSlug = row.category_slug ?? '';
  return {
    contentId: row.content_id,
    title: row.title,
    slug: row.slug,
    description: row.description ?? '',
    status: row.status,
    blocks,
    category: row.category_id ?? '',
    categoryName: leafName,
    categorySlug: leafSlug,
    categoryPath: row.category_path ?? leafName,
    categorySlugPath: row.category_slug_path ?? leafSlug,
    categoryLevel: row.category_level ?? 1,
    tags: [],
    authorId: row.author_id ?? '',
    readTimeMinutes: row.read_time_minutes ?? 5,
    timesReferenced: row.times_referenced ?? 0,
    createdAt: created,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function addArticle(article: StoredArticle): Promise<void> {
  memoryStore.set(article.contentId, article);
  if (!auroraConfigured()) return;
  try {
    await query(
      `INSERT INTO content (
        content_id, tenant_id, author_id, title, slug, description, status,
        blocks, read_time_minutes, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       ON CONFLICT (content_id) DO NOTHING`,
      [
        asUuid(article.contentId),
        asUuid(DEFAULT_TENANT_ID),
        asUuid(article.authorId || DEFAULT_AUTHOR_ID),
        article.title,
        article.slug,
        article.description,
        article.status,
        asJson(article.blocks),
        article.readTimeMinutes,
      ],
    );
  } catch (e) {
    console.warn('[article-store] addArticle Aurora failed:', (e as Error).message);
  }
}

export async function getArticle(contentId: string): Promise<StoredArticle | undefined> {
  if (auroraConfigured()) {
    try {
      const { rows } = await query<Row>(
        `SELECT ${FULL_COLS} FROM content c${CATEGORY_JOIN}
         WHERE c.tenant_id = $1 AND c.content_id = $2 LIMIT 1`,
        [asUuid(DEFAULT_TENANT_ID), asUuid(contentId)],
      );
      if (rows[0]) return rowToArticle(rows[0]);
    } catch (e) {
      console.warn('[article-store] getArticle Aurora failed:', (e as Error).message);
    }
  }
  return memoryStore.get(contentId);
}

export async function updateArticleStatus(
  contentId: string,
  status: StoredArticle['status'],
): Promise<boolean> {
  const mem = memoryStore.get(contentId);
  if (mem) mem.status = status;
  if (auroraConfigured()) {
    try {
      const { rowsAffected } = await query(
        `UPDATE content SET status = $1::content_status, updated_at = NOW()
         WHERE tenant_id = $2 AND content_id = $3`,
        [status, asUuid(DEFAULT_TENANT_ID), asUuid(contentId)],
      );
      if (status === 'published') {
        await query(
          `UPDATE content SET published_at = COALESCE(published_at, NOW())
           WHERE tenant_id = $1 AND content_id = $2`,
          [asUuid(DEFAULT_TENANT_ID), asUuid(contentId)],
        );
      }
      return rowsAffected > 0 || !!mem;
    } catch (e) {
      console.warn('[article-store] updateArticleStatus Aurora failed:', (e as Error).message);
    }
  }
  return !!mem;
}

export async function updateArticle(
  contentId: string,
  updates: Partial<StoredArticle>,
): Promise<boolean> {
  const mem = memoryStore.get(contentId);
  if (mem) Object.assign(mem, updates);
  if (auroraConfigured()) {
    try {
      const sets: string[] = ['updated_at = NOW()'];
      const params: unknown[] = [];
      const push = (col: string, val: unknown) => {
        params.push(val);
        sets.push(`${col} = $${params.length}`);
      };
      if (updates.title !== undefined) push('title', updates.title);
      if (updates.description !== undefined) push('description', updates.description);
      if (updates.status !== undefined) {
        params.push(updates.status);
        sets.push(`status = $${params.length}::content_status`);
      }
      if (updates.blocks !== undefined) push('blocks', asJson(updates.blocks));
      if (updates.readTimeMinutes !== undefined) push('read_time_minutes', updates.readTimeMinutes);
      params.push(asUuid(DEFAULT_TENANT_ID));
      params.push(asUuid(contentId));
      const tenantPos = params.length - 1;
      const idPos = params.length;
      const { rowsAffected } = await query(
        `UPDATE content SET ${sets.join(', ')} WHERE tenant_id = $${tenantPos} AND content_id = $${idPos}`,
        params,
      );
      return rowsAffected > 0 || !!mem;
    } catch (e) {
      console.warn('[article-store] updateArticle Aurora failed:', (e as Error).message);
    }
  }
  return !!mem;
}

// Default queue view: everything except rejected — admins want to see
// both items awaiting review and already-published content in one list.
const QUEUE_DEFAULT_STATUSES = ['in_review', 'submitted', 'draft', 'approved', 'published'] as const;

export type ArticleSort = 'recent' | 'most_referenced';

export async function getQueueArticles(
  statusFilter?: string,
  sort: ArticleSort = 'recent',
): Promise<StoredArticle[]> {
  if (auroraConfigured()) {
    try {
      let sql = `SELECT ${LIST_COLS} FROM content c${CATEGORY_JOIN} WHERE c.tenant_id = $1`;
      const params: unknown[] = [asUuid(DEFAULT_TENANT_ID)];
      if (statusFilter && statusFilter !== 'all') {
        sql += ` AND c.status = $2::content_status`;
        params.push(statusFilter);
      } else if (!statusFilter) {
        const placeholders = QUEUE_DEFAULT_STATUSES
          .map((_, i) => `$${params.length + i + 1}::content_status`)
          .join(', ');
        sql += ` AND c.status IN (${placeholders})`;
        params.push(...QUEUE_DEFAULT_STATUSES);
      }
      const orderBy =
        sort === 'most_referenced'
          ? `ORDER BY c.times_referenced DESC, c.created_at DESC`
          : `ORDER BY c.created_at DESC`;
      sql += ` ${orderBy} LIMIT 500`;
      const { rows } = await query<Row>(sql, params);
      return rows.map(rowToArticle);
    } catch (e) {
      console.warn('[article-store] getQueueArticles Aurora failed:', (e as Error).message);
    }
  }

  const all = Array.from(memoryStore.values()).sort((a, b) => {
    if (sort === 'most_referenced') {
      const diff = (b.timesReferenced ?? 0) - (a.timesReferenced ?? 0);
      if (diff !== 0) return diff;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  if (statusFilter === 'all') return all;
  if (!statusFilter)
    return all.filter((a) => (QUEUE_DEFAULT_STATUSES as readonly string[]).includes(a.status));
  return all.filter((a) => a.status === statusFilter);
}

export async function getAllArticles(
  sort: ArticleSort = 'recent',
): Promise<StoredArticle[]> {
  return getQueueArticles('all', sort);
}
