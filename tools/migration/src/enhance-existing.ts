#!/usr/bin/env tsx
/**
 * Re-run AI enhancement on articles that already exist in Aurora but were
 * imported with fallback content (no Bedrock summary/tags).
 *
 * Adds `ai_summary` column if missing. Populates ai_summary and attaches
 * tags via the existing tags / content_tags tables.
 *
 * Usage: AWS_PROFILE=... AWS_REGION=... tsx src/enhance-existing.ts
 */
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { query, rdsTyped } from './rds-client.js';
import { randomUUID } from 'crypto';

const REGION = process.env['AWS_REGION'] ?? 'ap-southeast-1';
const MODEL_ID = 'global.anthropic.claude-sonnet-4-5-20250929-v1:0';
const BATCH_SIZE = 5;
const BATCH_PAUSE_MS = 500;
const TENANT_SUBDOMAIN = 'ascendion';

const bedrock = new BedrockRuntimeClient({ region: REGION });

interface ContentRow {
  content_id: string;
  tenant_id: string;
  title: string;
  slug: string;
  description: string | null;
}


interface Enhancement {
  title: string;
  aiSummary: string;
  tags: string[];
}

async function ensureAiSummaryColumn(): Promise<void> {
  await query(`ALTER TABLE content ADD COLUMN IF NOT EXISTS ai_summary TEXT`);
}

async function getTenantId(subdomain: string): Promise<string> {
  const { rows } = await query(
    `SELECT tenant_id FROM tenants WHERE subdomain = $1 LIMIT 1`,
    [subdomain],
  );
  const id = rows[0]?.['tenant_id'] as string | undefined;
  if (!id) throw new Error(`No tenant found for subdomain=${subdomain}`);
  return id;
}

async function fetchArticlesNeedingEnhancement(tenantId: string): Promise<ContentRow[]> {
  const { rows } = await query(
    `SELECT content_id, tenant_id, title, slug, description
     FROM content
     WHERE tenant_id = $1::uuid AND ai_summary IS NULL
     ORDER BY created_at ASC`,
    [tenantId],
  );
  return rows as unknown as ContentRow[];
}

async function fetchBlocks(contentId: string): Promise<unknown> {
  const { rows } = await query(
    `SELECT blocks FROM content WHERE content_id = $1::uuid`,
    [contentId],
  );
  return rows[0]?.['blocks'];
}

function extractTextFromBlocks(blocks: unknown, maxLen = 8000): string {
  let arr: unknown[] = [];
  if (Array.isArray(blocks)) arr = blocks;
  else if (typeof blocks === 'string') {
    try {
      arr = JSON.parse(blocks);
    } catch {
      arr = [];
    }
  }
  const parts: string[] = [];
  for (const b of arr as Array<Record<string, unknown>>) {
    if (!b || typeof b !== 'object') continue;
    const type = String(b['type'] ?? '');
    const content = String(b['content'] ?? '');
    if (!content) continue;
    if (type === 'heading') parts.push(`\n## ${content}\n`);
    else if (type === 'paragraph' || type === 'text') parts.push(content);
    else if (type === 'list' || type === 'callout') parts.push(content);
  }
  const joined = parts.join('\n\n');
  return joined.length > maxLen ? joined.slice(0, maxLen) : joined;
}

