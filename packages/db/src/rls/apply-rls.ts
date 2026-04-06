import { Pool } from 'pg';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyRls() {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const pool = new Pool({ connectionString, max: 1 });

  console.log('Applying Row-Level Security policies...');

  const sqlPath = resolve(__dirname, 'enable-rls.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  await pool.query(sql);

  console.log('RLS policies applied successfully.');
  await pool.end();
}

applyRls().catch((err) => {
  console.error('RLS application failed:', err);
  process.exit(1);
});
