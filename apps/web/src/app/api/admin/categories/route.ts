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

interface CategoryRow {
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number | null;
  level: number | null;
  level_label: string | null;
  full_path: string | null;
  article_count: number | null;
}

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  description: string;
  parent_id: string | null;
  sort_order: number;
  level: number;
  level_label: string;
  full_path: string;
  article_count: number;
  children: CategoryNode[];
}

function buildTree(rows: CategoryRow[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();
  for (const r of rows) {
    byId.set(r.category_id, {
      id: r.category_id,
      name: r.name,
      slug: r.slug,
      description: r.description ?? '',
      parent_id: r.parent_id,
      sort_order: r.sort_order ?? 0,
      level: r.level ?? 1,
      level_label: r.level_label ?? LEVEL_LABEL[r.level ?? 1] ?? 'category',
      full_path: r.full_path ?? r.name,
      article_count: Number(r.article_count ?? 0),
      children: [],
    });
  }
  const roots: CategoryNode[] = [];
  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortNodes = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(roots);
  return roots;
}

/**
 * GET /api/admin/categories — full category tree (nested)
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!auroraConfigured()) {
    return NextResponse.json([]);
  }

  try {
    const { rows } = await query<CategoryRow>(
      `SELECT c.category_id, c.name, c.slug, c.description, c.parent_id,
              c.sort_order, c.level, c.level_label, c.full_path,
              COALESCE(ac.cnt, 0) AS article_count
         FROM categories c
         LEFT JOIN (
           SELECT category_id, COUNT(*)::int AS cnt
             FROM content
            WHERE tenant_id = $1 AND category_id IS NOT NULL
            GROUP BY category_id
         ) ac ON ac.category_id = c.category_id
        WHERE c.tenant_id = $1
        ORDER BY c.level, c.sort_order, c.name`,
      [asUuid(DEFAULT_TENANT_ID)],
    );
    return NextResponse.json(buildTree(rows));
  } catch (err) {
    console.error('[api/admin/categories] GET failed:', err);
    return NextResponse.json(
      { error: 'Failed to load categories', detail: (err as Error).message },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/categories — create a new category at any level
 * Body: { name, parentId?, description?, sort_order? }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { name?: string; parentId?: string | null; description?: string; sort_order?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = (body.name ?? '').trim();
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const parentId = body.parentId ?? null;
  let parentLevel = 0;
  let parentPath = '';
  if (parentId) {
    const { rows: pRows } = await query<{ level: number; full_path: string | null; name: string }>(
      `SELECT level, full_path, name FROM categories
        WHERE category_id = $1 AND tenant_id = $2 LIMIT 1`,
      [asUuid(parentId), asUuid(DEFAULT_TENANT_ID)],
    );
    if (!pRows[0]) {
      return NextResponse.json({ error: 'Parent category not found' }, { status: 404 });
    }
    parentLevel = pRows[0].level ?? 1;
    parentPath = pRows[0].full_path ?? pRows[0].name;
  }

  const level = parentLevel + 1;
  if (level > 5) {
    return NextResponse.json(
      { error: 'Maximum depth is 5 levels (aspect). Cannot add a child to an aspect.' },
      { status: 400 },
    );
  }
  const levelLabel = LEVEL_LABEL[level] ?? 'category';
  const slug = slugify(name);
  const fullPath = parentPath ? `${parentPath} > ${name}` : name;
  const sortOrder = typeof body.sort_order === 'number' ? body.sort_order : 0;
  const description = (body.description ?? '').trim() || null;

  try {
    const { rows } = await query<CategoryRow>(
      `INSERT INTO categories (
         category_id, tenant_id, name, slug, description, parent_id,
         sort_order, level, level_label, full_path, created_at
       ) VALUES (
         gen_random_uuid(), $1, $2, $3, $4, $5,
         $6, $7, $8, $9, NOW()
       )
       RETURNING category_id, name, slug, description, parent_id, sort_order, level, level_label, full_path`,
      [
        asUuid(DEFAULT_TENANT_ID),
        name,
        slug,
        description,
        parentId ? asUuid(parentId) : null,
        sortOrder,
        level,
        levelLabel,
        fullPath,
      ],
    );
    const r = rows[0];
    if (!r) {
      return NextResponse.json({ error: 'Insert returned no rows' }, { status: 500 });
    }
    return NextResponse.json({
      id: r.category_id,
      name: r.name,
      slug: r.slug,
      description: r.description ?? '',
      parent_id: r.parent_id,
      sort_order: r.sort_order ?? 0,
      level: r.level ?? level,
      level_label: r.level_label ?? levelLabel,
      full_path: r.full_path ?? fullPath,
      article_count: 0,
      children: [],
    });
  } catch (err) {
    console.error('[api/admin/categories] POST failed:', err);
    return NextResponse.json(
      { error: 'Failed to create category', detail: (err as Error).message },
      { status: 500 },
    );
  }
}
