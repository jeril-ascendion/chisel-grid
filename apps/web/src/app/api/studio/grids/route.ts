import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';
import { createGrid as createG, listGrids } from '@/lib/studio-store';

const CreateGridSchema = z.object({
  workspace_id: z.string().min(1),
  name: z.string().min(1),
  client_name: z.string().optional(),
  client_industry: z.string().optional(),
  project_type: z.string().optional(),
  description: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspace_id');
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
  }
  return NextResponse.json(listGrids(workspaceId));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = CreateGridSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
  }

  const tenantId = session.user.tenantId ?? 'default';
  const now = new Date().toISOString();
  const grid = createG({
    id: crypto.randomUUID(),
    workspace_id: parsed.data.workspace_id,
    tenant_id: tenantId,
    name: parsed.data.name,
    client_name: parsed.data.client_name ?? '',
    client_industry: parsed.data.client_industry ?? '',
    project_type: parsed.data.project_type ?? 'greenfield',
    description: parsed.data.description ?? '',
    status: 'active',
    created_by: session.user.email ?? 'unknown',
    created_at: now,
    updated_at: now,
  });

  return NextResponse.json(grid, { status: 201 });
}
