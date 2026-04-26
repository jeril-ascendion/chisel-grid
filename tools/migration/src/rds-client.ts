/**
 * Thin pg-compatible wrapper around AWS RDS Data API.
 *
 * Rewrites pg-style `$1, $2, ...` placeholders to Data API `:p1, :p2, ...`
 * and infers a parameter type (string, number, boolean, null, UUID, JSON)
 * from the JS value at call time. Returns `{ rows: Record<string, any>[] }`
 * matching the shape pg's `pool.query()` returns.
 *
 * To pass a value as a Postgres UUID or JSONB, wrap it:
 *   rdsTyped('uuid-string', 'UUID')
 *   rdsTyped(obj, 'JSON')   // will JSON.stringify
 */

import {
  RDSDataClient,
  ExecuteStatementCommand,
  type SqlParameter,
  type Field,
} from '@aws-sdk/client-rds-data';

const REGION = process.env['AWS_REGION'] ?? 'ap-southeast-1';
const CLUSTER_ARN =
  process.env['CLUSTER_ARN'] ??
  'arn:aws:rds:ap-southeast-1:852973339602:cluster:chiselgrid-dev-data-auroracluster23d869c0-tcmmbxk2uwgn';
const SECRET_ARN =
  process.env['SECRET_ARN'] ??
  'arn:aws:secretsmanager:ap-southeast-1:852973339602:secret:chiselgrid/ChiselGrid-Dev-Data/aurora-master-credentials-ssmaHC';
const DATABASE = process.env['DATABASE'] ?? 'chiselgrid';

export const client = new RDSDataClient({ region: REGION });

export type TypedValue = { __rds: true; value: unknown; hint: 'UUID' | 'JSON' };

export function rdsTyped(value: unknown, hint: 'UUID' | 'JSON'): TypedValue {
  return { __rds: true, value, hint };
}

function isTyped(v: unknown): v is TypedValue {
  return !!v && typeof v === 'object' && (v as any).__rds === true;
}

function toSqlParameter(name: string, value: unknown): SqlParameter {
  if (value === null || value === undefined) {
    return { name, value: { isNull: true } };
  }
  if (isTyped(value)) {
    if (value.hint === 'UUID') {
      return {
        name,
        value: { stringValue: String(value.value) },
        typeHint: 'UUID',
      };
    }
    if (value.hint === 'JSON') {
      return {
        name,
        value: {
          stringValue:
            typeof value.value === 'string'
              ? value.value
              : JSON.stringify(value.value),
        },
        typeHint: 'JSON',
      };
    }
  }
  if (typeof value === 'boolean') return { name, value: { booleanValue: value } };
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { name, value: { longValue: value } }
      : { name, value: { doubleValue: value } };
  }
  if (value instanceof Date) {
    return {
      name,
      value: { stringValue: value.toISOString().replace('T', ' ').replace('Z', '') },
      typeHint: 'TIMESTAMP',
    };
  }
  return { name, value: { stringValue: String(value) } };
}

function fieldToJs(f: Field): unknown {
  if (f.isNull) return null;
  if (f.stringValue !== undefined) return f.stringValue;
  if (f.longValue !== undefined) return f.longValue;
  if (f.doubleValue !== undefined) return f.doubleValue;
  if (f.booleanValue !== undefined) return f.booleanValue;
  if (f.blobValue !== undefined) return f.blobValue;
  if (f.arrayValue !== undefined) return f.arrayValue;
  return null;
}

/**
 * Execute a SQL statement. Placeholders are `$1, $2, ...` (pg-style).
 * Returns { rows: Record<string, any>[], rowsAffected: number }.
 */
export async function query(
  sql: string,
  params: unknown[] = [],
): Promise<{ rows: Record<string, any>[]; rowsAffected: number }> {
  const rdsSql = sql.replace(/\$(\d+)/g, (_m, n) => `:p${n}`);
  const parameters: SqlParameter[] = params.map((v, i) =>
    toSqlParameter(`p${i + 1}`, v),
  );

  const out = await client.send(
    new ExecuteStatementCommand({
      resourceArn: CLUSTER_ARN,
      secretArn: SECRET_ARN,
      database: DATABASE,
      sql: rdsSql,
      parameters,
      includeResultMetadata: true,
    }),
  );

  const cols =
    out.columnMetadata?.map((c) => c.label ?? c.name ?? '') ?? [];
  const rows: Record<string, any>[] = (out.records ?? []).map((rec) => {
    const obj: Record<string, any> = {};
    rec.forEach((f, i) => {
      obj[cols[i] ?? `col${i}`] = fieldToJs(f);
    });
    return obj;
  });

  return { rows, rowsAffected: out.numberOfRecordsUpdated ?? 0 };
}

export async function ping(): Promise<void> {
  const r = await query('SELECT current_database() as db');
  console.log(`Data API connected to: ${r.rows[0]?.['db']}`);
}
