/**
 * work_sessions.workspace_id migration — TASK-P14-02.
 *
 * Adds workspace_id (UUID, nullable) to work_sessions referencing
 * workspaces(id). ON DELETE SET NULL so deleting a workspace orphans
 * its sessions instead of cascading them away.
 *
 * Nullable because pre-P14 sessions exist without a workspace, and
 * tests + the public-share path don't require one.
 *
 * Idempotent: safe to re-run.
 *
 * Usage:
 *   pnpm --filter @chiselgrid/migration sessions-workspace:migrate
 *   pnpm --filter @chiselgrid/migration sessions-workspace:verify
 */

import { query } from './rds-client.js';

const ADD_COLUMN = `
ALTER TABLE work_sessions
  ADD COLUMN IF NOT EXISTS workspace_id UUID
  REFERENCES workspaces(id) ON DELETE SET NULL
`;

const ADD_INDEX = `
CREATE INDEX IF NOT EXISTS work_sessions_workspace_idx
  ON work_sessions(workspace_id)
`;

export async function migrateSessionWorkspace(): Promise<void> {
  console.log('→ ALTER work_sessions ADD COLUMN workspace_id');
  await query(ADD_COLUMN);
  console.log('→ CREATE INDEX work_sessions_workspace_idx');
  await query(ADD_INDEX);
  console.log('session-workspace migration complete');
}

export async function verifySessionWorkspace(): Promise<void> {
  const { rows } = await query(
    `SELECT column_name, data_type
       FROM information_schema.columns
      WHERE table_schema='public'
        AND table_name='work_sessions'
        AND column_name='workspace_id'`,
  );
  if (rows.length === 0) {
    throw new Error('work_sessions.workspace_id column not found');
  }
  console.log('column:', rows[0]);

  const { rows: idxRows } = await query(
    `SELECT indexname FROM pg_indexes
      WHERE schemaname='public' AND tablename='work_sessions'
        AND indexname='work_sessions_workspace_idx'`,
  );
  if (idxRows.length === 0) {
    throw new Error('work_sessions_workspace_idx not found');
  }
  console.log('session-workspace schema verified');
}

const entry = process.argv[1] ?? '';
if (
  entry.endsWith('session-workspace-migration.ts') ||
  entry.endsWith('session-workspace-migration.js')
) {
  const mode = process.argv[2] ?? 'migrate';
  (async () => {
    if (mode === 'verify') {
      await verifySessionWorkspace();
    } else {
      await migrateSessionWorkspace();
      await verifySessionWorkspace();
    }
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
