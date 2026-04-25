/**
 * times_referenced column migration — TASK-P07-04 prerequisite.
 *
 * Adds backlink counter columns to content and grid_diagrams. The
 * relations.repository.ts depends on these columns existing — they're
 * brought forward from TASK-P07-04 so the repository's tx-wrapped
 * increment can work end-to-end.
 *
 * Idempotent: safe to re-run.
 *
 * Usage:
 *   pnpm --filter @chiselgrid/migration relations:counters
 *   pnpm --filter @chiselgrid/migration relations:counters verify
 */

import { query } from './rds-client.js';

const STATEMENTS = [
  `ALTER TABLE content
     ADD COLUMN IF NOT EXISTS times_referenced INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE grid_diagrams
     ADD COLUMN IF NOT EXISTS times_referenced INTEGER NOT NULL DEFAULT 0`,
  `CREATE INDEX IF NOT EXISTS idx_content_times_referenced
     ON content(tenant_id, times_referenced DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_grid_diagrams_times_referenced
     ON grid_diagrams(tenant_id, times_referenced DESC)`,
];

export async function migrateRelationsCounters(): Promise<void> {
  for (const sql of STATEMENTS) {
    console.log(`→ ${sql.trim().split('\n')[0]}`);
    await query(sql);
  }
  console.log('times_referenced columns ready');
}

export async function verifyRelationsCounters(): Promise<void> {
  const { rows } = await query(
    `SELECT table_name, column_name FROM information_schema.columns
     WHERE table_schema='public'
       AND column_name='times_referenced'
       AND table_name IN ('content','grid_diagrams')
     ORDER BY table_name`,
  );
  const present = rows.map((r) => r['table_name']);
  console.log('times_referenced present on:', present.join(', '));
  for (const t of ['content', 'grid_diagrams']) {
    if (!present.includes(t)) {
      throw new Error(`times_referenced missing on ${t}`);
    }
  }
}

const entry = process.argv[1] ?? '';
if (
  entry.endsWith('relations-counters.ts') ||
  entry.endsWith('relations-counters.js')
) {
  const mode = process.argv[2] ?? 'migrate';
  (async () => {
    if (mode === 'verify') {
      await verifyRelationsCounters();
    } else {
      await migrateRelationsCounters();
      await verifyRelationsCounters();
    }
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
