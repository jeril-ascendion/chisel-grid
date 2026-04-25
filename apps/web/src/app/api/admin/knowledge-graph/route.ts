import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { auroraConfigured, DEFAULT_TENANT_ID, query } from '@/lib/db/aurora';

export const dynamic = 'force-dynamic';

interface SessionUser {
  email?: string | null;
  tenantId?: string;
}

const NODE_TYPES = ['article', 'diagram', 'session', 'decision'] as const;
type NodeType = (typeof NODE_TYPES)[number];

const QuerySchema = z.object({
  type: z.enum(NODE_TYPES).optional(),
  category: z.string().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
});

interface GraphNode {
  id: string;
  title: string;
  type: NodeType;
  timesReferenced: number;
  createdAt: string;
}

interface GraphEdge {
  source: string;
  target: string;
  relationType: string;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as SessionUser;
  const role = (session.user as { role?: string }).role;
  if (role !== 'admin' && role !== 'creator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!auroraConfigured()) {
    return NextResponse.json({ nodes: [], edges: [] });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = QuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const tenantId = user.tenantId ?? DEFAULT_TENANT_ID;
  const limit = parsed.data.limit ?? 200;
  const typeFilter = parsed.data.type;
  const categoryFilter = parsed.data.category;

  try {
    const nodes: GraphNode[] = [];

    if (!typeFilter || typeFilter === 'article') {
      const sql = `
        SELECT c.content_id::text                                  AS id,
               c.title                                             AS title,
               c.content_type                                      AS content_type,
               COALESCE(c.times_referenced, 0)                     AS times_referenced,
               to_char(c.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
          FROM content c
          ${categoryFilter ? 'JOIN categories cat ON cat.category_id = c.category_id' : ''}
         WHERE c.tenant_id::text = $1
           ${categoryFilter ? 'AND cat.slug = $2' : ''}
         ORDER BY c.times_referenced DESC, c.created_at DESC
         LIMIT ${categoryFilter ? '$3' : '$2'}
      `;
      const args = categoryFilter ? [tenantId, categoryFilter, limit] : [tenantId, limit];
      const { rows } = await query<{
        id: string;
        title: string;
        content_type: string;
        times_referenced: number;
        created_at: string;
      }>(sql, args);
      for (const r of rows) {
        const t = r.content_type === 'decision' || r.content_type === 'adr' ? 'decision' : 'article';
        if (typeFilter && t !== typeFilter) continue;
        nodes.push({
          id: r.id,
          title: r.title,
          type: t as NodeType,
          timesReferenced: Number(r.times_referenced ?? 0),
          createdAt: r.created_at,
        });
      }
    }

    if (!typeFilter || typeFilter === 'diagram') {
      const { rows } = await query<{
        id: string;
        title: string;
        times_referenced: number;
        created_at: string;
      }>(
        `SELECT id::text                                          AS id,
                title                                             AS title,
                COALESCE(times_referenced, 0)                     AS times_referenced,
                to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
           FROM grid_diagrams
          WHERE tenant_id = $1
          ORDER BY times_referenced DESC, created_at DESC
          LIMIT $2`,
        [tenantId, limit],
      );
      for (const r of rows) {
        nodes.push({
          id: r.id,
          title: r.title,
          type: 'diagram',
          timesReferenced: Number(r.times_referenced ?? 0),
          createdAt: r.created_at,
        });
      }
    }

    if (!typeFilter || typeFilter === 'session') {
      const { rows } = await query<{
        id: string;
        title: string | null;
        created_at: string;
      }>(
        `SELECT session_id::text                                  AS id,
                title                                             AS title,
                to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
           FROM work_sessions
          WHERE tenant_id::text = $1
          ORDER BY updated_at DESC
          LIMIT $2`,
        [tenantId, limit],
      );
      for (const r of rows) {
        nodes.push({
          id: r.id,
          title: r.title ?? 'Untitled session',
          type: 'session',
          timesReferenced: 0,
          createdAt: r.created_at,
        });
      }
    }

    const nodeIds = new Set(nodes.map((n) => n.id));

    let edges: GraphEdge[] = [];
    if (nodes.length > 0) {
      const { rows } = await query<{
        source_id: string;
        target_id: string;
        relation_type: string;
      }>(
        `SELECT source_id::text   AS source_id,
                target_id::text   AS target_id,
                relation_type     AS relation_type
           FROM content_relations
          WHERE tenant_id = $1
          ORDER BY created_at DESC
          LIMIT 5000`,
        [tenantId],
      );
      edges = rows
        .filter((r) => nodeIds.has(r.source_id) && nodeIds.has(r.target_id))
        .map((r) => ({
          source: r.source_id,
          target: r.target_id,
          relationType: r.relation_type,
        }));
    }

    return NextResponse.json({ nodes, edges });
  } catch (err) {
    console.error('[api/admin/knowledge-graph] GET failed:', err);
    return NextResponse.json(
      { error: 'Failed to load graph', detail: (err as Error).message },
      { status: 500 },
    );
  }
}
