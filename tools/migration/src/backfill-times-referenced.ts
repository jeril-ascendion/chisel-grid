/**
 * Backfill content.times_referenced and grid_diagrams.times_referenced
 * from content_relations — TASK-P07-04.
 *
 * Idempotent: re-running gives the same result. Safe to run any time
 * the counters drift (e.g. after a bulk import that bypassed the
 * repository).
 *
 * Usage:
 *   pnpm --filter @chiselgrid/migration relations:backfill
 *   pnpm --filter @chiselgrid/migration relations:backfill verify
 */

import { query } from './rds-client.js';

const BACKFILL_CONTENT = `
UPDATE content c
   SET times_referenced = COALESCE(sub.cnt, 0)
  FROM (
    SELECT target_id, tenant_id, COUNT(*)::int AS cnt
      FROM content_relations
     WHERE target_type = 'article'
     GROUP BY target_id, tenant_id
  ) sub
 WHERE c.content_id = sub.target_id
   AND c.tenant_id::text = sub.tenant_id
`;

const ZERO_CONTENT_NO_EDGES = `
UPDATE content c
   SET times_referenced = 0
 WHERE NOT EXISTS (
   SELECT 1 FROM content_relations r
    WHERE r.target_id   = c.content_id
      AND r.target_type = 'article'
      AND r.tenant_id   = c.tenant_id::text
 )
   AND c.times_referenced <> 0
`;

const BACKFILL_DIAGRAMS = `
UPDATE grid_diagrams g
   SET times_referenced = COALESCE(sub.cnt, 0)
  FROM (
    SELECT target_id, tenant_id, COUNT(*)::int AS cnt
      FROM content_relations
     WHERE target_type = 'diagram'
     GROUP BY target_id, tenant_id
  ) sub
 WHERE g.id = sub.target_id
   AND g.tenant_id = sub.tenant_id
`;

const ZERO_DIAGRAMS_NO_EDGES = `
UPDATE grid_diagrams g
   SET times_referenced = 0
 WHERE NOT EXISTS (
   SELECT 1 FROM content_relations r
    WHERE r.target_id   = g.id
      AND r.target_type = 'diagram'
      AND r.tenant_id   = g.tenant_id
 )
   AND g.times_referenced <> 0
`;

export async function backfillRelationsCounters(): Promise<void> {
  console.log('→ backfilling content.times_referenced from edges');
  const a = await query(BACKFILL_CONTENT);
  console.log(`  rows updated: ${a.rowsAffected}`);
  console.log('→ zeroing content rows with no edges');
  const b = await query(ZERO_CONTENT_NO_EDGES);
  console.log(`  rows updated: ${b.rowsAffected}`);
  console.log('→ backfilling grid_diagrams.times_referenced from edges');
  const c = await query(BACKFILL_DIAGRAMS);
  console.log(`  rows updated: ${c.rowsAffected}`);
  console.log('→ zeroing grid_diagrams rows with no edges');
  const d = await query(ZERO_DIAGRAMS_NO_EDGES);
  console.log(`  rows updated: ${d.rowsAffected}`);
  console.log('backfill complete');
}

export async function verifyRelationsCountersInSync(): Promise<void> {
  const { rows: contentDrift } = await query(`
    SELECT COUNT(*)::int AS count FROM (
      SELECT c.content_id, c.times_referenced AS stored,
             COALESCE(r.cnt, 0) AS actual
        FROM content c
        LEFT JOIN (
          SELECT target_id, tenant_id, COUNT(*)::int AS cnt
            FROM content_relations
           WHERE target_type = 'article'
           GROUP BY target_id, tenant_id
        ) r ON r.target_id = c.content_id AND r.tenant_id = c.tenant_id::text
       WHERE c.times_referenced <> COALESCE(r.cnt, 0)
    ) drift
  `);
  const { rows: diagramDrift } = await query(`
    SELECT COUNT(*)::int AS count FROM (
      SELECT g.id, g.times_referenced AS stored,
             COALESCE(r.cnt, 0) AS actual
        FROM grid_diagrams g
        LEFT JOIN (
          SELECT target_id, tenant_id, COUNT(*)::int AS cnt
            FROM content_relations
           WHERE target_type = 'diagram'
           GROUP BY target_id, tenant_id
        ) r ON r.target_id = g.id AND r.tenant_id = g.tenant_id
       WHERE g.times_referenced <> COALESCE(r.cnt, 0)
    ) drift
  `);
  const cd = Number((contentDrift[0] as { count?: number } | undefined)?.count ?? 0);
  const dd = Number((diagramDrift[0] as { count?: number } | undefined)?.count ?? 0);
  console.log(`content rows out-of-sync: ${cd}`);
  console.log(`grid_diagrams rows out-of-sync: ${dd}`);
  if (cd > 0 || dd > 0) {
    throw new Error('counters drifted; re-run backfill');
  }
}

const entry = process.argv[1] ?? '';
if (
  entry.endsWith('backfill-times-referenced.ts') ||
  entry.endsWith('backfill-times-referenced.js')
) {
  const mode = process.argv[2] ?? 'run';
  (async () => {
    if (mode === 'verify') {
      await verifyRelationsCountersInSync();
    } else {
      await backfillRelationsCounters();
      await verifyRelationsCountersInSync();
    }
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
