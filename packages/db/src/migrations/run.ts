import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface JournalEntry { idx: number; tag: string; when: number; version: string; breakpoints: boolean }

interface Backend {
  ensureTracking(): Promise<void>;
  appliedHashes(): Promise<Set<string>>;
  appliedTimestamps(): Promise<Set<number>>;
  contentTableExists(): Promise<boolean>;
  exec(stmt: string): Promise<void>;
  execTx(stmts: string[]): Promise<void>;
  recordApplied(hash: string, when: number): Promise<void>;
  close(): Promise<void>;
  label: string;
}

async function pgBackend(connectionString: string): Promise<Backend> {
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString, max: 1 });
  return {
    label: 'pg',
    async ensureTracking() {
      await pool.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
      await pool.query(`CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )`);
    },
    async appliedHashes() {
      const { rows } = await pool.query<{ hash: string }>(`SELECT hash FROM drizzle.__drizzle_migrations`);
      return new Set(rows.map((r) => r.hash));
    },
    async appliedTimestamps() {
      const { rows } = await pool.query<{ created_at: string | number | null }>(`SELECT created_at FROM drizzle.__drizzle_migrations`);
      return new Set(rows.map((r) => Number(r.created_at)).filter((n) => Number.isFinite(n)));
    },
    async contentTableExists() {
      const { rows } = await pool.query<{ exists: boolean }>(
        `SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='content') AS exists`,
      );
      return rows[0]?.exists === true;
    },
    async exec(stmt) { await pool.query(stmt); },
    async execTx(stmts) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const s of stmts) await client.query(s);
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    },
    async recordApplied(hash, when) {
      await pool.query(
        `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
        [hash, when],
      );
    },
    async close() { await pool.end(); },
  };
}

async function dataApiBackend(): Promise<Backend> {
  const { RDSDataClient, ExecuteStatementCommand } = await import('@aws-sdk/client-rds-data');
  type SqlParameter = import('@aws-sdk/client-rds-data').SqlParameter;
  const region = process.env['AWS_REGION'] ?? 'ap-southeast-1';
  const resourceArn = process.env['AURORA_CLUSTER_ARN'] ?? '';
  const secretArn = process.env['AURORA_SECRET_ARN'] ?? '';
  const database = process.env['AURORA_DATABASE'] ?? process.env['DB_NAME'] ?? 'chiselgrid';
  if (!resourceArn || !secretArn) {
    throw new Error('AURORA_CLUSTER_ARN and AURORA_SECRET_ARN are required for Data API mode');
  }
  const client = new RDSDataClient({ region });
  const run = async (sql: string, parameters: SqlParameter[] = []) => {
    return client.send(new ExecuteStatementCommand({
      resourceArn, secretArn, database, sql, parameters, includeResultMetadata: true,
    }));
  };
  return {
    label: 'data-api',
    async ensureTracking() {
      await run(`CREATE SCHEMA IF NOT EXISTS drizzle`);
      await run(`CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )`);
    },
    async appliedHashes() {
      const out = await run(`SELECT hash FROM drizzle.__drizzle_migrations`);
      const set = new Set<string>();
      for (const rec of out.records ?? []) {
        const h = rec[0]?.stringValue;
        if (h) set.add(h);
      }
      return set;
    },
    async appliedTimestamps() {
      const out = await run(`SELECT created_at FROM drizzle.__drizzle_migrations`);
      const set = new Set<number>();
      for (const rec of out.records ?? []) {
        const v = rec[0]?.longValue ?? Number(rec[0]?.stringValue ?? NaN);
        if (Number.isFinite(v)) set.add(Number(v));
      }
      return set;
    },
    async contentTableExists() {
      const out = await run(
        `SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='content') AS exists`,
      );
      const v = out.records?.[0]?.[0];
      return v?.booleanValue === true || v?.stringValue === 't';
    },
    async exec(stmt) { await run(stmt); },
    async execTx(stmts) {
      // Data API: each ExecuteStatement is its own implicit txn. For migration
      // 0002 (single UPDATE) this is fine. For multi-statement non-tx files,
      // callers route to exec().
      for (const s of stmts) await run(s);
    },
    async recordApplied(hash, when) {
      await run(
        `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (:hash, :ts)`,
        [
          { name: 'hash', value: { stringValue: hash } } as SqlParameter,
          { name: 'ts', value: { longValue: when } } as SqlParameter,
        ],
      );
    },
    async close() { /* no-op */ },
  };
}

async function pickBackend(): Promise<Backend> {
  const url = process.env['DATABASE_URL'];
  if (url) return pgBackend(url);
  return dataApiBackend();
}

function splitStatements(sql: string): string[] {
  return sql
    .split('--> statement-breakpoint')
    .map((s) => s.replace(/^\s*--\s*@no-transaction\s*\n?/m, '').trim())
    .filter((s) => s.length > 0);
}

function isNoTransaction(sql: string): boolean {
  const firstLines = sql.split('\n').slice(0, 3).join('\n');
  return /^\s*--\s*@no-transaction\b/m.test(firstLines);
}

async function runMigrations() {
  const journal = JSON.parse(
    readFileSync(resolve(__dirname, 'meta/_journal.json'), 'utf-8'),
  ) as { entries: JournalEntry[] };

  const backend = await pickBackend();
  console.log(`[migrate] backend=${backend.label}`);

  try {
    await backend.ensureTracking();
    let hashes = await backend.appliedHashes();
    let timestamps = await backend.appliedTimestamps();

    // Bootstrap: if tracking table is empty but the schema is already
    // present (drizzle-kit applied 0000/0001 previously, or DB seeded
    // directly), mark all pre-existing migrations as applied so we don't
    // try to replay them.
    if (hashes.size === 0 && await backend.contentTableExists()) {
      const bootstrapped: string[] = [];
      for (const entry of journal.entries) {
        const sqlPath = resolve(__dirname, `${entry.tag}.sql`);
        const sql = readFileSync(sqlPath, 'utf-8');
        // Treat as already-applied any migration whose primary effect
        // already exists. For 0002 we always run it (idempotent UPDATE);
        // 0003/0004 are safe to run even if values exist (IF NOT EXISTS).
        // 0000/0001 are only adopted when content table exists.
        if (entry.idx === 0 || entry.idx === 1) {
          const hash = createHash('sha256').update(sql).digest('hex');
          await backend.recordApplied(hash, entry.when);
          bootstrapped.push(entry.tag);
        }
      }
      if (bootstrapped.length > 0) {
        console.log(`[bootstrap] adopted existing migrations: ${bootstrapped.join(', ')}`);
        hashes = await backend.appliedHashes();
        timestamps = await backend.appliedTimestamps();
      }
    }

    let applied = 0;
    for (const entry of journal.entries) {
      const sqlPath = resolve(__dirname, `${entry.tag}.sql`);
      const sql = readFileSync(sqlPath, 'utf-8');
      const hash = createHash('sha256').update(sql).digest('hex');
      if (hashes.has(hash) || timestamps.has(entry.when)) {
        console.log(`[skip] ${entry.tag}`);
        continue;
      }
      const statements = splitStatements(sql);
      const noTx = isNoTransaction(sql);
      console.log(`[apply] ${entry.tag} (${statements.length} stmts${noTx ? ', no-tx' : ''})`);
      if (noTx) {
        for (const stmt of statements) await backend.exec(stmt);
      } else {
        await backend.execTx(statements);
      }
      await backend.recordApplied(hash, entry.when);
      applied += 1;
    }
    console.log(`[done] ${applied} migration(s) applied.`);
  } finally {
    await backend.close();
  }
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
