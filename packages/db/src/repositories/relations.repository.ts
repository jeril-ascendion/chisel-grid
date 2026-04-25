import { and, eq, sql } from 'drizzle-orm';
import type { Db } from '../client';
import { content } from '../schema/content';
import {
  contentRelations,
  type ContentRelationSourceType,
  type ContentRelationTargetType,
  type ContentRelationType,
} from '../schema/content-relations';

export interface InsertRelationInput {
  tenantId: string;
  sourceId: string;
  sourceType: ContentRelationSourceType;
  targetId: string;
  targetType: ContentRelationTargetType;
  relationType: ContentRelationType;
  createdBy?: string;
}

export interface RelationWithTitle {
  id: string;
  tenantId: string;
  sourceId: string;
  sourceType: ContentRelationSourceType;
  targetId: string;
  targetType: ContentRelationTargetType;
  relationType: ContentRelationType;
  createdAt: Date;
  title: string | null;
}

const COUNTABLE_TYPES = new Set<ContentRelationTargetType>([
  'article',
  'diagram',
]);

export class RelationsRepository {
  constructor(private readonly db: Db) {}

  async insertRelation(input: InsertRelationInput) {
    if (input.sourceId === input.targetId && input.sourceType === input.targetType) {
      throw new Error('self_link_not_allowed');
    }

    return this.db.transaction(async (tx) => {
      await assertTargetExists(tx, input.tenantId, input.targetType, input.targetId);

      const [row] = await tx
        .insert(contentRelations)
        .values({
          tenantId: input.tenantId,
          sourceId: input.sourceId,
          sourceType: input.sourceType,
          targetId: input.targetId,
          targetType: input.targetType,
          relationType: input.relationType,
          createdBy: input.createdBy ?? null,
        })
        .onConflictDoNothing({ target: [
          contentRelations.tenantId,
          contentRelations.sourceId,
          contentRelations.sourceType,
          contentRelations.targetId,
          contentRelations.targetType,
          contentRelations.relationType,
        ] })
        .returning();

      if (!row) {
        return null;
      }

      await bumpCounter(tx, input.tenantId, input.targetType, input.targetId, +1);
      return row;
    });
  }

  async getRelations(
    tenantId: string,
    sourceId: string,
    sourceType: ContentRelationSourceType,
  ): Promise<RelationWithTitle[]> {
    const rows = await this.db
      .select({
        id: contentRelations.id,
        tenantId: contentRelations.tenantId,
        sourceId: contentRelations.sourceId,
        sourceType: contentRelations.sourceType,
        targetId: contentRelations.targetId,
        targetType: contentRelations.targetType,
        relationType: contentRelations.relationType,
        createdAt: contentRelations.createdAt,
      })
      .from(contentRelations)
      .where(
        and(
          eq(contentRelations.tenantId, tenantId),
          eq(contentRelations.sourceId, sourceId),
          eq(contentRelations.sourceType, sourceType),
        ),
      );

    return enrichWithTitles(this.db, rows, 'target');
  }

  async getBacklinks(
    tenantId: string,
    targetId: string,
    targetType: ContentRelationTargetType,
  ): Promise<RelationWithTitle[]> {
    const rows = await this.db
      .select({
        id: contentRelations.id,
        tenantId: contentRelations.tenantId,
        sourceId: contentRelations.sourceId,
        sourceType: contentRelations.sourceType,
        targetId: contentRelations.targetId,
        targetType: contentRelations.targetType,
        relationType: contentRelations.relationType,
        createdAt: contentRelations.createdAt,
      })
      .from(contentRelations)
      .where(
        and(
          eq(contentRelations.tenantId, tenantId),
          eq(contentRelations.targetId, targetId),
          eq(contentRelations.targetType, targetType),
        ),
      );

    return enrichWithTitles(this.db, rows, 'source');
  }

  async deleteRelation(tenantId: string, id: string) {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .delete(contentRelations)
        .where(
          and(
            eq(contentRelations.tenantId, tenantId),
            eq(contentRelations.id, id),
          ),
        )
        .returning();

      if (!row) return null;

      await bumpCounter(tx, tenantId, row.targetType, row.targetId, -1);
      return row;
    });
  }
}

