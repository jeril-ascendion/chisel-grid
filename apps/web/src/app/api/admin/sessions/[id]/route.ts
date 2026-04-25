import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { auroraConfigured, DEFAULT_TENANT_ID } from '@/lib/db/aurora';
import {
  getOwnSession,
  setVisibility,
  upsertSession,
  type SessionVisibility,
} from '@/lib/db/sessions';

export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const STATE_BYTE_LIMIT = 1_000_000;

const PutBodySchema = z.object({
  kind: z.enum(['grid', 'chamber', 'studio']),
  title: z.string().max(500).nullable().optional(),
  state: z.record(z.unknown()).default({}),
  visibility: z.enum(['private', 'shared_view', 'shared_edit']).optional(),
});

interface SessionUser {
  id?: string;
  email?: string | null;
  tenantId?: string;
}

async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { ok: true as const, session };
}

function badRequest(error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status: 400 });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAuth();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!UUID_RE.test(id)) return badRequest('Invalid session id');

  if (!auroraConfigured()) {
    return NextResponse.json(
      { error: 'Aurora not configured' },
      { status: 503 },
    );
  }

  const user = guard.session.user as SessionUser;
  const tenantId = user.tenantId ?? DEFAULT_TENANT_ID;

  try {
    const row = await getOwnSession(id, tenantId);
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (err) {
    console.error('[api/admin/sessions/[id]] GET failed:', err);
    return NextResponse.json(
      { error: 'Failed to load session', detail: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAuth();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!UUID_RE.test(id)) return badRequest('Invalid session id');

  if (!auroraConfigured()) {
    return NextResponse.json(
      { error: 'Aurora not configured' },
      { status: 503 },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const parsed = PutBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const stateBytes = JSON.stringify(body.state).length;
  if (stateBytes > STATE_BYTE_LIMIT) {
    return NextResponse.json(
      { error: 'Session state too large', limitBytes: STATE_BYTE_LIMIT, sizeBytes: stateBytes },
      { status: 413 },
    );
  }

  const user = guard.session.user as SessionUser;
  const tenantId = user.tenantId ?? DEFAULT_TENANT_ID;
  const createdBy = user.id;
  if (!createdBy || !UUID_RE.test(createdBy)) {
    return NextResponse.json(
      { error: 'No user id on session' },
      { status: 401 },
    );
  }

  try {
    const row = await upsertSession({
      sessionId: id,
      tenantId,
      createdBy,
      kind: body.kind,
      title: body.title ?? null,
      state: body.state,
      ...(body.visibility ? { visibility: body.visibility } : {}),
    });
    return NextResponse.json(row);
  } catch (err) {
    console.error('[api/admin/sessions/[id]] PUT failed:', err);
    return NextResponse.json(
      { error: 'Failed to save session', detail: (err as Error).message },
      { status: 500 },
    );
  }
}

const PatchBodySchema = z.object({
  visibility: z.enum(['private', 'shared_view', 'shared_edit']),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAuth();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!UUID_RE.test(id)) return badRequest('Invalid session id');

  if (!auroraConfigured()) {
    return NextResponse.json(
      { error: 'Aurora not configured' },
      { status: 503 },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }
  const parsed = PatchBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const user = guard.session.user as SessionUser;
  const tenantId = user.tenantId ?? DEFAULT_TENANT_ID;

  try {
    const row = await setVisibility(id, tenantId, parsed.data.visibility as SessionVisibility);
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (err) {
    console.error('[api/admin/sessions/[id]] PATCH failed:', err);
    return NextResponse.json(
      { error: 'Failed to update visibility', detail: (err as Error).message },
      { status: 500 },
    );
  }
}
