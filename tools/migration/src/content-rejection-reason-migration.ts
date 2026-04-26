/**
 * content.rejection_reason migration — TASK-P12-05.
 *
 * Adds rejection_reason TEXT to the content table so admins can record
 * why a submission was rejected; the creator sees the reason in the
 * editor when they pick the article back up.
 *
 * Idempotent: safe to re-run.
 *
 * Usage:
 *   pnpm --filter @chiselgrid/migration content-rejection:migrate
 *   pnpm --filter @chiselgrid/migration content-rejection:verify
 */

import { query } from './rds-client.js';

const ADD_COLUMN = `
ALTER TABLE content
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT
`;

export async function migrateRejectionReason(): Promise<void> {
  console.log('→ ALTER content ADD COLUMN rejection_reason TEXT');
  await query(ADD_COLUMN);
  console.log('rejection-reason migration complete');
}

export async function verifyRejectionReason(): Promise<void> {
  const { rows } = await query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='content'
        AND column_name='rejection_reason'`,
  );
  if (rows.length === 0) {
    throw new Error('content.rejection_reason column not found');
  }
  console.log('rejection-reason schema verified');
}

const entry = process.argv[1] ?? '';
if (
  entry.endsWith('content-rejection-reason-migration.ts') ||
  entry.endsWith('content-rejection-reason-migration.js')
) {
  const mode = process.argv[2] ?? 'migrate';
  (async () => {
    if (mode === 'verify') {
      await verifyRejectionReason();
    } else {
      await migrateRejectionReason();
      await verifyRejectionReason();
    }
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
