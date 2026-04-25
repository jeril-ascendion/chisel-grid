import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core';

export const contentRelationSourceTypes = [
  'article',
  'diagram',
  'session',
  'decision',
  'template',
] as const;

export const contentRelationTargetTypes = contentRelationSourceTypes;

export const contentRelationTypes = [
  'references',
  'illustrates',
  'created_from',
  'documents',
  'related_to',
  'contradicts',
] as const;

export type ContentRelationSourceType =
  (typeof contentRelationSourceTypes)[number];
export type ContentRelationTargetType =
  (typeof contentRelationTargetTypes)[number];
export type ContentRelationType = (typeof contentRelationTypes)[number];

export const contentRelations = pgTable(
  'content_relations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: text('tenant_id').notNull(),
    sourceId: uuid('source_id').notNull(),
    sourceType: text('source_type')
      .notNull()
      .$type<ContentRelationSourceType>(),
    targetId: uuid('target_id').notNull(),
    targetType: text('target_type')
      .notNull()
      .$type<ContentRelationTargetType>(),
    relationType: text('relation_type')
      .notNull()
      .$type<ContentRelationType>(),
    createdBy: text('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    outboundIdx: index('content_relations_outbound_idx').on(
      table.tenantId,
      table.sourceId,
      table.sourceType,
    ),
    inboundIdx: index('content_relations_inbound_idx').on(
      table.tenantId,
      table.targetId,
      table.targetType,
    ),
    targetCountIdx: index('content_relations_target_count_idx').on(
      table.tenantId,
      table.targetType,
      table.targetId,
    ),
    relationTypeIdx: index('content_relations_relation_type_idx').on(
      table.tenantId,
      table.relationType,
    ),
    uniqEdge: unique('uniq_edge').on(
      table.tenantId,
      table.sourceId,
      table.sourceType,
      table.targetId,
      table.targetType,
      table.relationType,
    ),
  }),
);
