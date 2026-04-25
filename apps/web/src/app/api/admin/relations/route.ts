import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { auroraConfigured, DEFAULT_TENANT_ID } from '@/lib/db/aurora';
import {
  insertRelation,
  listInbound,
  listOutbound,
} from '@/lib/db/relations';

export const dynamic = 'force-dynamic';

interface SessionUser {
  email?: string | null;
  tenantId?: string;
}

const ENTITY_TYPES = [
  'article',
  'diagram',
  'session',
  'decision',
  'template',
] as const;

const RELATION_TYPES = [
  'references',
  'illustrates',
  'created_from',
  'documents',
  'related_to',
  'contradicts',
] as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuidString = z.string().regex(UUID_RE, 'invalid uuid');

const QuerySchema = z
  .object({
    source_id: uuidString.optional(),
    source_type: z.enum(ENTITY_TYPES).optional(),
    target_id: uuidString.optional(),
    target_type: z.enum(ENTITY_TYPES).optional(),
  })
  .refine(
    (v) =>
      (v.source_id && v.source_type && !v.target_id && !v.target_type) ||
      (v.target_id && v.target_type && !v.source_id && !v.source_type),
    {
      message:
        'must provide exactly one of (source_id+source_type) or (target_id+target_type)',
    },
  );

const PostSchema = z.object({
  sourceId: uuidString,
  sourceType: z.enum(ENTITY_TYPES),
  targetId: uuidString,
  targetType: z.enum(ENTITY_TYPES),
  relationType: z.enum(RELATION_TYPES),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!auroraConfigured()) {
    return NextResponse.json({ relations: [] });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = QuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const tenantId = (session.user as SessionUser).tenantId ?? DEFAULT_TENANT_ID;

  try {
    const relations = parsed.data.source_id
      ? await listOutbound(tenantId, parsed.data.source_id, parsed.data.source_type!)
      : await listInbound(tenantId, parsed.data.target_id!, parsed.data.target_type!);
    return NextResponse.json({ relations });
  } catch (err) {
    console.error('[api/admin/relations] GET failed:', err);
    return NextResponse.json(
      { error: 'Failed to load relations', detail: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!auroraConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = PostSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const user = session.user as SessionUser;
  const tenantId = user.tenantId ?? DEFAULT_TENANT_ID;
  const createdBy = user.email ?? 'unknown';

  try {
    const id = await insertRelation({
      tenantId,
      ...parsed.data,
      createdBy,
    });
    if (id === null) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    const message = (err as Error).message;
    if (message === 'self_link_not_allowed') {
      return NextResponse.json(
        { error: 'Cannot link an item to itself' },
        { status: 400 },
      );
    }
    console.error('[api/admin/relations] POST failed:', err);
    return NextResponse.json(
      { error: 'Failed to create relation', detail: message },
      { status: 500 },
    );
  }
}
