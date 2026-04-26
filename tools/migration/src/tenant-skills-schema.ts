/**
 * Tenant skills migration — EPIC-P02 / TASK-P02-04.
 *
 * Stores tenant-specific SKILL.md content in Aurora so the Architecture Agent
 * can merge custom rules over the built-in skill catalogue at generation time.
 * Idempotent: safe to re-run.
 *
 * Usage:
 *   pnpm --filter @chiselgrid/migration ts-node src/tenant-skills-schema.ts
 *   pnpm --filter @chiselgrid/migration ts-node src/tenant-skills-schema.ts verify
 */

import { query } from './rds-client.js';

const CREATE_TENANT_SKILLS = `
CREATE TABLE IF NOT EXISTS tenant_skills (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL,
  name         TEXT NOT NULL,
  version      TEXT NOT NULL DEFAULT '1.0.0',
  description  TEXT NOT NULL DEFAULT '',
  domain       TEXT NOT NULL DEFAULT 'general',
  content      TEXT NOT NULL,
  enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  created_by   TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
)
`;

const INDEXES = [
  `CREATE INDEX IF NOT EXISTS tenant_skills_tenant_idx ON tenant_skills(tenant_id)`,
  `CREATE INDEX IF NOT EXISTS tenant_skills_enabled_idx ON tenant_skills(tenant_id, enabled)`,
];

export async function migrateTenantSkills(): Promise<void> {
  console.log('→ creating tenant_skills');
  await query(CREATE_TENANT_SKILLS);
  for (const sql of INDEXES) {
    console.log(`→ ${sql.trim().split('\n')[0]}`);
    await query(sql);
  }
  console.log('tenant_skills migration complete');
}

export async function verifyTenantSkills(): Promise<void> {
  const { rows } = await query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_name = 'tenant_skills'`,
  );
  if (!rows.length) {
    throw new Error('tenant_skills table missing');
  }
  console.log('tenant_skills present');
}

const entry = process.argv[1] ?? '';
if (entry.endsWith('tenant-skills-schema.ts') || entry.endsWith('tenant-skills-schema.js')) {
  const mode = process.argv[2] ?? 'migrate';
  (async () => {
    if (mode === 'verify') {
      await verifyTenantSkills();
    } else {
      await migrateTenantSkills();
      await verifyTenantSkills();
    }
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
