import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { architectureAgent } from '@chiselgrid/grid-agents';
import {
  DiagramType,
  validateGridIR,
  type GridIR,
} from '@chiselgrid/grid-ir';
import { asJson, asUuid, auroraConfigured, DEFAULT_TENANT_ID, query } from '@/lib/db/aurora';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const VALID_DIAGRAM_TYPES = new Set<string>(Object.values(DiagramType));

interface SessionUser {
  email?: string | null;
  tenantId?: string;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    prompt?: string;
    diagramType?: string;
    existingIR?: unknown;
    currentDiagramIR?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const prompt = (body.prompt ?? '').trim();
  const diagramType = (body.diagramType ?? '').trim();

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }
  if (!diagramType) {
    return NextResponse.json({ error: 'diagramType is required' }, { status: 400 });
  }
  if (!VALID_DIAGRAM_TYPES.has(diagramType)) {
    return NextResponse.json(
      {
        error: 'Unsupported diagramType',
        supported: Array.from(VALID_DIAGRAM_TYPES),
      },
      { status: 400 },
    );
  }

  let existingIR: GridIR | undefined;
  const existingInput = body.existingIR ?? body.currentDiagramIR;
  if (existingInput !== undefined && existingInput !== null) {
    const existingValidation = validateGridIR(existingInput);
    if (!existingValidation.valid) {
      return NextResponse.json(
        { error: 'existingIR is not valid Grid-IR', details: existingValidation.errors },
        { status: 400 },
      );
    }
    existingIR = existingInput as GridIR;
  }

  let gridIR: GridIR;
  try {
    gridIR = await architectureAgent({
      prompt,
      diagramType,
      ...(existingIR ? { existingIR } : {}),
    });
  } catch (err) {
    console.error('[api/admin/grid/generate] architectureAgent failed:', err);
    return NextResponse.json(
      { error: 'Diagram generation failed', detail: (err as Error).message },
      { status: 502 },
    );
  }

  const validation = validateGridIR(gridIR);
  if (!validation.valid) {
    console.error('[api/admin/grid/generate] invalid Grid-IR:', validation.errors);
    return NextResponse.json(
      { error: 'Agent returned invalid Grid-IR', details: validation.errors },
      { status: 422 },
    );
  }

  const user = session.user as SessionUser;
  const tenantId = user.tenantId ?? DEFAULT_TENANT_ID;
  const createdBy = user.email ?? 'unknown';
  const title = gridIR.title || 'Untitled Diagram';

  let diagramId: string | null = null;
  if (auroraConfigured()) {
    try {
      const { rows } = await query<{ id: string }>(
        `INSERT INTO grid_diagrams (tenant_id, title, diagram_type, grid_ir, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          asUuid(tenantId),
          title,
          diagramType,
          asJson(gridIR),
          createdBy,
        ],
      );
      diagramId = rows[0]?.id ?? null;
    } catch (err) {
      console.error('[api/admin/grid/generate] persist failed:', err);
      return NextResponse.json(
        { error: 'Failed to save diagram', detail: (err as Error).message },
        { status: 500 },
      );
    }
  } else {
    console.warn('[api/admin/grid/generate] Aurora not configured; returning without persisting');
  }

  return NextResponse.json({ gridIR, diagramId });
}
