import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { content } from './content';

export const aiJobStatusEnum = pgEnum('ai_job_status', [
  'pending',
  'running',
  'completed',
  'failed',
]);

export const aiJobTypeEnum = pgEnum('ai_job_type', [
  'writer',
  'reviewer',
  'diagram',
  'seo',
  'audio',
]);

export const aiJobs = pgTable(
  'ai_jobs',
  {
    jobId: uuid('job_id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'cascade' }),
    contentId: uuid('content_id').references(() => content.contentId),
    jobType: aiJobTypeEnum('job_type').notNull(),
    status: aiJobStatusEnum('status').notNull().default('pending'),
    inputTokens: integer('input_tokens').default(0),
    outputTokens: integer('output_tokens').default(0),
    modelId: varchar('model_id', { length: 128 }),
    result: jsonb('result'),
    errorMessage: varchar('error_message', { length: 2048 }),
    stepFunctionArn: varchar('step_function_arn', { length: 256 }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantIdx: index('idx_ai_jobs_tenant').on(table.tenantId),
    contentIdx: index('idx_ai_jobs_content').on(table.contentId),
    statusIdx: index('idx_ai_jobs_status').on(table.status),
  }),
);
