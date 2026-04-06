import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const auditLog = pgTable(
  'audit_log',
  {
    logId: uuid('log_id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.userId),
    action: varchar('action', { length: 128 }).notNull(),
    entityType: varchar('entity_type', { length: 64 }).notNull(),
    entityId: uuid('entity_id'),
    metadata: jsonb('metadata'),
    ipAddress: varchar('ip_address', { length: 45 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantIdx: index('idx_audit_tenant').on(table.tenantId),
    userIdx: index('idx_audit_user').on(table.userId),
    entityIdx: index('idx_audit_entity').on(table.entityType, table.entityId),
    createdIdx: index('idx_audit_created').on(table.createdAt),
  }),
);
