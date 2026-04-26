/**
 * Aurora-backed article fetch for homepage, category pages, and article detail.
 *
 * Returns the same Article shape the mock data uses so the existing ArticleCard
 * and article detail page render without modification.
 *
 * Every function is fail-soft: if Aurora is unreachable or unconfigured, it
 * returns an empty list (or null for single-row lookups) so pages render an
 * empty state instead of crashing during build or request.
 */

import type { ContentBlock } from '@chiselgrid/types';
import type { Article } from '@/lib/mock-data';
import { query, auroraConfigured, asUuid, DEFAULT_TENANT_ID } from './aurora';

const DEFAULT_AUTHOR = 'Ascendion Engineering';

type Row = {
  content_id: string;
  title: string;
  slug: string;
  description: string | null;
  ai_summary: string | null;
  read_time_minutes: number | null;
  hero_image_url: string | null;
  audio_url: string | null;
  published_at: string | null;
  seo_meta_title: string | null;
  seo_meta_description: string | null;
  seo_og_image_url: string | null;
  blocks_json: string | null;
  category_name: string | null;
  category_slug: string | null;
  category_full_path: string | null;
};

function toIsoDate(value: string | null): string {
  if (!value) return new Date().toISOString();
  // RDS Data API returns "2026-04-20 00:10:44.081616" (no T, no Z)
  if (value.includes('T')) return value;
  return new Date(value.replace(' ', 'T') + 'Z').toISOString();
}

function parseBlocks(raw: string | null): ContentBlock[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ContentBlock[]) : [];
  } catch {
    return [];
  }
}

function rowToArticle(row: Row, includeBlocks: boolean): Article {
  const categoryName = row.category_name ?? 'Uncategorized';
  const categorySlug = row.category_slug ?? 'uncategorized';
  const categoryPath = row.category_full_path ?? categoryName;
  const description = row.description ?? row.ai_summary ?? '';

  return {
    contentId: row.content_id,
    tenantId: DEFAULT_TENANT_ID,
    title: row.title,
    slug: row.slug,
    description,
    status: 'published',
    blocks: includeBlocks ? parseBlocks(row.blocks_json) : [],
    heroImageUrl: row.hero_image_url,
    audioUrl: row.audio_url,
    readTimeMinutes: row.read_time_minutes ?? 5,
    authorName: DEFAULT_AUTHOR,
    authorAvatar: null,
    categoryName,
    categorySlug,
    categoryPath,
    categorySlugPath: categorySlug,
    tags: [],
    publishedAt: toIsoDate(row.published_at),
    seoMetaTitle: row.seo_meta_title,
    seoMetaDescription: row.seo_meta_description,
    seoOgImageUrl: row.seo_og_image_url,
  };
}

const LIST_COLUMNS = `
  c.content_id,
  c.title,
  c.slug,
  c.description,
  c.ai_summary,
  c.read_time_minutes,
  c.hero_image_url,
  c.audio_url,
  c.published_at,
  c.seo_meta_title,
  c.seo_meta_description,
  c.seo_og_image_url,
  NULL::text AS blocks_json,
  cat.name AS category_name,
  cat.slug AS category_slug,
  cat.full_path AS category_full_path
`;

const DETAIL_COLUMNS = `
  c.content_id,
  c.title,
  c.slug,
  c.description,
  c.ai_summary,
  c.read_time_minutes,
  c.hero_image_url,
  c.audio_url,
  c.published_at,
  c.seo_meta_title,
  c.seo_meta_description,
  c.seo_og_image_url,
  c.blocks::text AS blocks_json,
  cat.name AS category_name,
  cat.slug AS category_slug,
  cat.full_path AS category_full_path
`;

