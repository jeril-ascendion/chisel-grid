import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { listBuiltinSkillNames, getBuiltinSkill } from '@chiselgrid/grid-agents';
import { auroraConfigured, DEFAULT_TENANT_ID } from '@/lib/db/aurora';
import {
  listTenantSkills,
  upsertTenantSkill,
} from '@/lib/db/tenant-skills';

export const dynamic = 'force-dynamic';

interface SessionUser {
  email?: string | null;
  tenantId?: string;
}

/**
 * GET /api/admin/skills — list built-in skills + tenant overrides for current tenant.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as SessionUser;
  const tenantId = user.tenantId ?? DEFAULT_TENANT_ID;

  const builtins = listBuiltinSkillNames().map((n) => {
    const s = getBuiltinSkill(n);
    return {
      name: s.name,
      version: s.version,
      description: s.description,
      domain: s.domain,
      source: 'builtin' as const,
      ruleCount: s.rules.length,
    };
  });

  const tenantSkills = auroraConfigured() ? await listTenantSkills(tenantId) : [];

  return NextResponse.json({
    builtins,
    tenant: tenantSkills.map((s) => ({
      id: s.id,
      name: s.name,
      version: s.version,
      description: s.description,
      domain: s.domain,
      enabled: s.enabled,
      content: s.content,
      createdBy: s.createdBy,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })),
  });
}

/**
 * POST /api/admin/skills — create or update a tenant skill.
 * Body: { name: string, content: string (full SKILL.md including frontmatter), enabled?: boolean }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!auroraConfigured()) {
    return NextResponse.json(
      { error: 'Aurora not configured — tenant skills require database access' },
      { status: 503 },
    );
  }

  let body: { name?: string; content?: string; enabled?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = (body.name ?? '').trim();
  const content = (body.content ?? '').trim();
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (!content) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }

  const user = session.user as SessionUser;
  const tenantId = user.tenantId ?? DEFAULT_TENANT_ID;
  const createdBy = user.email ?? 'unknown';

  try {
    const record = await upsertTenantSkill({
      tenantId,
      createdBy,
      name,
      content,
      ...(typeof body.enabled === 'boolean' ? { enabled: body.enabled } : {}),
    });
    return NextResponse.json({
      id: record.id,
      name: record.name,
      version: record.version,
      description: record.description,
      domain: record.domain,
      enabled: record.enabled,
      content: record.content,
      createdBy: record.createdBy,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  } catch (err) {
    console.error('[api/admin/skills] POST failed:', err);
    return NextResponse.json(
      { error: 'Failed to upsert skill', detail: (err as Error).message },
      { status: 500 },
    );
  }
}
