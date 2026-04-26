import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  pgEnum,
  integer,
  jsonb,
  text,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const contentTypeEnum = pgEnum('content_type', [
  'article',
  'adr',
  'diagram',
  'decision',
  'runbook',
  'template',
  'post_mortem',
]);

export const contentStatusEnum = pgEnum('content_status', [
  'draft',
  'submitted',
  'in_review',
  'approved',
  'published',
  'archived',
  'deprecated',
  'rejected',
]);

export const content = pgTable(
  'content',
  {
    contentId: uuid('content_id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.userId),
    title: varchar('title', { length: 500 }).notNull(),
    slug: varchar('slug', { length: 500 }).notNull(),
    description: text('description'),
    contentType: contentTypeEnum('content_type')
      .notNull()
      .default('article'),
    status: contentStatusEnum('status').notNull().default('draft'),
    blocks: jsonb('blocks').notNull().default('[]'),
    heroImageUrl: varchar('hero_image_url', { length: 2048 }),
    audioUrl: varchar('audio_url', { length: 2048 }),
    readTimeMinutes: integer('read_time_minutes'),
    seoMetaTitle: varchar('seo_meta_title', { length: 200 }),
    seoMetaDescription: varchar('seo_meta_description', { length: 500 }),
    seoOgImageUrl: varchar('seo_og_image_url', { length: 2048 }),
    categoryId: uuid('category_id'),
    currentRevision: integer('current_revision').notNull().default(1),
    timesReferenced: integer('times_referenced').notNull().default(0),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantIdx: index('idx_content_tenant_id').on(table.tenantId),
    slugIdx: index('idx_content_slug').on(table.tenantId, table.slug),
    statusIdx: index('idx_content_status').on(table.tenantId, table.status),
    authorIdx: index('idx_content_author').on(table.authorId),
    categoryIdx: index('idx_content_category').on(table.categoryId),
    publishedAtIdx: index('idx_content_published_at').on(table.publishedAt),
    timesReferencedIdx: index('idx_content_times_referenced').on(
      table.tenantId,
      table.timesReferenced,
    ),
  }),
);

export const contentRevisions = pgTable(
  'content_revisions',
  {
    revisionId: uuid('revision_id').primaryKey().defaultRandom(),
    contentId: uuid('content_id')
      .notNull()
      .references(() => content.contentId, { onDelete: 'cascade' }),
    revisionNumber: integer('revision_number').notNull(),
    blocks: jsonb('blocks').notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    editedBy: uuid('edited_by').references(() => users.userId),
    changeNote: text('change_note'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    contentIdx: index('idx_revisions_content').on(table.contentId),
    contentNumberIdx: index('idx_revisions_content_number').on(
      table.contentId,
      table.revisionNumber,
    ),
  }),
);

export const categories = pgTable(
  'categories',
  {
    categoryId: uuid('category_id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    description: text('description'),
    parentId: uuid('parent_id'),
    sortOrder: integer('sort_order').notNull().default(0),
    iconName: varchar('icon_name', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantIdx: index('idx_categories_tenant').on(table.tenantId),
    slugIdx: index('idx_categories_slug').on(table.tenantId, table.slug),
    parentIdx: index('idx_categories_parent').on(table.parentId),
  }),
);

export const tags = pgTable(
  'tags',
  {
    tagId: uuid('tag_id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantIdx: index('idx_tags_tenant').on(table.tenantId),
    slugIdx: index('idx_tags_slug').on(table.tenantId, table.slug),
  }),
);

export const contentTags = pgTable(
  'content_tags',
  {
    contentId: uuid('content_id')
      .notNull()
      .references(() => content.contentId, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.tagId, { onDelete: 'cascade' }),
  },
  (table) => ({
    contentIdx: index('idx_content_tags_content').on(table.contentId),
    tagIdx: index('idx_content_tags_tag').on(table.tagId),
  }),
);
