#!/usr/bin/env tsx
/**
 * Seed all taxonomy categories into Aurora.
 * Usage: DATABASE_URL=... tsx src/seed-categories.ts
 */
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { getAllCategories } from './taxonomy-categories.js';

async function main() {
  const dbUrl = process.env['DATABASE_URL'];
  if (!dbUrl) { console.error('DATABASE_URL required'); process.exit(1); }

  const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false }, max: 5 });
  const r = await pool.query('SELECT current_database()');
  console.log(`Connected to: ${r.rows[0].current_database}`);

  // Ensure tenant
  let tenantId: string;
  const existing = await pool.query(`SELECT tenant_id FROM tenants WHERE subdomain = 'ascendion'`);
  if (existing.rows.length > 0) {
    tenantId = existing.rows[0].tenant_id;
    console.log(`Tenant exists: ${tenantId}`);
  } else {
    tenantId = randomUUID();
    await pool.query(`INSERT INTO tenants (tenant_id, name, subdomain, plan) VALUES ($1, $2, $3, $4)`,
      [tenantId, 'Ascendion Engineering', 'ascendion', 'internal']);
    console.log(`Created tenant: ${tenantId}`);
  }

  const cats = getAllCategories();
  const slugToId = new Map<string, string>();
  let created = 0, existed = 0;

  for (const cat of cats) {
    const ex = await pool.query(`SELECT category_id FROM categories WHERE tenant_id = $1 AND slug = $2`, [tenantId, cat.slug]);
    if (ex.rows.length > 0) {
      slugToId.set(cat.slug, ex.rows[0].category_id);
      existed++;
    } else {
      const id = randomUUID();
      await pool.query(`INSERT INTO categories (category_id, tenant_id, name, slug, description) VALUES ($1, $2, $3, $4, $5)`,
        [id, tenantId, cat.name, cat.slug, null]);
      slugToId.set(cat.slug, id);
      created++;
    }
  }

  // Set parent_id
  for (const cat of cats) {
    if (cat.parentSlug && slugToId.has(cat.parentSlug)) {
      await pool.query(`UPDATE categories SET parent_id = $1 WHERE category_id = $2`,
        [slugToId.get(cat.parentSlug), slugToId.get(cat.slug)]);
    }
  }

  console.log(`\nCategories: ${created} created, ${existed} already existed, ${slugToId.size} total`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
