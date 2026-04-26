/**
 * workspaces migration — TASK-P14-01.
 *
 * A Workspace is a user-owned container that organises Chamber/Grid/Forge
 * sessions for a Client + Project. Per LANGUAGE.md, client_name and
 * project_name are auto-detected from session content (not user-entered).
 *
 * tenant_id is TEXT to match the convention adopted by the polymorphic
 * tables (content_relations, studio_*) — repository layer casts on join
 * with the UUID-typed tenant_id columns.
 *
 * Idempotent: safe to re-run.
 *
 * Usage:
 *   pnpm --filter @chiselgrid/migration workspaces:migrate
 *   pnpm --filter @chiselgrid/migration workspaces:verify
 */

import { query } from './rds-client.js';

const CREATE_WORKSPACES = `
CREATE TABLE IF NOT EXISTS workspaces (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  client_name   TEXT,
  project_name  TEXT,
  created_by    TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
`;

const INDEXES = [
  `CREATE INDEX IF NOT EXISTS workspaces_tenant_creator_idx
     ON workspaces(tenant_id, created_by)`,
  `CREATE INDEX IF NOT EXISTS workspaces_tenant_client_idx
     ON workspaces(tenant_id, client_name)`,
];

export async function migrateWorkspacesSchema(): Promise<void> {
  console.log('→ creating workspaces');
  await query(CREATE_WORKSPACES);
  for (const sql of INDEXES) {
    console.log(`→ ${sql.trim().split('\n')[0]}`);
    await query(sql);
  }
  console.log('workspaces migration complete');
}

export async function verifyWorkspacesSchema(): Promise<void> {
  const { rows } = await query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_name='workspaces'`,
  );
  if (rows.length === 0) throw new Error('workspaces table not found');

  const { rows: indexRows } = await query(
    `SELECT indexname FROM pg_indexes
     WHERE schemaname='public' AND tablename='workspaces'
     ORDER BY indexname`,
  );
  const indexNames = indexRows.map((r) => r['indexname'] as string);
  console.log('indexes:', indexNames.join(', '));

  const required = [
    'workspaces_tenant_creator_idx',
    'workspaces_tenant_client_idx',
  ];
  const missing = required.filter((n) => !indexNames.includes(n));
  if (missing.length) throw new Error(`missing indexes: ${missing.join(', ')}`);

  console.log('workspaces schema verified');
}

const entry = process.argv[1] ?? '';
if (
  entry.endsWith('workspaces-schema.ts') ||
  entry.endsWith('workspaces-schema.js')
) {
  const mode = process.argv[2] ?? 'migrate';
  (async () => {
    if (mode === 'verify') {
      await verifyWorkspacesSchema();
    } else {
      await migrateWorkspacesSchema();
      await verifyWorkspacesSchema();
    }
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
