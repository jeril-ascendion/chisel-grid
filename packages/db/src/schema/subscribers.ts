import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  pgEnum,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const subscriberStatusEnum = pgEnum('subscriber_status', [
  'active',
  'paused',
  'unsubscribed',
  'bounced',
]);

export const subscriberFrequencyEnum = pgEnum('subscriber_frequency', [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
]);

export const subscribers = pgTable(
  'subscribers',
  {
    subscriberId: uuid('subscriber_id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.userId),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'cascade' }),
    email: varchar('email', { length: 320 }).notNull(),
    categories: jsonb('categories').notNull().default('[]'),
    frequency: subscriberFrequencyEnum('frequency').notNull().default('weekly'),
    status: subscriberStatusEnum('status').notNull().default('active'),
    sesSuppressionReason: varchar('ses_suppression_reason', { length: 255 }),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantIdx: index('idx_subscribers_tenant').on(table.tenantId),
    emailIdx: uniqueIndex('idx_subscribers_email_tenant').on(
      table.tenantId,
      table.email,
    ),
    statusIdx: index('idx_subscribers_status').on(table.tenantId, table.status),
    userIdx: index('idx_subscribers_user').on(table.userId),
  }),
);
