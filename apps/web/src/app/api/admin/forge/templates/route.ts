import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { auroraConfigured, DEFAULT_TENANT_ID, query } from '@/lib/db/aurora';

export const dynamic = 'force-dynamic';

interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  category: string;
  sections_json: unknown;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
}

interface SectionRaw {
  title?: unknown;
  description?: unknown;
  source?: unknown;
  placeholder?: unknown;
}

function parseSections(raw: unknown): Array<{ title: string; description: string; source: 'chamber' | 'grid' | 'manual'; placeholder: string }> {
  let arr: SectionRaw[] = [];
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) arr = parsed as SectionRaw[];
    } catch {
      arr = [];
    }
  } else if (Array.isArray(raw)) {
    arr = raw as SectionRaw[];
  }
  return arr.map((s) => {
    const source = s.source === 'chamber' || s.source === 'grid' ? s.source : 'manual';
    return {
      title: typeof s.title === 'string' ? s.title : '',
      description: typeof s.description === 'string' ? s.description : '',
      source,
      placeholder: typeof s.placeholder === 'string' ? s.placeholder : '',
    };
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!auroraConfigured()) {
    return NextResponse.json({ templates: [] });
  }

  const tenantId = (session.user as { tenantId?: string }).tenantId ?? DEFAULT_TENANT_ID;

  try {
    const { rows } = await query<TemplateRow>(
      `SELECT id, name, description, category, sections_json, is_public, created_by, created_at
         FROM studio_templates
        WHERE tenant_id = $1 OR is_public = TRUE
        ORDER BY category, name`,
      [tenantId],
    );

    return NextResponse.json({
      templates: rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        category: r.category,
        sections: parseSections(r.sections_json),
        is_public: r.is_public,
        created_by: r.created_by,
        created_at: r.created_at,
      })),
    });
  } catch (err) {
    console.error('[api/admin/forge/templates] GET failed:', err);
    return NextResponse.json(
      { error: 'Failed to load templates', detail: (err as Error).message },
      { status: 500 },
    );
  }
}
