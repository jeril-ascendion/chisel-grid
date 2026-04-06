import { pgTable, uuid, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const tenantPlanEnum = pgEnum('tenant_plan', [
  'internal',
  'starter',
  'professional',
  'enterprise',
]);

export const tenants = pgTable('tenants', {
  tenantId: uuid('tenant_id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  subdomain: varchar('subdomain', { length: 63 }).notNull().unique(),
  customDomain: varchar('custom_domain', { length: 255 }),
  plan: tenantPlanEnum('plan').notNull().default('internal'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
