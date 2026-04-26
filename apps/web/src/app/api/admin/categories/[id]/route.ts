import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { query, auroraConfigured, asUuid, DEFAULT_TENANT_ID } from '@/lib/db/aurora';

export const dynamic = 'force-dynamic';

const LEVEL_LABEL: Record<number, string> = {
  1: 'category',
  2: 'sub-category',
  3: 'section',
  4: 'sub-section',
  5: 'aspect',
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { ok: true as const, session };
}

async function rebuildSubtreePaths(rootId: string): Promise<void> {
  await query(
    `WITH RECURSIVE subtree AS (
       SELECT category_id, name, parent_id, full_path
         FROM categories
        WHERE category_id = $1 AND tenant_id = $2
       UNION ALL
       SELECT c.category_id, c.name, c.parent_id,
              s.full_path || ' > ' || c.name
         FROM categories c
         JOIN subtree s ON c.parent_id = s.category_id
        WHERE c.tenant_id = $2
     )
     UPDATE categories c
        SET full_path = s.full_path
       FROM subtree s
      WHERE c.category_id = s.category_id`,
    [asUuid(rootId), asUuid(DEFAULT_TENANT_ID)],
  );
}

/**
 * PATCH /api/admin/categories/[id] — update name / slug / description / sort_order
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAuth();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!auroraConfigured()) {
    return NextResponse.json({ error: 'Aurora not configured' }, { status: 503 });
  }

  let body: { name?: string; slug?: string; description?: string; sort_order?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const sets: string[] = [];
  const values: unknown[] = [];
  const push = (col: string, val: unknown) => {
    values.push(val);
    sets.push(`${col} = $${values.length}`);
  };

  let nameChanged = false;
  if (body.name !== undefined) {
    const n = body.name.trim();
    if (!n) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    push('name', n);
    nameChanged = true;
    if (body.slug === undefined) {
      push('slug', slugify(n));
    }
  }
  if (body.slug !== undefined) {
    const s = slugify(body.slug);
    if (!s) return NextResponse.json({ error: 'Slug cannot be empty' }, { status: 400 });
    push('slug', s);
  }
  if (body.description !== undefined) {
    push('description', body.description.trim() || null);
  }
  if (typeof body.sort_order === 'number') {
    push('sort_order', body.sort_order);
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  values.push(asUuid(id));
  values.push(asUuid(DEFAULT_TENANT_ID));
  const idPos = values.length - 1;
  const tenantPos = values.length;

  try {
    const { rowsAffected } = await query(
      `UPDATE categories SET ${sets.join(', ')}
         WHERE category_id = $${idPos} AND tenant_id = $${tenantPos}`,
      values,
    );
    if (rowsAffected === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    if (nameChanged) {
      await rebuildSubtreePaths(id);
    }

    const { rows } = await query<{
      category_id: string;
      name: string;
      slug: string;
      description: string | null;
      parent_id: string | null;
      sort_order: number | null;
      level: number | null;
      level_label: string | null;
      full_path: string | null;
    }>(
      `SELECT category_id, name, slug, description, parent_id,
              sort_order, level, level_label, full_path
         FROM categories WHERE category_id = $1 AND tenant_id = $2 LIMIT 1`,
      [asUuid(id), asUuid(DEFAULT_TENANT_ID)],
    );
    const r = rows[0];
    if (!r) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    return NextResponse.json({
      id: r.category_id,
      name: r.name,
      slug: r.slug,
      description: r.description ?? '',
      parent_id: r.parent_id,
      sort_order: r.sort_order ?? 0,
      level: r.level ?? 1,
      level_label: r.level_label ?? LEVEL_LABEL[r.level ?? 1] ?? 'category',
      full_path: r.full_path ?? r.name,
    });
  } catch (err) {
    console.error('[api/admin/categories/[id]] PATCH failed:', err);
    return NextResponse.json(
      { error: 'Failed to update category', detail: (err as Error).message },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/categories/[id]
 * Query:
 *   ?force=true  — also remove all descendants
 * Always unlinks articles (sets content.category_id = NULL) that referenced
 * this category or any deleted descendant.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAuth();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const force = new URL(req.url).searchParams.get('force') === 'true';

  if (!auroraConfigured()) {
    return NextResponse.json({ error: 'Aurora not configured' }, { status: 503 });
  }

  try {
    const { rows: idRows } = await query<{ category_id: string }>(
      `WITH RECURSIVE subtree AS (
         SELECT category_id FROM categories
          WHERE category_id = $1 AND tenant_id = $2
         UNION ALL
         SELECT c.category_id FROM categories c
           JOIN subtree s ON c.parent_id = s.category_id
          WHERE c.tenant_id = $2
       )
       SELECT category_id FROM subtree`,
      [asUuid(id), asUuid(DEFAULT_TENANT_ID)],
    );

    if (idRows.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const childCount = idRows.length - 1;
    if (childCount > 0 && !force) {
      const { rows: countRows } = await query<{ cnt: number }>(
        `SELECT COUNT(*)::int AS cnt FROM content
          WHERE tenant_id = $1 AND category_id = ANY($2::uuid[])`,
        [asUuid(DEFAULT_TENANT_ID), `{${idRows.map((r) => r.category_id).join(',')}}`],
      );
      const articlesAffected = Number(countRows[0]?.cnt ?? 0);
      return NextResponse.json(
        {
          requiresConfirmation: true,
          childCount,
          articlesAffected,
          message: `This category has ${childCount} descendant(s) and ${articlesAffected} linked article(s). Re-send with ?force=true to delete.`,
        },
        { status: 409 },
      );
    }

    const idsLiteral = `{${idRows.map((r) => r.category_id).join(',')}}`;

    const { rowsAffected: articlesAffected } = await query(
      `UPDATE content SET category_id = NULL
        WHERE tenant_id = $1 AND category_id = ANY($2::uuid[])`,
      [asUuid(DEFAULT_TENANT_ID), idsLiteral],
    );

    const { rowsAffected: deleted } = await query(
      `DELETE FROM categories
        WHERE tenant_id = $1 AND category_id = ANY($2::uuid[])`,
      [asUuid(DEFAULT_TENANT_ID), idsLiteral],
    );

    return NextResponse.json({
      deleted: true,
      removedCount: deleted,
      articlesAffected,
    });
  } catch (err) {
    console.error('[api/admin/categories/[id]] DELETE failed:', err);
    return NextResponse.json(
      { error: 'Failed to delete category', detail: (err as Error).message },
      { status: 500 },
    );
  }
}
