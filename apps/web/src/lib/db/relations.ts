/**
 * Route-layer helpers for content_relations writes/reads.
 *
 * apps/web routes use the Aurora Data API (`query()`) directly rather
 * than Drizzle, so this duplicates the smallest slice of
 * @chiselgrid/db RelationsRepository needed by the EPIC-P07 wiring.
 *
 * tenant_id is TEXT in content_relations to coexist with content (UUID)
 * and grid_diagrams (TEXT). Pass the tenantId as a plain string here.
 */

import { asUuid, query } from './aurora';

const COUNTABLE_TARGET_TYPES = new Set(['article', 'diagram']);

export interface InsertRelationParams {
  tenantId: string;
  sourceId: string;
  sourceType: 'article' | 'diagram' | 'session' | 'decision' | 'template';
  targetId: string;
  targetType: 'article' | 'diagram' | 'session' | 'decision' | 'template';
  relationType:
    | 'references'
    | 'illustrates'
    | 'created_from'
    | 'documents'
    | 'related_to'
    | 'contradicts';
  createdBy?: string;
}

/**
 * Insert an edge + bump the target's times_referenced counter.
 *
 * Returns the new edge id, or null if the edge already existed
 * (UNIQUE conflict). Counter is only bumped on a fresh insert.
 *
 * Best-effort: callers in the diagram-save / approve paths should NOT
 * fail the user-facing operation if the relation insert fails — log
 * and continue.
 */
export async function insertRelation(
  params: InsertRelationParams,
): Promise<string | null> {
  if (
    params.sourceId === params.targetId &&
    params.sourceType === params.targetType
  ) {
    throw new Error('self_link_not_allowed');
  }

  const { rows } = await query<{ id: string }>(
    `INSERT INTO content_relations
       (tenant_id, source_id, source_type, target_id, target_type, relation_type, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (tenant_id, source_id, source_type, target_id, target_type, relation_type)
       DO NOTHING
     RETURNING id`,
    [
      params.tenantId,
      asUuid(params.sourceId),
      params.sourceType,
      asUuid(params.targetId),
      params.targetType,
      params.relationType,
      params.createdBy ?? null,
    ],
  );

  const newId = rows[0]?.id ?? null;
  if (!newId) return null;

  if (COUNTABLE_TARGET_TYPES.has(params.targetType)) {
    if (params.targetType === 'article') {
      await query(
        `UPDATE content
            SET times_referenced = times_referenced + 1
          WHERE content_id = $1
            AND tenant_id::text = $2`,
        [asUuid(params.targetId), params.tenantId],
      );
    } else {
      await query(
        `UPDATE grid_diagrams
            SET times_referenced = times_referenced + 1
          WHERE id = $1
            AND tenant_id = $2`,
        [asUuid(params.targetId), params.tenantId],
      );
    }
  }

  return newId;
}

export interface SourceSessionRow {
  sessionId: string;
  title: string | null;
  updatedAt: string;
  createdBy: string | null;
}

/**
 * Lookup the source session for a diagram via content_relations.
 * Returns null if the diagram has no `(session → created_from → diagram)` edge.
 */
export async function getSourceSessionForDiagram(
  tenantId: string,
  diagramId: string,
): Promise<SourceSessionRow | null> {
  const { rows } = await query<{
    session_id: string;
    title: string | null;
    updated_at: string;
    created_by: string | null;
  }>(
    `SELECT s.session_id::text AS session_id,
            s.title,
            to_char(s.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at,
            s.created_by::text AS created_by
       FROM content_relations r
       JOIN work_sessions s
         ON s.session_id   = r.source_id
        AND s.tenant_id::text = r.tenant_id
      WHERE r.tenant_id     = $1
        AND r.target_id     = $2
        AND r.target_type   = 'diagram'
        AND r.source_type   = 'session'
        AND r.relation_type = 'created_from'
      ORDER BY r.created_at ASC
      LIMIT 1`,
    [tenantId, asUuid(diagramId)],
  );

  const row = rows[0];
  if (!row) return null;
  return {
    sessionId: row.session_id,
    title: row.title,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  };
}
