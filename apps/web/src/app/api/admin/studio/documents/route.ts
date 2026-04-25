import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { asJson, auroraConfigured, DEFAULT_TENANT_ID, query } from '@/lib/db/aurora';

export const dynamic = 'force-dynamic';

const CreateBody = z.object({
  template_id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
});

interface TemplateRow {
  id: string;
  name: string;
  category: string;
  sections_json: unknown;
}

interface DocumentRow {
  id: string;
  title: string;
  category: string | null;
  template_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function normaliseSections(raw: unknown): Array<{
  title: string;
  description: string;
  source: 'chamber' | 'grid' | 'manual';
  placeholder: string;
  body: string;
  ref?: { type: 'chamber' | 'grid'; id: string; label?: string } | null;
}> {
  let arr: Array<Record<string, unknown>> = [];
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) arr = parsed as Array<Record<string, unknown>>;
    } catch {
      arr = [];
    }
  } else if (Array.isArray(raw)) {
    arr = raw as Array<Record<string, unknown>>;
  }
  return arr.map((s) => {
    const source = s['source'] === 'chamber' || s['source'] === 'grid' ? (s['source'] as 'chamber' | 'grid') : 'manual';
    return {
      title: typeof s['title'] === 'string' ? (s['title'] as string) : '',
      description: typeof s['description'] === 'string' ? (s['description'] as string) : '',
      source,
      placeholder: typeof s['placeholder'] === 'string' ? (s['placeholder'] as string) : '',
      body: typeof s['body'] === 'string' ? (s['body'] as string) : '',
      ref: (s['ref'] && typeof s['ref'] === 'object') ? (s['ref'] as { type: 'chamber' | 'grid'; id: string; label?: string }) : null,
    };
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!auroraConfigured()) {
    return NextResponse.json({ documents: [] });
  }
  const tenantId = (session.user as { tenantId?: string }).tenantId ?? DEFAULT_TENANT_ID;

  try {
    const { rows } = await query<DocumentRow>(
      `SELECT id, title, category, template_id, created_by, created_at, updated_at
         FROM studio_documents
        WHERE tenant_id = $1
        ORDER BY updated_at DESC
        LIMIT 100`,
      [tenantId],
    );
    return NextResponse.json({ documents: rows });
  } catch (err) {
    console.error('[api/admin/studio/documents] GET failed:', err);
    return NextResponse.json(
      { error: 'Failed to load documents', detail: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!auroraConfigured()) {
    return NextResponse.json({ error: 'Aurora not configured' }, { status: 503 });
  }
  const body: unknown = await req.json().catch(() => ({}));
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', detail: parsed.error.issues }, { status: 400 });
  }

  const tenantId = (session.user as { tenantId?: string }).tenantId ?? DEFAULT_TENANT_ID;
  const createdBy = session.user.email ?? 'unknown';

  try {
    const { rows: tplRows } = await query<TemplateRow>(
      `SELECT id, name, category, sections_json
         FROM studio_templates
        WHERE id = $1 AND (tenant_id = $2 OR is_public = TRUE)`,
      [parsed.data.template_id, tenantId],
    );
    const tpl = tplRows[0];
    if (!tpl) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const sections = normaliseSections(tpl.sections_json);
    const title = parsed.data.title?.trim() || `${tpl.name} — ${new Date().toLocaleDateString()}`;

    const { rows: docRows } = await query<{ id: string }>(
      `INSERT INTO studio_documents
         (tenant_id, template_id, title, category, sections_json, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [tenantId, parsed.data.template_id, title, tpl.category, asJson(sections), createdBy],
    );
    const id = docRows[0]?.id;
    if (!id) {
      return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
    }
    return NextResponse.json({ id, title, category: tpl.category }, { status: 201 });
  } catch (err) {
    console.error('[api/admin/studio/documents] POST failed:', err);
    return NextResponse.json(
      { error: 'Failed to create document', detail: (err as Error).message },
      { status: 500 },
    );
  }
}
