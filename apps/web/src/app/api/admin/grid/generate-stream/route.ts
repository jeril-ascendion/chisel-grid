import { type NextRequest } from 'next/server';
import { auth } from '@/auth';
import {
  architectureAgentStream,
  validateArchitecture,
} from '@chiselgrid/grid-agents';
import {
  DiagramType,
  validateGridIR,
  type GridIR,
} from '@chiselgrid/grid-ir';
import { asJson, asUuid, auroraConfigured, DEFAULT_TENANT_ID, query } from '@/lib/db/aurora';
import { loadEnabledTenantSkills } from '@/lib/db/tenant-skills';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const VALID_DIAGRAM_TYPES = new Set<string>(Object.values(DiagramType));

interface SessionUser {
  email?: string | null;
  tenantId?: string;
}

function jsonLine(obj: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(obj) + '\n');
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: {
    prompt?: string;
    diagramType?: string;
    existingIR?: unknown;
    currentDiagramIR?: unknown;
    mode?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const prompt = (body.prompt ?? '').trim();
  const diagramType = (body.diagramType ?? '').trim();
  const VALID_MODES = new Set(['architecture', 'sketch', 'precise']);
  const mode = VALID_MODES.has(body.mode ?? '') ? (body.mode as string) : 'architecture';

  if (!prompt) {
    return new Response(JSON.stringify({ error: 'Prompt is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!VALID_DIAGRAM_TYPES.has(diagramType)) {
    return new Response(
      JSON.stringify({
        error: 'Unsupported diagramType',
        supported: Array.from(VALID_DIAGRAM_TYPES),
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let existingIR: GridIR | undefined;
  const existingInput = body.existingIR ?? body.currentDiagramIR;
  if (existingInput !== undefined && existingInput !== null) {
    const existingValidation = validateGridIR(existingInput);
    if (!existingValidation.valid) {
      return new Response(
        JSON.stringify({
          error: 'existingIR is not valid Grid-IR',
          details: existingValidation.errors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }
    existingIR = existingInput as GridIR;
  }

  const user = session.user as SessionUser;
  const tenantId = user.tenantId ?? DEFAULT_TENANT_ID;
  const createdBy = user.email ?? 'unknown';

  let tenantSkills: Awaited<ReturnType<typeof loadEnabledTenantSkills>> = [];
  if (auroraConfigured()) {
    try {
      tenantSkills = await loadEnabledTenantSkills(tenantId);
    } catch (err) {
      console.error('[api/admin/grid/generate-stream] tenant skill load failed:', err);
    }
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let finalIR: GridIR | null = null;
      let errored = false;
      try {
        for await (const chunk of architectureAgentStream({
          prompt,
          diagramType,
          ...(existingIR ? { existingIR } : {}),
          ...(tenantSkills.length > 0 ? { tenantSkills } : {}),
        })) {
          if (chunk.event.kind === 'done') {
            finalIR = chunk.event.gridIR;
            // do not emit done yet — wait until persisted + validated
            continue;
          }
          if (chunk.event.kind === 'error') {
            errored = true;
            controller.enqueue(jsonLine(chunk.event));
            controller.close();
            return;
          }
          controller.enqueue(jsonLine(chunk.event));
        }
      } catch (err) {
        errored = true;
        const message = err instanceof Error ? err.message : String(err);
        controller.enqueue(jsonLine({ kind: 'error', error: message }));
        controller.close();
        return;
      }

      if (errored || !finalIR) {
        if (!errored) {
          controller.enqueue(
            jsonLine({ kind: 'error', error: 'Stream ended without a final Grid-IR' }),
          );
        }
        controller.close();
        return;
      }

      const architectureValidation = validateArchitecture(finalIR, diagramType);
      const title = finalIR.title || 'Untitled Diagram';

      let diagramId: string | null = null;
      if (auroraConfigured()) {
        try {
          const { rows } = await query<{ id: string }>(
            `INSERT INTO grid_diagrams (tenant_id, title, diagram_type, grid_ir, created_by, mode)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [
              asUuid(tenantId),
              title,
              diagramType,
              asJson(finalIR),
              createdBy,
              mode,
            ],
          );
          diagramId = rows[0]?.id ?? null;
        } catch (err) {
          console.error('[api/admin/grid/generate-stream] persist failed:', err);
          controller.enqueue(
            jsonLine({
              kind: 'error',
              error: `Failed to save diagram: ${err instanceof Error ? err.message : String(err)}`,
            }),
          );
          controller.close();
          return;
        }
      }

      controller.enqueue(
        jsonLine({
          kind: 'done',
          gridIR: finalIR,
          diagramId,
          validation: {
            score: architectureValidation.score,
            valid: architectureValidation.valid,
            criticalCount: architectureValidation.criticalCount,
            warningCount: architectureValidation.warningCount,
            findings: architectureValidation.findings,
          },
        }),
      );
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache, no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}
