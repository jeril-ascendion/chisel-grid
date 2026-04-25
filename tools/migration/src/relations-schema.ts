/**
 * content_relations migration — TASK-P07-01.
 *
 * Polymorphic edge table joining articles, diagrams, sessions, decisions,
 * and templates into the bidirectional knowledge graph (EPIC-P07).
 *
 * tenant_id is TEXT to coexist with both content.tenant_id (UUID) and
 * grid_diagrams.tenant_id (TEXT). Repository layer casts on join.
 *
 * No DB-level FK on source_id/target_id — Postgres can't enforce a
 * polymorphic FK. Existence is checked in the repository write path.
 *
 * Idempotent: safe to re-run.
 *
 * Usage:
 *   pnpm --filter @chiselgrid/migration relations:migrate
 *   pnpm --filter @chiselgrid/migration relations:verify
 */

import { query } from './rds-client.js';

const CREATE_CONTENT_RELATIONS = `
CREATE TABLE IF NOT EXISTS content_relations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL,
  source_id       UUID NOT NULL,
  source_type     TEXT NOT NULL CHECK (source_type IN ('article','diagram','session','decision','template')),
  target_id       UUID NOT NULL,
  target_type     TEXT NOT NULL CHECK (target_type IN ('article','diagram','session','decision','template')),
  relation_type   TEXT NOT NULL CHECK (relation_type IN ('references','illustrates','created_from','documents','related_to','contradicts')),
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_link CHECK (NOT (source_id = target_id AND source_type = target_type)),
  CONSTRAINT uniq_edge UNIQUE (tenant_id, source_id, source_type, target_id, target_type, relation_type)
)
`;

const INDEXES = [
  `CREATE INDEX IF NOT EXISTS content_relations_outbound_idx
     ON content_relations(tenant_id, source_id, source_type)`,
  `CREATE INDEX IF NOT EXISTS content_relations_inbound_idx
     ON content_relations(tenant_id, target_id, target_type)`,
  `CREATE INDEX IF NOT EXISTS content_relations_target_count_idx
     ON content_relations(tenant_id, target_type, target_id)`,
  `CREATE INDEX IF NOT EXISTS content_relations_relation_type_idx
     ON content_relations(tenant_id, relation_type)`,
];

export async function migrateRelationsSchema(): Promise<void> {
  console.log('→ creating content_relations');
  await query(CREATE_CONTENT_RELATIONS);

  for (const sql of INDEXES) {
    console.log(`→ ${sql.trim().split('\n')[0]}`);
    await query(sql);
  }

  console.log('content_relations migration complete');
}

export async function verifyRelationsSchema(): Promise<void> {
  const { rows: tableRows } = await query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_name='content_relations'`,
  );
  if (tableRows.length === 0) {
    throw new Error('content_relations table not found');
  }

  const { rows: indexRows } = await query(
    `SELECT indexname FROM pg_indexes
     WHERE schemaname='public' AND tablename='content_relations'
     ORDER BY indexname`,
  );
  const indexNames = indexRows.map((r) => r['indexname']);
  console.log('content_relations indexes:', indexNames.join(', '));

  const required = [
    'content_relations_outbound_idx',
    'content_relations_inbound_idx',
    'content_relations_target_count_idx',
    'content_relations_relation_type_idx',
  ];
  const missing = required.filter((n) => !indexNames.includes(n));
  if (missing.length) {
    throw new Error(`missing indexes: ${missing.join(', ')}`);
  }

  const { rows: constraintRows } = await query(
    `SELECT conname FROM pg_constraint
     WHERE conrelid = 'content_relations'::regclass
     ORDER BY conname`,
  );
  const constraintNames = constraintRows.map((r) => r['conname']);
  console.log('content_relations constraints:', constraintNames.join(', '));

  const requiredConstraints = ['no_self_link', 'uniq_edge'];
  const missingConstraints = requiredConstraints.filter(
    (n) => !constraintNames.includes(n),
  );
  if (missingConstraints.length) {
    throw new Error(`missing constraints: ${missingConstraints.join(', ')}`);
  }
}

const entry = process.argv[1] ?? '';
if (
  entry.endsWith('relations-schema.ts') ||
  entry.endsWith('relations-schema.js')
) {
  const mode = process.argv[2] ?? 'migrate';
  (async () => {
    if (mode === 'verify') {
      await verifyRelationsSchema();
    } else {
      await migrateRelationsSchema();
      await verifyRelationsSchema();
    }
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
