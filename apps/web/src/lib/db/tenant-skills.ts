import { parseSkill, type SkillFile } from '@chiselgrid/grid-agents';
import { asUuid, auroraConfigured, query } from '@/lib/db/aurora';

interface TenantSkillRow {
  id: string;
  tenant_id: string;
  name: string;
  version: string | null;
  description: string | null;
  domain: string | null;
  content: string;
  enabled: boolean | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TenantSkillRecord {
  id: string;
  name: string;
  version: string;
  description: string;
  domain: string;
  enabled: boolean;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

function rowToRecord(r: TenantSkillRow): TenantSkillRecord {
  return {
    id: r.id,
    name: r.name,
    version: r.version ?? '1.0.0',
    description: r.description ?? '',
    domain: r.domain ?? 'general',
    enabled: r.enabled ?? true,
    content: r.content,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listTenantSkills(tenantId: string): Promise<TenantSkillRecord[]> {
  if (!auroraConfigured()) return [];
  try {
    const { rows } = await query<TenantSkillRow>(
      `SELECT id, tenant_id, name, version, description, domain, content,
              enabled, created_by, created_at, updated_at
         FROM tenant_skills
        WHERE tenant_id = $1
        ORDER BY name`,
      [asUuid(tenantId)],
    );
    return rows.map(rowToRecord);
  } catch (err) {
    const message = (err as Error).message;
    if (/relation .*tenant_skills.* does not exist/i.test(message)) {
      return [];
    }
    throw err;
  }
}

export async function loadEnabledTenantSkills(tenantId: string): Promise<SkillFile[]> {
  const records = await listTenantSkills(tenantId);
  const skills: SkillFile[] = [];
  for (const r of records) {
    if (!r.enabled) continue;
    try {
      const skill = parseSkill(r.content, { source: 'tenant', fallbackName: r.name });
      skills.push(skill);
    } catch (err) {
      console.error(`[tenant-skills] failed to parse ${r.name}:`, err);
    }
  }
  return skills;
}

export interface UpsertTenantSkillInput {
  tenantId: string;
  createdBy: string;
  name: string;
  content: string;
  enabled?: boolean;
}

export async function upsertTenantSkill(
  input: UpsertTenantSkillInput,
): Promise<TenantSkillRecord> {
  const parsed = parseSkill(input.content, { source: 'tenant', fallbackName: input.name });
  const enabled = input.enabled ?? true;

  const { rows } = await query<TenantSkillRow>(
    `INSERT INTO tenant_skills (
       tenant_id, name, version, description, domain, content, enabled, created_by
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8
     )
     ON CONFLICT (tenant_id, name) DO UPDATE SET
       version     = EXCLUDED.version,
       description = EXCLUDED.description,
       domain      = EXCLUDED.domain,
       content     = EXCLUDED.content,
       enabled     = EXCLUDED.enabled,
       updated_at  = NOW()
     RETURNING id, tenant_id, name, version, description, domain, content,
               enabled, created_by, created_at, updated_at`,
    [
      asUuid(input.tenantId),
      input.name,
      parsed.version,
      parsed.description,
      parsed.domain,
      input.content,
      enabled,
      input.createdBy,
    ],
  );
  const r = rows[0];
  if (!r) throw new Error('upsertTenantSkill: insert returned no rows');
  return rowToRecord(r);
}
