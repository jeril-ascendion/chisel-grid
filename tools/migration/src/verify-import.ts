#!/usr/bin/env tsx
/**
 * Verify the taxonomy import results.
 * Usage: DATABASE_URL=... tsx src/verify-import.ts
 */
import { Pool } from 'pg';

async function main() {
  const dbUrl = process.env['DATABASE_URL'];
  if (!dbUrl) { console.error('DATABASE_URL required'); process.exit(1); }

  const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false }, max: 3 });

  const tenant = await pool.query(`SELECT tenant_id FROM tenants WHERE subdomain = 'ascendion'`);
  if (tenant.rows.length === 0) { console.error('Tenant "ascendion" not found'); process.exit(1); }
  const tenantId = tenant.rows[0].tenant_id;

  console.log('═══ Import Verification ═══\n');

  // Total in_review
  const total = await pool.query(`SELECT count(*) as c FROM content WHERE tenant_id = $1 AND status = 'in_review'`, [tenantId]);
  console.log(`Total in_review: ${total.rows[0].c}`);

  // By category
  const byCat = await pool.query(`
    SELECT c.slug as cat_slug, count(*) as cnt
    FROM content co
    JOIN categories c ON co.category_id = c.category_id
    WHERE co.tenant_id = $1 AND co.status = 'in_review'
    GROUP BY c.slug ORDER BY cnt DESC
  `, [tenantId]);
  console.log(`\nCategories: ${byCat.rows.length} unique`);
  for (const r of byCat.rows.slice(0, 10)) {
    console.log(`  ${r.cat_slug}: ${r.cnt}`);
  }

  // Sample titles
  const samples = await pool.query(`
    SELECT title, slug, read_time_minutes FROM content
    WHERE tenant_id = $1 AND status = 'in_review'
    ORDER BY created_at DESC LIMIT 5
  `, [tenantId]);
  console.log(`\nSample titles:`);
  for (const r of samples.rows) {
    console.log(`  "${r.title}" (${r.slug}) — ${r.read_time_minutes}min`);
  }

  // Check SVG animation blocks
  const svgCheck = await pool.query(`
    SELECT count(*) as c FROM content
    WHERE tenant_id = $1 AND status = 'in_review'
    AND blocks::text LIKE '%"diagramType":"svg"%'
  `, [tenantId]);
  console.log(`\nAnimation blocks present: ${parseInt(svgCheck.rows[0].c) > 0 ? 'YES' : 'NO'} (${svgCheck.rows[0].c} articles)`);

  // Published count (should be 0)
  const published = await pool.query(`SELECT count(*) as c FROM content WHERE tenant_id = $1 AND status = 'published'`, [tenantId]);
  console.log(`Published articles: ${published.rows[0].c} ${parseInt(published.rows[0].c) === 0 ? '(correct — all awaiting admin review)' : '(WARNING: should be 0)'}`);

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
