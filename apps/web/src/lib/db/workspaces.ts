/**
 * Aurora-backed workspaces repository.
 *
 * tenant_id is stored as TEXT in the workspaces table (DB-01 inconsistency)
 * — we accept it as a string and pass it through unchanged.
 */

import { query, asUuid } from './aurora';

export interface Workspace {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  clientName: string | null;
  projectName: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface Row {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  client_name: string | null;
  project_name: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const SELECT_COLUMNS = `
  id,
  tenant_id,
  name,
  description,
  client_name,
  project_name,
  created_by,
  created_at,
  updated_at
`;

function toIso(value: string): string {
  if (value.includes('T')) return value;
  return new Date(value.replace(' ', 'T') + 'Z').toISOString();
}

function rowToWorkspace(row: Row): Workspace {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description,
    clientName: row.client_name,
    projectName: row.project_name,
    createdBy: row.created_by,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export async function listWorkspacesForOwner(
  tenantId: string,
  createdBy: string,
): Promise<Workspace[]> {
  const { rows } = await query<Row>(
    `SELECT ${SELECT_COLUMNS}
       FROM workspaces
      WHERE tenant_id = $1 AND created_by = $2
      ORDER BY updated_at DESC
      LIMIT 200`,
    [tenantId, createdBy],
  );
  return rows.map(rowToWorkspace);
}

export async function getWorkspace(
  id: string,
  tenantId: string,
  createdBy: string,
): Promise<Workspace | null> {
  const { rows } = await query<Row>(
    `SELECT ${SELECT_COLUMNS}
       FROM workspaces
      WHERE id = $1 AND tenant_id = $2 AND created_by = $3
      LIMIT 1`,
    [asUuid(id), tenantId, createdBy],
  );
  return rows[0] ? rowToWorkspace(rows[0]) : null;
}

export interface CreateWorkspaceInput {
  tenantId: string;
  createdBy: string;
  name: string;
  description?: string | null;
}

export async function createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
  const { rows } = await query<Row>(
    `INSERT INTO workspaces (tenant_id, name, description, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING ${SELECT_COLUMNS}`,
    [input.tenantId, input.name, input.description ?? null, input.createdBy],
  );
  if (!rows[0]) throw new Error('createWorkspace: empty insert response');
  return rowToWorkspace(rows[0]);
}

export interface UpdateWorkspaceInput {
  name?: string;
  description?: string | null;
}

export async function updateWorkspace(
  id: string,
  tenantId: string,
  createdBy: string,
  patch: UpdateWorkspaceInput,
): Promise<Workspace | null> {
  const sets: string[] = [];
  const params: unknown[] = [asUuid(id), tenantId, createdBy];
  if (patch.name !== undefined) {
    params.push(patch.name);
    sets.push(`name = $${params.length}`);
  }
  if (patch.description !== undefined) {
    params.push(patch.description);
    sets.push(`description = $${params.length}`);
  }
  if (sets.length === 0) {
    return getWorkspace(id, tenantId, createdBy);
  }
  sets.push('updated_at = NOW()');
  const { rows } = await query<Row>(
    `UPDATE workspaces
        SET ${sets.join(', ')}
      WHERE id = $1 AND tenant_id = $2 AND created_by = $3
      RETURNING ${SELECT_COLUMNS}`,
    params,
  );
  return rows[0] ? rowToWorkspace(rows[0]) : null;
}

/**
 * If the user has no workspaces, create a default "My Workspace" so
 * Chamber/Grid/Forge always have a parent. Returns the existing-or-created
 * default workspace.
 */
export async function ensureDefaultWorkspace(
  tenantId: string,
  createdBy: string,
): Promise<Workspace> {
  const existing = await listWorkspacesForOwner(tenantId, createdBy);
  if (existing.length > 0) return existing[0]!;
  return createWorkspace({ tenantId, createdBy, name: 'My Workspace' });
}
