/**
 * Minimal Aurora RDS Data API client for the Next.js Lambda.
 *
 * Avoids the pg driver and direct VPC connections — uses the IAM-authed
 * Data API endpoint so the Lambda only needs RDS and Secrets Manager
 * permissions (wired in infra/lib/stacks/web.stack.ts).
 *
 * Placeholders use pg-style $1, $2, ... and get rewritten to :p1, :p2, ...
 */

import {
  RDSDataClient,
  ExecuteStatementCommand,
  type SqlParameter,
  type Field,
} from '@aws-sdk/client-rds-data';

const REGION = process.env['AWS_REGION'] ?? 'ap-southeast-1';
const CLUSTER_ARN = process.env['AURORA_CLUSTER_ARN'] ?? process.env['CLUSTER_ARN'] ?? '';
const SECRET_ARN = process.env['AURORA_SECRET_ARN'] ?? process.env['DB_SECRET_ARN'] ?? '';
const DATABASE = process.env['AURORA_DATABASE'] ?? process.env['DB_NAME'] ?? 'chiselgrid';

export const DEFAULT_TENANT_ID =
  process.env['DEFAULT_TENANT_ID'] ?? '7d4e7c4f-4ded-4859-8db2-c7b5e2438f8c';

let client: RDSDataClient | null = null;

function getClient(): RDSDataClient {
  if (!client) client = new RDSDataClient({ region: REGION });
  return client;
}

export function auroraConfigured(): boolean {
  return !!(CLUSTER_ARN && SECRET_ARN);
}

export type TypedValue = { __rds: true; value: unknown; hint: 'UUID' | 'JSON' };

export function asUuid(value: string): TypedValue {
  return { __rds: true, value, hint: 'UUID' };
}

export function asJson(value: unknown): TypedValue {
  return { __rds: true, value, hint: 'JSON' };
}

function isTyped(v: unknown): v is TypedValue {
  return !!v && typeof v === 'object' && (v as { __rds?: unknown }).__rds === true;
}

function toSqlParameter(name: string, value: unknown): SqlParameter {
  if (value === null || value === undefined) return { name, value: { isNull: true } };
  if (isTyped(value)) {
    if (value.hint === 'UUID') {
      return { name, value: { stringValue: String(value.value) }, typeHint: 'UUID' };
    }
    return {
      name,
      value: {
        stringValue:
          typeof value.value === 'string' ? value.value : JSON.stringify(value.value),
      },
      typeHint: 'JSON',
    };
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

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<{ rows: T[]; rowsAffected: number }> {
  if (!auroraConfigured()) {
    throw new Error('Aurora not configured (AURORA_CLUSTER_ARN / AURORA_SECRET_ARN missing)');
  }
  const rdsSql = sql.replace(/\$(\d+)/g, (_m, n) => `:p${n}`);
  const parameters: SqlParameter[] = params.map((v, i) => toSqlParameter(`p${i + 1}`, v));

  const out = await getClient().send(
    new ExecuteStatementCommand({
      resourceArn: CLUSTER_ARN,
      secretArn: SECRET_ARN,
      database: DATABASE,
      sql: rdsSql,
      parameters,
      includeResultMetadata: true,
    }),
  );

  const cols = out.columnMetadata?.map((c) => c.label ?? c.name ?? '') ?? [];
  const rows = (out.records ?? []).map((rec) => {
    const obj: Record<string, unknown> = {};
    rec.forEach((f, i) => {
      obj[cols[i] ?? `col${i}`] = fieldToJs(f);
    });
    return obj as T;
  });

  return { rows, rowsAffected: out.numberOfRecordsUpdated ?? 0 };
}
