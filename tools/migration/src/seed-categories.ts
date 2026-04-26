#!/usr/bin/env tsx
/**
 * Seed all taxonomy categories into Aurora via RDS Data API.
 * Usage: AWS_PROFILE=... AWS_REGION=... tsx src/seed-categories.ts
 */
import { randomUUID } from 'crypto';
import { query, rdsTyped } from './rds-client.js';
import { getAllCategories } from './taxonomy-categories.js';

async function main() {
  const dbRow = await query('SELECT current_database() as db');
  console.log(`Connected to: ${dbRow.rows[0]?.['db']}`);

  // Ensure tenant
  let tenantId: string;
  const existing = await query(
    `SELECT tenant_id FROM tenants WHERE subdomain = $1`,
    ['ascendion'],
  );
  if (existing.rows.length > 0) {
    tenantId = existing.rows[0]!['tenant_id'];
    console.log(`Tenant exists: ${tenantId}`);
  } else {
    tenantId = randomUUID();
    await query(
      `INSERT INTO tenants (tenant_id, name, subdomain, plan) VALUES ($1, $2, $3, $4)`,
      [rdsTyped(tenantId, 'UUID'), 'Ascendion Engineering', 'ascendion', 'internal'],
    );
    console.log(`Created tenant: ${tenantId}`);
  }

  const cats = getAllCategories();
  const slugToId = new Map<string, string>();
  let created = 0;
  let existed = 0;

  for (const cat of cats) {
    const ex = await query(
      `SELECT category_id FROM categories WHERE tenant_id = $1 AND slug = $2`,
      [rdsTyped(tenantId, 'UUID'), cat.slug],
    );
    if (ex.rows.length > 0) {
      slugToId.set(cat.slug, ex.rows[0]!['category_id']);
      existed++;
    } else {
      const id = randomUUID();
      await query(
        `INSERT INTO categories (category_id, tenant_id, name, slug, description) VALUES ($1, $2, $3, $4, $5)`,
        [
          rdsTyped(id, 'UUID'),
          rdsTyped(tenantId, 'UUID'),
          cat.name,
          cat.slug,
          null,
        ],
      );
      slugToId.set(cat.slug, id);
      created++;
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

  console.log(
    `\nCategories: ${created} created, ${existed} already existed, ${slugToId.size} total`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
