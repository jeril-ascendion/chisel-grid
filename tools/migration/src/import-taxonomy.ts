#!/usr/bin/env tsx
/**
 * Import 156 ascendion.engineering taxonomy articles into ChiselGrid Aurora
 * via RDS Data API (no direct pg connection required).
 * Each article is AI-enhanced via Bedrock and lands as status='in_review'.
 *
 * Usage: AWS_PROFILE=... AWS_REGION=... tsx src/import-taxonomy.ts [--dry-run] [--skip-ai] [--batch-size=5]
 */

import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import { randomUUID } from 'crypto';
import { query, rdsTyped } from './rds-client.js';
import {
  urlPathToSlug,
  urlPathToCategory,
  getAllCategories,
} from './taxonomy-categories.js';
import { generateHeroSvg } from './svg-generator.js';

// ── Config ──────────────────────────────────────────────────
const SOURCE_DIR = process.env['SOURCE_DIR'] ?? '/tmp/taxonomy-source/dist';
const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_AI = process.argv.includes('--skip-ai');
const BATCH_SIZE = parseInt(
  process.argv.find((a) => a.startsWith('--batch-size='))?.split('=')[1] ?? '5',
);
const PROGRESS_FILE = '/tmp/import-progress.json';
const TENANT_NAME = 'ascendion';

interface ParsedArticle {
  urlPath: string;
  title: string;
  description: string;
  sections: { heading: string; level: number; content: string }[];
  mermaidCode: string | null;
  frameworks: string[];
}

interface EnhancedArticle {
  title: string;
  description: string;
  sections: { heading: string; level: number; content: string }[];
  mermaidDiagram: string | null;
  keyTakeaways: string[];
  readTimeMinutes: number;
  tags: string[];
}

// ── HTML Parser ─────────────────────────────────────────────
function parseHtml(filePath: string, urlPath: string): ParsedArticle {
  const html = fs.readFileSync(filePath, 'utf-8');
  const $ = cheerio.load(html);

  const title =
    $('h1').first().text().trim() ||
    $('title')
      .text()
      .replace(/\s*[—·|].*$/, '')
      .trim() ||
    urlPath;
  const description =
    $('.hero-desc').text().trim() ||
    $('meta[name="description"]').attr('content') ||
    '';

  const sections: { heading: string; level: number; content: string }[] = [];
  const mainContent = $('main, .content, article, body');

  mainContent.find('h2, h3').each((_, el) => {
    const $el = $(el);
    const heading = $el.text().trim();
    const level = el.tagName === 'h2' ? 2 : 3;
    const contentParts: string[] = [];
    let next = $el.next();
    while (next.length && !next.is('h2, h3')) {
      const tag = next.get(0)?.tagName;
      if (
        tag === 'p' ||
        tag === 'li' ||
        tag === 'ul' ||
        tag === 'ol' ||
        tag === 'pre' ||
        tag === 'table'
      ) {
        contentParts.push(next.text().trim());
      }
      next = next.next();
    }
    if (heading) {
      sections.push({ heading, level, content: contentParts.join('\n\n') });
    }
  });

  if (sections.length === 0) {
    const allText: string[] = [];
    mainContent.find('p').each((_, el) => {
      const t = $(el).text().trim();
      if (t) allText.push(t);
    });
    if (allText.length > 0) {
      sections.push({
        heading: 'Overview',
        level: 2,
        content: allText.join('\n\n'),
      });
    }
  }

  const mermaidCode = $('.mermaid').first().text().trim() || null;
  const frameworks: string[] = [];
  $('.hero-meta, .meta').each((_, el) => {
    const t = $(el).text().trim();
    if (t) frameworks.push(t);
  });

  return { urlPath, title, description, sections, mermaidCode, frameworks };
}

