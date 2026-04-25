/**
 * Aurora-backed work_sessions data layer for Grid + Chamber persistence.
 *
 * Uses RDS Data API via ./aurora (not Drizzle) — Next.js Lambda has IAM
 * access to the cluster, not direct VPC connectivity.
 *
 * Visibility model:
 *   private      — owner only
 *   shared_view  — anyone with the link can view (default)
 *   shared_edit  — anyone with the link can view; future: collaborative edit
 */

import { query, asUuid, asJson } from './aurora';

export type SessionKind = 'grid' | 'chamber' | 'studio';
export type SessionVisibility = 'private' | 'shared_view' | 'shared_edit';

export interface WorkSession {
  sessionId: string;
  tenantId: string;
  createdBy: string;
  kind: SessionKind;
  visibility: SessionVisibility;
  title: string | null;
  state: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** Public-facing shape stripped of tenant/owner identifiers. */
export interface PublicSession {
  sessionId: string;
  kind: SessionKind;
  visibility: SessionVisibility;
  title: string | null;
  state: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

type Row = {
  session_id: string;
  tenant_id: string;
  created_by: string;
  kind: SessionKind;
  visibility: SessionVisibility;
  title: string | null;
  state_json: string | null;
  created_at: string;
  updated_at: string;
};

function toIso(value: string): string {
  if (value.includes('T')) return value;
  return new Date(value.replace(' ', 'T') + 'Z').toISOString();
}

function parseState(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function rowToSession(row: Row): WorkSession {
  return {
    sessionId: row.session_id,
    tenantId: row.tenant_id,
    createdBy: row.created_by,
    kind: row.kind,
    visibility: row.visibility,
    title: row.title,
    state: parseState(row.state_json),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export function toPublicSession(row: WorkSession): PublicSession {
  return {
    sessionId: row.sessionId,
    kind: row.kind,
    visibility: row.visibility,
    title: row.title,
    state: row.state,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const SELECT_COLUMNS = `
  session_id,
  tenant_id,
  created_by,
  kind,
  visibility,
  title,
  state::text AS state_json,
  created_at,
  updated_at
`;

export interface UpsertSessionInput {
  sessionId: string;
  tenantId: string;
  createdBy: string;
  kind: SessionKind;
  title?: string | null;
  state: Record<string, unknown>;
  visibility?: SessionVisibility;
}

/**
 * INSERT or UPDATE in one round-trip. Tenant + creator are locked in on
 * insert; subsequent calls only touch state/title/visibility/kind. The
 * conflict guard on `tenant_id` and `created_by` prevents another caller
 * from hijacking a UUID collision.
 */
export async function upsertSession(input: UpsertSessionInput): Promise<WorkSession> {
  const { rows } = await query<Row>(
    `INSERT INTO work_sessions
       (session_id, tenant_id, created_by, kind, title, state, visibility)
     VALUES ($1, $2, $3, $4::session_kind, $5, $6, COALESCE($7::session_visibility, 'shared_view'))
     ON CONFLICT (session_id) DO UPDATE SET
       kind = EXCLUDED.kind,
       title = COALESCE(EXCLUDED.title, work_sessions.title),
       state = EXCLUDED.state,
       visibility = COALESCE(EXCLUDED.visibility, work_sessions.visibility),
       updated_at = now()
     WHERE work_sessions.tenant_id = EXCLUDED.tenant_id
       AND work_sessions.created_by = EXCLUDED.created_by
     RETURNING ${SELECT_COLUMNS}`,
    [
      asUuid(input.sessionId),
      asUuid(input.tenantId),
      asUuid(input.createdBy),
      input.kind,
      input.title ?? null,
      asJson(input.state),
      input.visibility ?? null,
    ],
  );
  if (rows.length === 0) {
    throw new Error('upsertSession: row returned empty (tenant/owner mismatch?)');
  }
  return rowToSession(rows[0]!);
}

/** Owner read — any visibility, but tenant-scoped. */
export async function getOwnSession(
  sessionId: string,
  tenantId: string,
): Promise<WorkSession | null> {
  const { rows } = await query<Row>(
    `SELECT ${SELECT_COLUMNS}
     FROM work_sessions
     WHERE session_id = $1 AND tenant_id = $2
     LIMIT 1`,
    [asUuid(sessionId), asUuid(tenantId)],
  );
  if (rows.length === 0) return null;
  return rowToSession(rows[0]!);
}

/**
 * Public read — no tenant filter. Returns null when private or missing,
 * so callers cannot probe existence of private sessions.
 */
export async function getPublicSession(
  sessionId: string,
): Promise<WorkSession | null> {
  const { rows } = await query<Row>(
    `SELECT ${SELECT_COLUMNS}
     FROM work_sessions
     WHERE session_id = $1 AND visibility <> 'private'
     LIMIT 1`,
    [asUuid(sessionId)],
  );
  if (rows.length === 0) return null;
  return rowToSession(rows[0]!);
}

export interface ListSessionsOptions {
  kind?: SessionKind;
  limit?: number;
  /** Currently only 'updated_at_desc' is supported. */
  sort?: 'updated_at_desc';
}

/**
 * Tenant + owner scoped listing of work sessions, most-recently-updated
 * first. Used by session-restore-on-login: limit=1 returns the user's
 * latest session of the requested kind.
 */
export async function listSessionsForOwner(
  tenantId: string,
  ownerId: string,
  opts: ListSessionsOptions = {},
): Promise<WorkSession[]> {
  const limit = Math.max(1, Math.min(opts.limit ?? 20, 100));
  const params: unknown[] = [asUuid(tenantId), asUuid(ownerId)];
  let kindClause = '';
  if (opts.kind) {
    params.push(opts.kind);
    kindClause = `AND kind = $${params.length}::session_kind`;
  }
  params.push(limit);
  const limitParamIdx = params.length;

  const { rows } = await query<Row>(
    `SELECT ${SELECT_COLUMNS}
     FROM work_sessions
     WHERE tenant_id = $1 AND created_by = $2 ${kindClause}
     ORDER BY updated_at DESC
     LIMIT $${limitParamIdx}`,
    params,
  );
  return rows.map(rowToSession);
}

export async function setVisibility(
  sessionId: string,
  tenantId: string,
  visibility: SessionVisibility,
): Promise<WorkSession | null> {
  const { rows } = await query<Row>(
    `UPDATE work_sessions
     SET visibility = $3::session_visibility, updated_at = now()
     WHERE session_id = $1 AND tenant_id = $2
     RETURNING ${SELECT_COLUMNS}`,
    [asUuid(sessionId), asUuid(tenantId), visibility],
  );
  if (rows.length === 0) return null;
  return rowToSession(rows[0]!);
}