async function enhanceArticle(row: ContentRow): Promise<Enhancement> {
  const blocks = await fetchBlocks(row.content_id);
  const articleText = extractTextFromBlocks(blocks);
  const systemPrompt =
    'You are a technical content enhancer. Given an HTML article body, return ' +
    'ONLY valid JSON (no markdown fences) with: title (improved SEO title string), ' +
    'aiSummary (2-3 sentence summary for RAG retrieval), tags (array of 3-5 ' +
    'relevant technical tags as lowercase kebab-case strings).';
  const userPrompt =
    `Article title: ${row.title}\n` +
    `Current description: ${row.description ?? ''}\n\n` +
    `Article body (truncated):\n${articleText}\n\n` +
    `Return only JSON: {"title": "...", "aiSummary": "...", "tags": ["...","..."]}`;

  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1024,
    temperature: 0.5,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await bedrock.send(
        new InvokeModelCommand({
          modelId: MODEL_ID,
          contentType: 'application/json',
          accept: 'application/json',
          body,
        }),
      );
      const decoded = JSON.parse(new TextDecoder().decode(res.body));
      const text = decoded?.content?.[0]?.text ?? '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('no JSON in Bedrock response');
      const parsed = JSON.parse(match[0]) as Partial<Enhancement>;
      if (!parsed.aiSummary || !Array.isArray(parsed.tags)) {
        throw new Error('invalid enhancement shape');
      }
      return {
        title: parsed.title?.trim() || row.title,
        aiSummary: parsed.aiSummary.trim(),
        tags: parsed.tags.map((t) => String(t).toLowerCase().trim()).filter(Boolean).slice(0, 5),
      };
    } catch (err) {
      if (attempt === 2) throw err;
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
    }
  }
  throw new Error('enhance retries exhausted');
}

async function upsertTagsForContent(
  contentId: string,
  tenantId: string,
  tagNames: string[],
): Promise<void> {
  for (const name of tagNames) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!slug) continue;
    const existing = await query(
      `SELECT tag_id FROM tags WHERE tenant_id = $1::uuid AND slug = $2 LIMIT 1`,
      [tenantId, slug],
    );
    let tagId = existing.rows[0]?.['tag_id'] as string | undefined;
    if (!tagId) {
      tagId = randomUUID();
      await query(
        `INSERT INTO tags (tag_id, tenant_id, name, slug, created_at)
         VALUES ($1::uuid, $2::uuid, $3, $4, NOW())
         ON CONFLICT DO NOTHING`,
        [tagId, tenantId, name, slug],
      );
    }
    await query(
      `INSERT INTO content_tags (content_id, tag_id)
       VALUES ($1::uuid, $2::uuid) ON CONFLICT DO NOTHING`,
      [contentId, tagId],
    );
  }
}

async function applyEnhancement(
  row: ContentRow,
  enh: Enhancement,
): Promise<void> {
  await query(
    `UPDATE content
     SET ai_summary = $1,
         title = $2,
         updated_at = NOW()
     WHERE content_id = $3::uuid`,
    [enh.aiSummary, enh.title, row.content_id],
  );
  await upsertTagsForContent(row.content_id, row.tenant_id, enh.tags);
}

async function main(): Promise<void> {
  console.log(`[enhance] model=${MODEL_ID} batch=${BATCH_SIZE}`);
  await ensureAiSummaryColumn();
  const tenantId = await getTenantId(TENANT_SUBDOMAIN);
  console.log(`[enhance] tenant=${TENANT_SUBDOMAIN} id=${tenantId}`);

  const rows = await fetchArticlesNeedingEnhancement(tenantId);
  console.log(`[enhance] ${rows.length} articles need AI enhancement`);
  if (rows.length === 0) return;

  let done = 0;
  let failed = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (row) => {
        try {
          const enh = await enhanceArticle(row);
          await applyEnhancement(row, enh);
          done++;
          console.log(`[${done + failed}/${rows.length}] ✅ ${row.slug}`);
        } catch (err) {
          failed++;
          console.log(`[${done + failed}/${rows.length}] ❌ ${row.slug}: ${(err as Error).message}`);
        }
      }),
    );
    if (i + BATCH_SIZE < rows.length) {
      await new Promise((r) => setTimeout(r, BATCH_PAUSE_MS));
    }
  }
  console.log(`[enhance] done=${done} failed=${failed}`);
  // Silence unused-import warning
  void rdsTyped;
}

main().catch((err) => {
  console.error('[enhance] fatal:', err);
  process.exit(1);
});
