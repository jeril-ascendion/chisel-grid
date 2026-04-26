import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  pgEnum,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const sessionKindEnum = pgEnum('session_kind', [
  'grid',
  'chamber',
  'studio',
]);

export const sessionVisibilityEnum = pgEnum('session_visibility', [
  'private',
  'shared_view',
  'shared_edit',
]);

export const workSessions = pgTable(
  'work_sessions',
  {
    sessionId: uuid('session_id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'cascade' }),
    createdBy: uuid('created_by').notNull(),
    workspaceId: uuid('workspace_id'),
    kind: sessionKindEnum('kind').notNull(),
    visibility: sessionVisibilityEnum('visibility')
      .notNull()
      .default('shared_view'),
    title: varchar('title', { length: 500 }),
    state: jsonb('state').notNull().default('{}'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantUpdatedIdx: index('idx_work_sessions_tenant_updated').on(
      table.tenantId,
      table.createdBy,
      table.updatedAt,
    ),
    visibilityIdx: index('idx_work_sessions_visibility').on(table.visibility),
    workspaceIdx: index('work_sessions_workspace_idx').on(table.workspaceId),
  }),
);
