import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const mediaTypeEnum = pgEnum('media_type', [
  'image',
  'video',
  'audio',
  'document',
  'other',
]);

export const mediaAssets = pgTable(
  'media_assets',
  {
    assetId: uuid('asset_id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'cascade' }),
    uploadedBy: uuid('uploaded_by')
      .notNull()
      .references(() => users.userId),
    fileName: varchar('file_name', { length: 500 }).notNull(),
    s3Key: varchar('s3_key', { length: 1024 }).notNull(),
    mimeType: varchar('mime_type', { length: 128 }).notNull(),
    mediaType: mediaTypeEnum('media_type').notNull().default('other'),
    fileSizeBytes: integer('file_size_bytes').notNull(),
    width: integer('width'),
    height: integer('height'),
    altText: varchar('alt_text', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantIdx: index('idx_media_tenant').on(table.tenantId),
    uploaderIdx: index('idx_media_uploader').on(table.uploadedBy),
  }),
);
