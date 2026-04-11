import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';
import {
  listWorkspaces,
  createWorkspace as createWs,
} from '@/lib/studio-store';

const CreateWorkspaceSchema = z.object({
  name: z.string().min(1),
  domain: z.string().optional(),
  jurisdiction_tags: z.array(z.string()).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const tenantId = session.user.tenantId ?? 'default';
  const ws = listWorkspaces(tenantId);
  return NextResponse.json(ws);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = CreateWorkspaceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
  }

  const tenantId = session.user.tenantId ?? 'default';
  const now = new Date().toISOString();
  const ws = createWs({
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    owner_id: session.user.email ?? 'unknown',
    name: parsed.data.name,
    description: '',
    domain: parsed.data.domain ?? '',
    jurisdiction_tags: parsed.data.jurisdiction_tags ?? [],
    created_at: now,
    updated_at: now,
  });

  return NextResponse.json(ws, { status: 201 });
}
