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
  tags: string[];
  authorId: string;
  readTimeMinutes: number;
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
const LIST_COLS = `
  c.content_id, c.title, c.slug, c.description, c.status,
  c.category_id, c.author_id, c.read_time_minutes, c.created_at
`;
const FULL_COLS = `${LIST_COLS}, c.blocks`;

type Row = {
  content_id: string;
  title: string;
  slug: string;
  description: string | null;
  status: StoredArticle['status'];
  blocks?: unknown;
  category_id: string | null;
  author_id: string | null;
  read_time_minutes: number | null;
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
  return {
    contentId: row.content_id,
    title: row.title,
    slug: row.slug,
    description: row.description ?? '',
    status: row.status,
    blocks,
    category: row.category_id ?? '',
    tags: [],
    authorId: row.author_id ?? '',
    readTimeMinutes: row.read_time_minutes ?? 5,
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
        `SELECT ${FULL_COLS} FROM content c
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
        `UPDATE content SET status = $1, updated_at = NOW()
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
      if (updates.status !== undefined) push('status', updates.status);
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

export async function getQueueArticles(statusFilter?: string): Promise<StoredArticle[]> {
  if (auroraConfigured()) {
    try {
      let sql = `SELECT ${LIST_COLS} FROM content c WHERE c.tenant_id = $1`;
      const params: unknown[] = [asUuid(DEFAULT_TENANT_ID)];
      if (statusFilter && statusFilter !== 'all') {
        sql += ` AND c.status = $2`;
        params.push(statusFilter);
      } else if (!statusFilter) {
        sql += ` AND c.status IN ('in_review', 'submitted', 'draft')`;
      }
      sql += ` ORDER BY c.created_at DESC LIMIT 500`;
      const { rows } = await query<Row>(sql, params);
      return rows.map(rowToArticle);
    } catch (e) {
      console.warn('[article-store] getQueueArticles Aurora failed:', (e as Error).message);
    }
  }

  const all = Array.from(memoryStore.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  if (statusFilter === 'all') return all;
  if (!statusFilter)
    return all.filter(
      (a) => a.status === 'in_review' || a.status === 'submitted' || a.status === 'draft',
    );
  return all.filter((a) => a.status === statusFilter);
}

export async function getAllArticles(): Promise<StoredArticle[]> {
  return getQueueArticles('all');
}
