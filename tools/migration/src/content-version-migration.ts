/**
 * content versioning migration — TASK-P12-04.
 *
 * Adds version + version_notes to content. version follows the
 * "v{major}.{minor}.{patch}" format documented in LANGUAGE.md
 * (article naming convention <article_name>-v0.0.0).
 *
 * Existing rows backfill to 'v0.0.1'. version_notes is nullable.
 *
 * Idempotent: safe to re-run.
 *
 * Usage:
 *   pnpm --filter @chiselgrid/migration content-version:migrate
 *   pnpm --filter @chiselgrid/migration content-version:verify
 */

import { query } from './rds-client.js';

const ADD_VERSION = `
ALTER TABLE content
  ADD COLUMN IF NOT EXISTS version TEXT NOT NULL DEFAULT 'v0.0.1'
`;

const ADD_NOTES = `
ALTER TABLE content
  ADD COLUMN IF NOT EXISTS version_notes TEXT
`;

export async function migrateContentVersion(): Promise<void> {
  console.log('→ ALTER content ADD COLUMN version TEXT DEFAULT v0.0.1');
  await query(ADD_VERSION);
  console.log('→ ALTER content ADD COLUMN version_notes TEXT');
  await query(ADD_NOTES);
  console.log('content-version migration complete');
}

export async function verifyContentVersion(): Promise<void> {
  const { rows } = await query(
    `SELECT column_name, data_type, column_default
       FROM information_schema.columns
      WHERE table_schema='public' AND table_name='content'
        AND column_name IN ('version','version_notes')
      ORDER BY column_name`,
  );
  if (rows.length < 2) {
    throw new Error(`expected 2 columns, got ${rows.length}`);
  }
  console.log('columns:', rows);
  console.log('content-version schema verified');
}

const entry = process.argv[1] ?? '';
if (
  entry.endsWith('content-version-migration.ts') ||
  entry.endsWith('content-version-migration.js')
) {
  const mode = process.argv[2] ?? 'migrate';
  (async () => {
    if (mode === 'verify') {
      await verifyContentVersion();
    } else {
      await migrateContentVersion();
      await verifyContentVersion();
    }
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