export async function getPublishedArticles(
  tenantId: string = DEFAULT_TENANT_ID,
  limit = 6,
): Promise<Article[]> {
  if (!auroraConfigured()) return [];
  try {
    const { rows } = await query<Row>(
      `SELECT ${LIST_COLUMNS}
       FROM content c
       LEFT JOIN categories cat ON cat.category_id = c.category_id
       WHERE c.tenant_id = $1
         AND c.status = 'published'
       ORDER BY c.published_at DESC NULLS LAST
       LIMIT $2`,
      [asUuid(tenantId), limit],
    );
    return rows.map((r) => rowToArticle(r, false));
  } catch (err) {
    console.error('[articles] getPublishedArticles failed:', err);
    return [];
  }
}

export async function getArticlesByCategory(
  tenantId: string,
  categorySlug: string,
): Promise<Article[]> {
  if (!auroraConfigured()) return [];
  try {
    const { rows } = await query<Row>(
      `SELECT ${LIST_COLUMNS}
       FROM content c
       JOIN categories cat ON cat.category_id = c.category_id
       WHERE c.tenant_id = $1
         AND c.status = 'published'
         AND cat.slug = $2
       ORDER BY c.published_at DESC NULLS LAST`,
      [asUuid(tenantId), categorySlug],
    );
    return rows.map((r) => rowToArticle(r, false));
  } catch (err) {
    console.error('[articles] getArticlesByCategory failed:', err);
    return [];
  }
}

export async function getArticleBySlug(
  tenantId: string,
  slug: string,
): Promise<Article | null> {
  if (!auroraConfigured()) return null;
  try {
    const { rows } = await query<Row>(
      `SELECT ${DETAIL_COLUMNS}
       FROM content c
       LEFT JOIN categories cat ON cat.category_id = c.category_id
       WHERE c.tenant_id = $1
         AND c.slug = $2
         AND c.status = 'published'
       LIMIT 1`,
      [asUuid(tenantId), slug],
    );
    if (rows.length === 0) return null;
    return rowToArticle(rows[0]!, true);
  } catch (err) {
    console.error('[articles] getArticleBySlug failed:', err);
    return null;
  }
}

export async function getAllPublishedSlugs(
  tenantId: string = DEFAULT_TENANT_ID,
): Promise<string[]> {
  if (!auroraConfigured()) return [];
  try {
    const { rows } = await query<{ slug: string }>(
      `SELECT slug FROM content
       WHERE tenant_id = $1 AND status = 'published'`,
      [asUuid(tenantId)],
    );
    return rows.map((r) => r.slug);
  } catch (err) {
    console.error('[articles] getAllPublishedSlugs failed:', err);
    return [];
  }
}

export type CategoryInfo = {
  name: string;
  slug: string;
  description: string | null;
  fullPath: string;
};

export async function getCategoryBySlug(
  tenantId: string,
  slug: string,
): Promise<CategoryInfo | null> {
  if (!auroraConfigured()) return null;
  try {
    const { rows } = await query<{
      name: string;
      slug: string;
      description: string | null;
      full_path: string | null;
    }>(
      `SELECT name, slug, description, full_path
       FROM categories
       WHERE tenant_id = $1 AND slug = $2
       LIMIT 1`,
      [asUuid(tenantId), slug],
    );
    if (rows.length === 0) return null;
    const r = rows[0]!;
    return {
      name: r.name,
      slug: r.slug,
      description: r.description,
      fullPath: r.full_path ?? r.name,
    };
  } catch (err) {
    console.error('[articles] getCategoryBySlug failed:', err);
    return null;
  }
}

export async function getCategorySlugsWithPublishedContent(
  tenantId: string = DEFAULT_TENANT_ID,
): Promise<string[]> {
  if (!auroraConfigured()) return [];
  try {
    const { rows } = await query<{ slug: string }>(
      `SELECT DISTINCT cat.slug
       FROM categories cat
       JOIN content c ON c.category_id = cat.category_id
       WHERE cat.tenant_id = $1 AND c.status = 'published'`,
      [asUuid(tenantId)],
    );
    return rows.map((r) => r.slug);
  } catch (err) {
    console.error('[articles] getCategorySlugsWithPublishedContent failed:', err);
    return [];
  }
}