// ── Bedrock AI Enhancement ──────────────────────────────────
async function enhanceWithAI(parsed: ParsedArticle): Promise<EnhancedArticle> {
  const { BedrockRuntimeClient, InvokeModelCommand } = await import(
    '@aws-sdk/client-bedrock-runtime'
  );
  const client = new BedrockRuntimeClient({
    region: process.env['AWS_REGION'] ?? 'ap-southeast-1',
  });

  const currentContent = parsed.sections
    .map((s) => `## ${s.heading}\n${s.content}`)
    .join('\n\n');

  const systemPrompt = `You are a senior solutions architect at a top-tier technology consultancy. You write practitioner-grade engineering articles that are cited by engineers at Google, AWS, Netflix, and Stripe. Your writing is precise, opinionated, and immediately actionable.`;

  const userPrompt = `Enhance this engineering article about "${parsed.title}".
Current content:
${currentContent.slice(0, 6000)}

Current description: ${parsed.description}

Research and significantly enhance this article by:
1. Adding real-world examples from how Netflix, AWS, Google, Stripe, Uber, Airbnb, or similar companies solve this problem
2. Adding a "Real-World Case Study" section with a concrete named company example
3. Adding an "Ascendion Implementation Notes" section with specific, opinionated recommendations
4. Expanding the Implementation Guide with step-by-step guidance
5. Adding a "Common Pitfalls in Practice" section
6. Adding specific tool recommendations with version numbers where relevant
7. Ensuring all technical claims are accurate as of 2025-2026

Return ONLY valid JSON in this exact format (no markdown fences):
{
  "title": "enhanced title",
  "description": "compelling 2-sentence description",
  "sections": [
    {"heading": "Overview", "level": 2, "content": "paragraph text..."},
    {"heading": "Core Principles", "level": 2, "content": "..."},
    {"heading": "Real-World Case Study", "level": 2, "content": "..."},
    {"heading": "Implementation Guide", "level": 2, "content": "..."},
    {"heading": "Ascendion Implementation Notes", "level": 2, "content": "..."},
    {"heading": "Common Pitfalls in Practice", "level": 2, "content": "..."},
    {"heading": "Tool Recommendations", "level": 2, "content": "..."}
  ],
  "keyTakeaways": ["takeaway 1", "takeaway 2", "takeaway 3"],
  "readTimeMinutes": 12,
  "tags": ["tag1", "tag2"]
}`;

  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 4096,
    temperature: 0.7,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await client.send(
        new InvokeModelCommand({
          modelId: 'anthropic.claude-sonnet-4-5',
          contentType: 'application/json',
          accept: 'application/json',
          body,
        }),
      );

      const result = JSON.parse(new TextDecoder().decode(response.body));
      const text = result.content?.[0]?.text ?? '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      const enhanced = JSON.parse(jsonMatch[0]) as EnhancedArticle;
      enhanced.mermaidDiagram = parsed.mermaidCode;
      return enhanced;
    } catch (err) {
      if (attempt === 2) throw err;
      const delay = 1000 * Math.pow(2, attempt) + Math.random() * 500;
      console.log(`  Retry ${attempt + 1}/3 after ${Math.round(delay)}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw new Error('All retries exhausted');
}

function fallbackEnhancement(parsed: ParsedArticle): EnhancedArticle {
  return {
    title: parsed.title,
    description:
      parsed.description ||
      `A comprehensive guide to ${parsed.title} for enterprise engineering teams.`,
    sections:
      parsed.sections.length > 0
        ? parsed.sections
        : [
            {
              heading: 'Overview',
              level: 2,
              content: parsed.description || parsed.title,
            },
          ],
    mermaidDiagram: parsed.mermaidCode,
    keyTakeaways: [
      `Understand the fundamentals of ${parsed.title}`,
      'Apply patterns in practice',
      'Avoid common anti-patterns',
    ],
    readTimeMinutes: Math.max(
      5,
      Math.ceil(
        parsed.sections.reduce((a, s) => a + s.content.length, 0) / 1500,
      ),
    ),
    tags: parsed.urlPath.split('/').filter(Boolean),
  };
}

// ── ContentBlock Builder ────────────────────────────────────
interface ContentBlock {
  type: string;
  content: string;
  level?: number;
  language?: string;
  diagramType?: string;
  caption?: string;
  variant?: string;
}

function buildContentBlocks(
  enhanced: EnhancedArticle,
  categorySlug: string,
): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  const svg = generateHeroSvg(categorySlug);
  blocks.push({
    type: 'diagram',
    diagramType: 'svg',
    content: svg,
    caption: `${enhanced.title} — animated illustration`,
  });

  for (const section of enhanced.sections) {
    blocks.push({ type: 'heading', level: section.level, content: section.heading });

    const paragraphs = section.content.split('\n\n').filter((p) => p.trim());
    for (const p of paragraphs) {
      if (p.includes('```')) {
        const match = p.match(/```(\w*)\n?([\s\S]*?)```/);
        if (match) {
          blocks.push({
            type: 'code',
            language: match[1] || 'text',
            content: match[2]!.trim(),
          });
          continue;
        }
      }
      blocks.push({ type: 'text', content: p.trim() });
    }
  }

  if (enhanced.mermaidDiagram) {
    blocks.push({ type: 'heading', level: 2, content: 'Architecture Diagram' });
    blocks.push({
      type: 'diagram',
      diagramType: 'mermaid',
      content: enhanced.mermaidDiagram,
    });
  }

  if (enhanced.keyTakeaways?.length) {
    blocks.push({ type: 'heading', level: 2, content: 'Key Takeaways' });
    blocks.push({
      type: 'callout',
      variant: 'success',
      content: enhanced.keyTakeaways
        .map((t, i) => `${i + 1}. ${t}`)
        .join('\n'),
    });
  }

  return blocks;
}

