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

export interface RelationRow {
  id: string;
  tenantId: string;
  sourceId: string;
  sourceType: string;
  targetId: string;
  targetType: string;
  relationType: string;
  createdAt: string;
  title: string | null;
}

export async function listOutbound(
  tenantId: string,
  sourceId: string,
  sourceType: string,
): Promise<RelationRow[]> {
  return listRelations(tenantId, {
    side: 'source',
    id: sourceId,
    type: sourceType,
  });
}

export async function listInbound(
  tenantId: string,
  targetId: string,
  targetType: string,
): Promise<RelationRow[]> {
  return listRelations(tenantId, {
    side: 'target',
    id: targetId,
    type: targetType,
  });
}

async function listRelations(
  tenantId: string,
  filter: { side: 'source' | 'target'; id: string; type: string },
): Promise<RelationRow[]> {
  const idCol = filter.side === 'source' ? 'r.source_id' : 'r.target_id';
  const typeCol = filter.side === 'source' ? 'r.source_type' : 'r.target_type';
  const sql = `
    SELECT r.id::text                        AS id,
           r.tenant_id                       AS tenant_id,
           r.source_id::text                 AS source_id,
           r.source_type                     AS source_type,
           r.target_id::text                 AS target_id,
           r.target_type                     AS target_type,
           r.relation_type                   AS relation_type,
           to_char(r.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
           COALESCE(c.title, g.title)        AS title
      FROM content_relations r
      LEFT JOIN content       c
        ON c.content_id = (CASE WHEN ${
          filter.side === 'source' ? 'r.target_type' : 'r.source_type'
        } = 'article'
                                  THEN ${
                                    filter.side === 'source' ? 'r.target_id' : 'r.source_id'
                                  }
                                ELSE NULL END)
       AND c.tenant_id::text = r.tenant_id
      LEFT JOIN grid_diagrams g
        ON g.id = (CASE WHEN ${
          filter.side === 'source' ? 'r.target_type' : 'r.source_type'
        } = 'diagram'
                          THEN ${
                            filter.side === 'source' ? 'r.target_id' : 'r.source_id'
                          }
                        ELSE NULL END)
       AND g.tenant_id = r.tenant_id
     WHERE r.tenant_id = $1
       AND ${idCol} = $2
       AND ${typeCol} = $3
     ORDER BY r.created_at DESC
     LIMIT 200
  `;
  const { rows } = await query<{
    id: string;
    tenant_id: string;
    source_id: string;
    source_type: string;
    target_id: string;
    target_type: string;
    relation_type: string;
    created_at: string;
    title: string | null;
  }>(sql, [tenantId, asUuid(filter.id), filter.type]);

  return rows.map((r) => ({
    id: r.id,
    tenantId: r.tenant_id,
    sourceId: r.source_id,
    sourceType: r.source_type,
    targetId: r.target_id,
    targetType: r.target_type,
    relationType: r.relation_type,
    createdAt: r.created_at,
    title: r.title,
  }));
}

/**
 * Delete an edge by id and decrement the target's counter.
 * Returns the deleted row's target info, or null if no row matched.
 */
export async function deleteRelation(
  tenantId: string,
  id: string,
): Promise<{ targetId: string; targetType: string } | null> {
  const { rows } = await query<{ target_id: string; target_type: string }>(
    `DELETE FROM content_relations
      WHERE tenant_id = $1 AND id = $2
      RETURNING target_id::text AS target_id, target_type`,
    [tenantId, asUuid(id)],
  );
  const row = rows[0];
  if (!row) return null;

  if (row.target_type === 'article') {
    await query(
      `UPDATE content
          SET times_referenced = GREATEST(times_referenced - 1, 0)
        WHERE content_id = $1
          AND tenant_id::text = $2`,
      [asUuid(row.target_id), tenantId],
    );
  } else if (row.target_type === 'diagram') {
    await query(
      `UPDATE grid_diagrams
          SET times_referenced = GREATEST(times_referenced - 1, 0)
        WHERE id = $1
          AND tenant_id = $2`,
      [asUuid(row.target_id), tenantId],
    );
  }

  return { targetId: row.target_id, targetType: row.target_type };
}

export interface SearchResult {
  id: string;
  type: 'article' | 'diagram';
  title: string;
}

export async function searchLinkable(
  tenantId: string,
  q: string,
  limit = 20,
): Promise<SearchResult[]> {
  const term = `%${q.replace(/[%_]/g, '\\$&')}%`;
  const { rows } = await query<{ id: string; type: string; title: string }>(
    `SELECT * FROM (
       SELECT content_id::text AS id, 'article' AS type, title
         FROM content
        WHERE tenant_id::text = $1 AND title ILIKE $2
        ORDER BY updated_at DESC
        LIMIT $3
     ) a
     UNION ALL
     SELECT * FROM (
       SELECT id::text AS id, 'diagram' AS type, title
         FROM grid_diagrams
        WHERE tenant_id = $1 AND title ILIKE $2
        ORDER BY updated_at DESC
        LIMIT $3
     ) d`,
    [tenantId, term, limit],
  );
  return rows.map((r) => ({
    id: r.id,
    type: r.type as 'article' | 'diagram',
    title: r.title,
  }));
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
