/**
 * Grid tables migration — TASK-GRID-01-07.
 *
 * Applies the grid_diagrams + grid_embeddings schema documented in GRID.md
 * against Aurora via the RDS Data API. Idempotent: safe to re-run.
 *
 * Usage:
 *   pnpm --filter @chiselgrid/migration grid:migrate
 *   pnpm --filter @chiselgrid/migration grid:verify
 */

import { query } from './rds-client.js';

const ENABLE_PGVECTOR = `CREATE EXTENSION IF NOT EXISTS vector`;

const CREATE_GRID_DIAGRAMS = `
CREATE TABLE IF NOT EXISTS grid_diagrams (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL,
  title         TEXT NOT NULL DEFAULT 'Untitled Diagram',
  diagram_type  TEXT NOT NULL,
  grid_ir       JSONB NOT NULL,
  version       INTEGER NOT NULL DEFAULT 1,
  parent_id     UUID REFERENCES grid_diagrams(id),
  created_by    TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tags          TEXT[],
  is_template   BOOLEAN NOT NULL DEFAULT FALSE,
  article_id    UUID REFERENCES content(content_id)
)
`;

const CREATE_GRID_EMBEDDINGS = `
CREATE TABLE IF NOT EXISTS grid_embeddings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id  UUID NOT NULL REFERENCES grid_diagrams(id) ON DELETE CASCADE,
  tenant_id   TEXT NOT NULL,
  embedding   vector(1536),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
`;

const INDEXES = [
  `CREATE INDEX IF NOT EXISTS grid_diagrams_tenant_idx  ON grid_diagrams(tenant_id)`,
  `CREATE INDEX IF NOT EXISTS grid_diagrams_article_idx ON grid_diagrams(article_id)`,
];

export async function migrateGridSchema(): Promise<void> {
  console.log('→ enabling pgvector');
  await query(ENABLE_PGVECTOR);

  console.log('→ creating grid_diagrams');
  await query(CREATE_GRID_DIAGRAMS);

  console.log('→ creating grid_embeddings');
  await query(CREATE_GRID_EMBEDDINGS);

  for (const sql of INDEXES) {
    console.log(`→ ${sql.trim().split('\n')[0]}`);
    await query(sql);
  }

  console.log('grid schema migration complete');
}

export async function verifyGridSchema(): Promise<void> {
  const { rows } = await query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_name LIKE 'grid%'
     ORDER BY table_name`,
  );
  const names = rows.map((r) => r['table_name']);
  console.log('grid tables:', names.join(', ') || '(none)');

  const required = ['grid_diagrams', 'grid_embeddings'];
  const missing = required.filter((n) => !names.includes(n));
  if (missing.length) {
    throw new Error(`missing grid tables: ${missing.join(', ')}`);
  }
}

const entry = process.argv[1] ?? '';
if (entry.endsWith('grid-schema.ts') || entry.endsWith('grid-schema.js')) {
  const mode = process.argv[2] ?? 'migrate';
  (async () => {
    if (mode === 'verify') {
      await verifyGridSchema();
    } else {
      await migrateGridSchema();
      await verifyGridSchema();
    }
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
