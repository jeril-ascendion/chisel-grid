import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { asJson, auroraConfigured, DEFAULT_TENANT_ID, query } from '@/lib/db/aurora';

export const dynamic = 'force-dynamic';

const SectionSchema = z.object({
  title: z.string(),
  description: z.string().default(''),
  source: z.enum(['chamber', 'grid', 'manual']).default('manual'),
  placeholder: z.string().default(''),
  body: z.string().default(''),
  ref: z
    .object({
      type: z.enum(['chamber', 'grid']),
      id: z.string(),
      label: z.string().optional(),
    })
    .nullable()
    .optional(),
});

const PatchBody = z.object({
  title: z.string().min(1).max(200).optional(),
  sections: z.array(SectionSchema).optional(),
});

interface DocumentRow {
  id: string;
  tenant_id: string;
  template_id: string | null;
  title: string;
  category: string | null;
  sections_json: unknown;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function parseSections(raw: unknown): unknown[] {
  if (typeof raw === 'string') {
    try {
      const p: unknown = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(raw) ? raw : [];
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!auroraConfigured()) {
    return NextResponse.json({ error: 'Aurora not configured' }, { status: 503 });
  }
  const { id } = await ctx.params;
  const tenantId = (session.user as { tenantId?: string }).tenantId ?? DEFAULT_TENANT_ID;

  try {
    const { rows } = await query<DocumentRow>(
      `SELECT id, tenant_id, template_id, title, category, sections_json, created_by, created_at, updated_at
         FROM studio_documents
        WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );
    const doc = rows[0];
    if (!doc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({
      id: doc.id,
      template_id: doc.template_id,
      title: doc.title,
      category: doc.category,
      sections: parseSections(doc.sections_json),
      created_by: doc.created_by,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    });
  } catch (err) {
    console.error('[api/admin/forge/documents/:id] GET failed:', err);
    return NextResponse.json(
      { error: 'Failed to load document', detail: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!auroraConfigured()) {
    return NextResponse.json({ error: 'Aurora not configured' }, { status: 503 });
  }
  const { id } = await ctx.params;
  const body: unknown = await req.json().catch(() => ({}));
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', detail: parsed.error.issues }, { status: 400 });
  }
  const tenantId = (session.user as { tenantId?: string }).tenantId ?? DEFAULT_TENANT_ID;

  try {
    const updates: string[] = [];
    const params: unknown[] = [];
    let n = 1;
    if (parsed.data.title !== undefined) {
      updates.push(`title = $${n++}`);
      params.push(parsed.data.title);
    }
    if (parsed.data.sections !== undefined) {
      updates.push(`sections_json = $${n++}`);
      params.push(asJson(parsed.data.sections));
    }
    if (updates.length === 0) {
      return NextResponse.json({ ok: true });
    }
    updates.push(`updated_at = NOW()`);
    params.push(id, tenantId);
    const sql = `UPDATE studio_documents SET ${updates.join(', ')}
                 WHERE id = $${n++} AND tenant_id = $${n}`;
    const { rowsAffected } = await query(sql, params);
    if (rowsAffected === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/admin/forge/documents/:id] PATCH failed:', err);
    return NextResponse.json(
      { error: 'Failed to update document', detail: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!auroraConfigured()) {
    return NextResponse.json({ error: 'Aurora not configured' }, { status: 503 });
  }
  const { id } = await ctx.params;
  const tenantId = (session.user as { tenantId?: string }).tenantId ?? DEFAULT_TENANT_ID;
  try {
    await query(`DELETE FROM studio_documents WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/admin/forge/documents/:id] DELETE failed:', err);
    return NextResponse.json(
      { error: 'Failed to delete document', detail: (err as Error).message },
      { status: 500 },
    );
  }
}
