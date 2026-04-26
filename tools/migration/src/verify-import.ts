#!/usr/bin/env tsx
/**
 * Verify the taxonomy import results via RDS Data API.
 */
import { query, rdsTyped } from './rds-client.js';

async function main() {
  const tenant = await query(
    `SELECT tenant_id FROM tenants WHERE subdomain = $1`,
    ['ascendion'],
  );
  if (tenant.rows.length === 0) {
    console.error('Tenant "ascendion" not found');
    process.exit(1);
  }
  const tenantId = tenant.rows[0]!['tenant_id'];

  console.log('═══ Import Verification ═══\n');

  const total = await query(
    `SELECT count(*)::int as c FROM content WHERE tenant_id = $1 AND status = 'in_review'`,
    [rdsTyped(tenantId, 'UUID')],
  );
  console.log(`Total in_review: ${total.rows[0]?.['c']}`);

  const byCat = await query(
    `SELECT c.slug as cat_slug, count(*)::int as cnt
     FROM content co
     JOIN categories c ON co.category_id = c.category_id
     WHERE co.tenant_id = $1 AND co.status = 'in_review'
     GROUP BY c.slug ORDER BY cnt DESC`,
    [rdsTyped(tenantId, 'UUID')],
  );
  console.log(`\nCategories: ${byCat.rows.length} unique`);
  for (const r of byCat.rows.slice(0, 10)) {
    console.log(`  ${r['cat_slug']}: ${r['cnt']}`);
  }

  const samples = await query(
    `SELECT title, slug, read_time_minutes FROM content
     WHERE tenant_id = $1 AND status = 'in_review'
     ORDER BY created_at DESC LIMIT 5`,
    [rdsTyped(tenantId, 'UUID')],
  );
  console.log(`\nSample titles:`);
  for (const r of samples.rows) {
    console.log(`  "${r['title']}" (${r['slug']}) — ${r['read_time_minutes']}min`);
  }

  const svgCheck = await query(
    `SELECT count(*)::int as c FROM content
     WHERE tenant_id = $1 AND status = 'in_review'
     AND blocks::text LIKE '%"diagramType":"svg"%'`,
    [rdsTyped(tenantId, 'UUID')],
  );
  console.log(
    `\nAnimation blocks present: ${
      Number(svgCheck.rows[0]?.['c']) > 0 ? 'YES' : 'NO'
    } (${svgCheck.rows[0]?.['c']} articles)`,
  );

  const published = await query(
    `SELECT count(*)::int as c FROM content WHERE tenant_id = $1 AND status = 'published'`,
    [rdsTyped(tenantId, 'UUID')],
  );
  const publishedCount = Number(published.rows[0]?.['c']);
  console.log(
    `Published articles: ${publishedCount} ${
      publishedCount === 0 ? '(correct — all awaiting admin review)' : '(WARNING: should be 0)'
    }`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
