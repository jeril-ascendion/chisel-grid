import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  pgEnum,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const userRoleEnum = pgEnum('user_role', [
  'admin',
  'creator',
  'reader',
]);

export const users = pgTable(
  'users',
  {
    userId: uuid('user_id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    role: userRoleEnum('role').notNull().default('reader'),
    cognitoSub: varchar('cognito_sub', { length: 128 }).notNull().unique(),
    avatarUrl: varchar('avatar_url', { length: 2048 }),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantIdx: index('idx_users_tenant_id').on(table.tenantId),
    emailIdx: index('idx_users_email').on(table.email),
    cognitoSubIdx: index('idx_users_cognito_sub').on(table.cognitoSub),
  }),
);