// ── File Discovery ──────────────────────────────────────────
function discoverArticles(
  sourceDir: string,
): { filePath: string; urlPath: string }[] {
  const articles: { filePath: string; urlPath: string }[] = [];

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name === 'index.html') {
        const rel = path.relative(sourceDir, path.dirname(full));
        if (rel && rel !== '.') {
          articles.push({ filePath: full, urlPath: rel });
        }
      }
    }
  }

  walk(sourceDir);
  return articles.sort((a, b) => a.urlPath.localeCompare(b.urlPath));
}

// ── Progress Tracking ───────────────────────────────────────
function loadProgress(): Set<string> {
  try {
    const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    return new Set(data.completed ?? []);
  } catch {
    return new Set();
  }
}

function saveProgress(completed: Set<string>) {
  fs.writeFileSync(
    PROGRESS_FILE,
    JSON.stringify({
      completed: [...completed],
      updatedAt: new Date().toISOString(),
    }),
  );
}

// ── Database Operations ─────────────────────────────────────
async function ensureTenant(): Promise<string> {
  const existing = await query(
    `SELECT tenant_id FROM tenants WHERE subdomain = $1`,
    [TENANT_NAME],
  );
  if (existing.rows.length > 0) return existing.rows[0]!['tenant_id'];

  const id = randomUUID();
  await query(
    `INSERT INTO tenants (tenant_id, name, subdomain, plan) VALUES ($1, $2, $3, $4)`,
    [rdsTyped(id, 'UUID'), 'Ascendion Engineering', TENANT_NAME, 'internal'],
  );
  console.log(`Created tenant: ${TENANT_NAME} (${id})`);
  return id;
}