async function assertTargetExists(
  tx: Db,
  tenantId: string,
  targetType: ContentRelationTargetType,
  targetId: string,
): Promise<void> {
  if (targetType === 'article') {
    const result = await tx.execute(sql`
      SELECT 1 FROM content
      WHERE content_id = ${targetId}::uuid
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
    if (result.rows.length === 0) {
      throw new Error('target_not_found');
    }
    return;
  }
  if (targetType === 'diagram') {
    const result = await tx.execute(sql`
      SELECT 1 FROM grid_diagrams
      WHERE id = ${targetId}::uuid
        AND tenant_id = ${tenantId}
      LIMIT 1
    `);
    if (result.rows.length === 0) {
      throw new Error('target_not_found');
    }
    return;
  }
  // session/decision/template tables don't exist yet — skip existence check
}

async function bumpCounter(
  tx: Db,
  tenantId: string,
  targetType: ContentRelationTargetType,
  targetId: string,
  delta: number,
): Promise<void> {
  if (!COUNTABLE_TYPES.has(targetType)) return;

  if (targetType === 'article') {
    if (delta > 0) {
      await tx
        .update(content)
        .set({ timesReferenced: sql`${content.timesReferenced} + ${delta}` })
        .where(
          and(
            eq(content.contentId, targetId),
            sql`${content.tenantId}::text = ${tenantId}`,
          ),
        );
    } else {
      await tx.execute(sql`
        UPDATE content
        SET times_referenced = GREATEST(times_referenced + ${delta}, 0)
        WHERE content_id = ${targetId}::uuid
          AND tenant_id::text = ${tenantId}
      `);
    }
    return;
  }

  if (targetType === 'diagram') {
    if (delta > 0) {
      await tx.execute(sql`
        UPDATE grid_diagrams
        SET times_referenced = times_referenced + ${delta}
        WHERE id = ${targetId}::uuid
          AND tenant_id = ${tenantId}
      `);
    } else {
      await tx.execute(sql`
        UPDATE grid_diagrams
        SET times_referenced = GREATEST(times_referenced + ${delta}, 0)
        WHERE id = ${targetId}::uuid
          AND tenant_id = ${tenantId}
      `);
    }
  }
}

async function enrichWithTitles(
  db: Db,
  rows: Array<{
    id: string;
    tenantId: string;
    sourceId: string;
    sourceType: ContentRelationSourceType;
    targetId: string;
    targetType: ContentRelationTargetType;
    relationType: ContentRelationType;
    createdAt: Date;
  }>,
  side: 'source' | 'target',
): Promise<RelationWithTitle[]> {
  if (rows.length === 0) return [];

  const articleIds = new Set<string>();
  const diagramIds = new Set<string>();

  for (const r of rows) {
    const id = side === 'source' ? r.sourceId : r.targetId;
    const type = side === 'source' ? r.sourceType : r.targetType;
    if (type === 'article') articleIds.add(id);
    else if (type === 'diagram') diagramIds.add(id);
  }

  const titleMap = new Map<string, string>();

  if (articleIds.size > 0) {
    const ids = Array.from(articleIds);
    const result = await db.execute(sql`
      SELECT content_id::text AS id, title
      FROM content
      WHERE content_id = ANY(${ids}::uuid[])
    `);
    for (const r of result.rows as Array<{ id: string; title: string }>) {
      titleMap.set(`article:${r.id}`, r.title);
    }
  }

  if (diagramIds.size > 0) {
    const ids = Array.from(diagramIds);
    const result = await db.execute(sql`
      SELECT id::text AS id, title
      FROM grid_diagrams
      WHERE id = ANY(${ids}::uuid[])
    `);
    for (const r of result.rows as Array<{ id: string; title: string }>) {
      titleMap.set(`diagram:${r.id}`, r.title);
    }
  }

  return rows.map((r) => {
    const id = side === 'source' ? r.sourceId : r.targetId;
    const type = side === 'source' ? r.sourceType : r.targetType;
    return {
      ...r,
      title: titleMap.get(`${type}:${id}`) ?? null,
    };
  });
}
