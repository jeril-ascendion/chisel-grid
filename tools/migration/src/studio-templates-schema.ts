/**
 * studio_templates migration — TASK-P09-01.
 *
 * Holds Studio document templates: pre-defined section structures that can be
 * instantiated into a new Studio document and pre-populated from Chamber
 * sessions and Grid diagrams.
 *
 * tenant_id is TEXT for symmetry with the polymorphic content_relations table
 * (EPIC-P07) so templates can participate in the knowledge graph.
 *
 * Idempotent: safe to re-run.
 *
 * Usage:
 *   pnpm --filter @chiselgrid/migration templates:migrate
 *   pnpm --filter @chiselgrid/migration templates:migrate verify
 */

import { query } from './rds-client.js';

const CREATE_STUDIO_TEMPLATES = `
CREATE TABLE IF NOT EXISTS studio_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL CHECK (category IN (
    'solutions_design','rfp_response','architecture_review',
    'incident_report','migration_runbook','api_design',
    'feasibility_study','security_review','data_architecture',
    'engineering_proposal'
  )),
  sections_json   JSONB NOT NULL,
  is_public       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
`;

const INDEXES = [
  `CREATE INDEX IF NOT EXISTS studio_templates_tenant_category_idx
     ON studio_templates(tenant_id, category)`,
  `CREATE INDEX IF NOT EXISTS studio_templates_public_idx
     ON studio_templates(is_public)`,
];

const CREATE_STUDIO_DOCUMENTS = `
CREATE TABLE IF NOT EXISTS studio_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL,
  template_id     UUID REFERENCES studio_templates(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  category        TEXT,
  sections_json   JSONB NOT NULL,
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
`;

const DOCUMENT_INDEXES = [
  `CREATE INDEX IF NOT EXISTS studio_documents_tenant_idx
     ON studio_documents(tenant_id, updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS studio_documents_template_idx
     ON studio_documents(template_id)`,
];

export async function migrateStudioTemplatesSchema(): Promise<void> {
  console.log('→ creating studio_templates');
  await query(CREATE_STUDIO_TEMPLATES);
  for (const sql of INDEXES) {
    console.log(`→ ${sql.trim().split('\n')[0]}`);
    await query(sql);
  }

  console.log('→ creating studio_documents');
  await query(CREATE_STUDIO_DOCUMENTS);
  for (const sql of DOCUMENT_INDEXES) {
    console.log(`→ ${sql.trim().split('\n')[0]}`);
    await query(sql);
  }

  console.log('studio_templates migration complete');
}

export async function verifyStudioTemplatesSchema(): Promise<void> {
  for (const tableName of ['studio_templates', 'studio_documents']) {
    const { rows } = await query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema='public' AND table_name=$1`,
      [tableName],
    );
    if (rows.length === 0) {
      throw new Error(`${tableName} table not found`);
    }
  }

  const { rows: indexRows } = await query(
    `SELECT indexname FROM pg_indexes
     WHERE schemaname='public' AND tablename IN ('studio_templates','studio_documents')
     ORDER BY indexname`,
  );
  const indexNames = indexRows.map((r) => r['indexname'] as string);
  console.log('indexes:', indexNames.join(', '));

  const required = [
    'studio_templates_tenant_category_idx',
    'studio_templates_public_idx',
    'studio_documents_tenant_idx',
    'studio_documents_template_idx',
  ];
  const missing = required.filter((n) => !indexNames.includes(n));
  if (missing.length) {
    throw new Error(`missing indexes: ${missing.join(', ')}`);
  }

  console.log('studio_templates schema verified');
}

const entry = process.argv[1] ?? '';
if (
  entry.endsWith('studio-templates-schema.ts') ||
  entry.endsWith('studio-templates-schema.js')
) {
  const mode = process.argv[2] ?? 'migrate';
  (async () => {
    if (mode === 'verify') {
      await verifyStudioTemplatesSchema();
    } else {
      await migrateStudioTemplatesSchema();
      await verifyStudioTemplatesSchema();
    }
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