async function ensureUser(tenantId: string): Promise<string> {
  const existing = await query(`SELECT user_id FROM users WHERE email = $1`, [
    'migration@ascendion.engineering',
  ]);
  if (existing.rows.length > 0) return existing.rows[0]!['user_id'];

  const id = randomUUID();
  await query(
    `INSERT INTO users (user_id, tenant_id, email, name, role, cognito_sub, enabled) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      rdsTyped(id, 'UUID'),
      rdsTyped(tenantId, 'UUID'),
      'migration@ascendion.engineering',
      'Taxonomy Migration',
      'admin',
      randomUUID(),
      true,
    ],
  );
  console.log(`Created migration user: ${id}`);
  return id;
}

async function seedCategories(tenantId: string): Promise<Map<string, string>> {
  const cats = getAllCategories();
  const slugToId = new Map<string, string>();

  for (const cat of cats) {
    const existing = await query(
      `SELECT category_id FROM categories WHERE tenant_id = $1 AND slug = $2`,
      [rdsTyped(tenantId, 'UUID'), cat.slug],
    );
    if (existing.rows.length > 0) {
      slugToId.set(cat.slug, existing.rows[0]!['category_id']);
    } else {
      const id = randomUUID();
      await query(
        `INSERT INTO categories (category_id, tenant_id, name, slug, description) VALUES ($1, $2, $3, $4, $5)`,
        [
          rdsTyped(id, 'UUID'),
          rdsTyped(tenantId, 'UUID'),
          cat.name,
          cat.slug,
          cat.description ?? null,
        ],
      );
      slugToId.set(cat.slug, id);
    }
  }

  for (const cat of cats) {
    if (cat.parentSlug && slugToId.has(cat.parentSlug)) {
      await query(
        `UPDATE categories SET parent_id = $1 WHERE category_id = $2`,
        [
          rdsTyped(slugToId.get(cat.parentSlug)!, 'UUID'),
          rdsTyped(slugToId.get(cat.slug)!, 'UUID'),
        ],
      );
    }
  }

  console.log(`Seeded ${slugToId.size} categories`);
  return slugToId;
}

async function insertArticle(
  tenantId: string,
  authorId: string,
  slug: string,
  enhanced: EnhancedArticle,
  blocks: ContentBlock[],
  categoryId: string | null,
  urlPath: string,
  wasEnhanced: boolean,
): Promise<boolean> {
  const existing = await query(
    `SELECT content_id FROM content WHERE tenant_id = $1 AND slug = $2`,
    [rdsTyped(tenantId, 'UUID'), slug],
  );
  if (existing.rows.length > 0) return false;

  await query(
    `INSERT INTO content (content_id, tenant_id, author_id, title, slug, description, content_type, status, blocks, read_time_minutes, category_id, seo_meta_title, seo_meta_description)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      rdsTyped(randomUUID(), 'UUID'),
      rdsTyped(tenantId, 'UUID'),
      rdsTyped(authorId, 'UUID'),
      enhanced.title.slice(0, 500),
      slug.slice(0, 500),
      enhanced.description,
      'standard_doc',
      'in_review',
      rdsTyped(blocks, 'JSON'),
      enhanced.readTimeMinutes,
      categoryId ? rdsTyped(categoryId, 'UUID') : null,
      enhanced.title.slice(0, 200),
      (enhanced.description || '').slice(0, 500),
    ],
  );

  return true;
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  console.log('═══ ChiselGrid Taxonomy Import (Data API) ═══');
  console.log(`Source: ${SOURCE_DIR}`);
  console.log(`Dry run: ${DRY_RUN}`);
  console.log(`Skip AI: ${SKIP_AI}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log('');

  const articles = discoverArticles(SOURCE_DIR);
  console.log(`Found ${articles.length} articles`);

  if (articles.length === 0) {
    console.error('No articles found! Check SOURCE_DIR');
    process.exit(1);
  }

  const completed = loadProgress();
  console.log(`Previously completed: ${completed.size}`);

  let tenantId = '';
  let authorId = '';
  let categoryMap = new Map<string, string>();

  if (!DRY_RUN) {
    const db = await query('SELECT current_database() as db');
    console.log(`Connected to: ${db.rows[0]?.['db']}`);
    tenantId = await ensureTenant();
    authorId = await ensureUser(tenantId);
    categoryMap = await seedCategories(tenantId);
  }

  let imported = 0;
  let skipped = 0;
  let failed = 0;
  const errors: { urlPath: string; error: string }[] = [];

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, Math.min(i + BATCH_SIZE, articles.length));

    for (const { filePath, urlPath } of batch) {
      const idx = articles.findIndex((a) => a.urlPath === urlPath) + 1;
      const slug = urlPathToSlug(urlPath);

      if (completed.has(slug)) {
        skipped++;
        console.log(`[${idx}/${articles.length}] SKIP (done): ${urlPath}`);
        continue;
      }

      try {
        const parsed = parseHtml(filePath, urlPath);

        let enhanced: EnhancedArticle;
        let wasEnhanced = false;
        if (!SKIP_AI) {
          try {
            enhanced = await enhanceWithAI(parsed);
            wasEnhanced = true;
          } catch (aiErr) {
            console.log(
              `  AI enhancement failed: ${(aiErr as Error).message}. Using fallback.`,
            );
            enhanced = fallbackEnhancement(parsed);
          }
        } else {
          enhanced = fallbackEnhancement(parsed);
        }

        const categorySlug = urlPathToCategory(urlPath);
        const blocks = buildContentBlocks(enhanced, categorySlug);

        if (DRY_RUN) {
          console.log(
            `[${idx}/${articles.length}] DRY: ${urlPath} — "${enhanced.title}" (${blocks.length} blocks, ${enhanced.readTimeMinutes}min)`,
          );
        } else {
          const categoryId = categoryMap.get(categorySlug) ?? null;
          const wasInserted = await insertArticle(
            tenantId,
            authorId,
            slug,
            enhanced,
            blocks,
            categoryId,
            urlPath,
            wasEnhanced,
          );
          if (wasInserted) {
            console.log(
              `[${idx}/${articles.length}] IMPORTED: ${urlPath} — "${enhanced.title}" (${blocks.length} blocks)`,
            );
          } else {
            console.log(`[${idx}/${articles.length}] SKIP (exists): ${urlPath}`);
            skipped++;
            completed.add(slug);
            saveProgress(completed);
            continue;
          }
        }

        imported++;
        completed.add(slug);
        saveProgress(completed);

        if (!SKIP_AI) await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        failed++;
        const msg = (err as Error).message;
        errors.push({ urlPath, error: msg });
        console.error(`[${idx}/${articles.length}] FAILED: ${urlPath} — ${msg}`);
      }
    }

    if (!SKIP_AI && i + BATCH_SIZE < articles.length) {
      console.log(`  Batch pause (500ms)...`);
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log('\n═══ Import Summary ═══');
  console.log(`Total:    ${articles.length}`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Failed:   ${failed}`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    for (const e of errors) {
      console.error(`  ${e.urlPath}: ${e.error}`);
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
