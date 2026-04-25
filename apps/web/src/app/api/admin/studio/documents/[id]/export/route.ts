import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { auroraConfigured, DEFAULT_TENANT_ID, query } from '@/lib/db/aurora';
import { toDocx, toMarkdown, toPdf, type ExportDocument, type ExportSection } from '@/lib/studio-export';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface DocumentRow {
  id: string;
  title: string;
  category: string | null;
  sections_json: unknown;
}

function parseSections(raw: unknown): ExportSection[] {
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
    const ref = s['ref'] && typeof s['ref'] === 'object' ? (s['ref'] as { type: 'chamber' | 'grid'; id: string; label?: string }) : null;
    return {
      title: typeof s['title'] === 'string' ? (s['title'] as string) : '',
      description: typeof s['description'] === 'string' ? (s['description'] as string) : '',
      source,
      body: typeof s['body'] === 'string' ? (s['body'] as string) : '',
      ref,
    };
  });
}

function safeFilename(title: string): string {
  return title.replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, '') || 'document';
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!auroraConfigured()) {
    return NextResponse.json({ error: 'Aurora not configured' }, { status: 503 });
  }
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const format = (url.searchParams.get('format') ?? 'md').toLowerCase();
  if (!['md', 'docx', 'pdf'].includes(format)) {
    return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
  }

  const tenantId = (session.user as { tenantId?: string }).tenantId ?? DEFAULT_TENANT_ID;
  const { rows } = await query<DocumentRow>(
    `SELECT id, title, category, sections_json
       FROM studio_documents
      WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId],
  );
  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const doc: ExportDocument = {
    title: row.title,
    category: row.category,
    sections: parseSections(row.sections_json),
  };
  const filename = safeFilename(doc.title);

  try {
    if (format === 'md') {
      const md = toMarkdown(doc);
      return new NextResponse(md, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.md"`,
        },
      });
    }
    if (format === 'docx') {
      const buf = await toDocx(doc);
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
      return new NextResponse(ab, {
        status: 200,
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${filename}.docx"`,
        },
      });
    }
    const pdf = await toPdf(doc);
    return new NextResponse(pdf as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}.pdf"`,
      },
    });
  } catch (err) {
    console.error('[api/admin/studio/documents/:id/export] failed:', err);
    return NextResponse.json(
      { error: 'Export failed', detail: (err as Error).message },
      { status: 500 },
    );
  }
}
