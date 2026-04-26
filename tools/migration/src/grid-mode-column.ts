/**
 * EPIC-P05 — Three-Mode Grid migration.
 *
 * Adds:
 *   - grid_diagrams.mode column: 'architecture' | 'sketch' | 'precise'
 *     (defaults to 'architecture' so existing rows backfill implicitly)
 *   - grid_training_data table: rows that the Approve / Approve-for-Delivery
 *     buttons write to. Only architecture and precise modes ever insert here;
 *     sketches are explicitly excluded (informal, not for training corpus).
 *
 * Idempotent: safe to re-run.
 *
 * Usage:
 *   pnpm --filter @chiselgrid/migration grid:add-mode
 */

import { query } from './rds-client.js';

const ADD_MODE_COLUMN = `
ALTER TABLE grid_diagrams
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'architecture'
`;

const ADD_MODE_CONSTRAINT = `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'grid_diagrams_mode_chk'
  ) THEN
    ALTER TABLE grid_diagrams
      ADD CONSTRAINT grid_diagrams_mode_chk
      CHECK (mode IN ('architecture', 'sketch', 'precise'));
  END IF;
END $$;
`;

const CREATE_GRID_TRAINING_DATA = `
CREATE TABLE IF NOT EXISTS grid_training_data (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id   UUID NOT NULL REFERENCES grid_diagrams(id) ON DELETE CASCADE,
  tenant_id    TEXT NOT NULL,
  mode         TEXT NOT NULL CHECK (mode IN ('architecture', 'precise')),
  approved_by  TEXT NOT NULL,
  approved_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes        TEXT
)
`;

const INDEXES = [
  `CREATE INDEX IF NOT EXISTS grid_diagrams_mode_idx ON grid_diagrams(mode)`,
  `CREATE INDEX IF NOT EXISTS grid_training_data_diagram_idx ON grid_training_data(diagram_id)`,
  `CREATE INDEX IF NOT EXISTS grid_training_data_tenant_idx ON grid_training_data(tenant_id)`,
];

export async function migrateGridMode(): Promise<void> {
  console.log('→ adding grid_diagrams.mode column');
  await query(ADD_MODE_COLUMN);

  console.log('→ adding grid_diagrams.mode CHECK constraint');
  await query(ADD_MODE_CONSTRAINT);

  console.log('→ creating grid_training_data');
  await query(CREATE_GRID_TRAINING_DATA);

  for (const sql of INDEXES) {
    console.log(`→ ${sql.trim().split('\n')[0]}`);
    await query(sql);
  }

  console.log('grid mode migration complete');
}

const entry = process.argv[1] ?? '';
if (entry.endsWith('grid-mode-column.ts') || entry.endsWith('grid-mode-column.js')) {
  migrateGridMode().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
