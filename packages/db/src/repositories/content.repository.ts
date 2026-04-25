import { eq, and, desc, sql, ilike, or, lt } from 'drizzle-orm';
import type { Db } from '../client';
import {
  content,
  contentRevisions,
  contentTags,
  tags,
  categories,
} from '../schema/content';
import type { ContentBlock, ContentType, ContentStatus } from '@chiselgrid/types';

export interface CreateContentInput {
  tenantId: string;
  authorId: string;
  title: string;
  slug: string;
  description?: string;
  contentType?: ContentType;
  blocks?: ContentBlock[];
  categoryId?: string;
  heroImageUrl?: string;
}

export interface UpdateContentInput {
  title?: string;
  slug?: string;
  description?: string;
  status?: ContentStatus;
  contentType?: ContentType;
  blocks?: ContentBlock[];
  heroImageUrl?: string;
  audioUrl?: string;
  readTimeMinutes?: number;
  seoMetaTitle?: string;
  seoMetaDescription?: string;
  seoOgImageUrl?: string;
  categoryId?: string;
}

export interface ContentListOptions {
  tenantId: string;
  status?: string;
  categoryId?: string;
  authorId?: string;
  search?: string;
  cursor?: string; // contentId for cursor pagination
  limit?: number;
}

export class ContentRepository {
  constructor(private readonly db: Db) {}

  async create(input: CreateContentInput) {
    const [row] = await this.db
      .insert(content)
      .values({
        tenantId: input.tenantId,
        authorId: input.authorId,
        title: input.title,
        slug: input.slug,
        description: input.description ?? null,
        contentType: input.contentType ?? 'article',
        blocks: JSON.stringify(input.blocks ?? []),
        categoryId: input.categoryId ?? null,
        heroImageUrl: input.heroImageUrl ?? null,
      })
      .returning();
    return row!;
  }

  async findById(tenantId: string, contentId: string) {
    const [row] = await this.db
      .select()
      .from(content)
      .where(
        and(
          eq(content.tenantId, tenantId),
          eq(content.contentId, contentId),
        ),
      );
    return row ?? null;
  }

  async findBySlug(tenantId: string, slug: string) {
    const [row] = await this.db
      .select()
      .from(content)
      .where(
        and(eq(content.tenantId, tenantId), eq(content.slug, slug)),
      );
    return row ?? null;
  }

  async list(options: ContentListOptions) {
    const limit = Math.min(options.limit ?? 20, 100);

    const conditions = [eq(content.tenantId, options.tenantId)];

    if (options.status) {
      conditions.push(
        eq(content.status, options.status as typeof content.status.enumValues[number]),
      );
    }
    if (options.categoryId) {
      conditions.push(eq(content.categoryId, options.categoryId));
    }
    if (options.authorId) {
      conditions.push(eq(content.authorId, options.authorId));
    }
    if (options.search) {
      conditions.push(
        or(
          ilike(content.title, `%${options.search}%`),
          ilike(content.description, `%${options.search}%`),
        )!,
      );
    }
    if (options.cursor) {
      conditions.push(lt(content.contentId, options.cursor));
    }

    const rows = await this.db
      .select()
      .from(content)
      .where(and(...conditions))
      .orderBy(desc(content.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1]?.contentId : undefined;

    return { items, nextCursor, hasMore };
  }

  async update(tenantId: string, contentId: string, input: UpdateContentInput) {
    const [row] = await this.db
      .update(content)
      .set({
        ...input,
        blocks: input.blocks ? JSON.stringify(input.blocks) : undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(content.tenantId, tenantId),
          eq(content.contentId, contentId),
        ),
      )
      .returning();
    return row ?? null;
  }

  async publish(tenantId: string, contentId: string) {
    return this.update(tenantId, contentId, {
      status: 'published',
    });
  }

  async delete(tenantId: string, contentId: string) {
    const [row] = await this.db
      .delete(content)
      .where(
        and(
          eq(content.tenantId, tenantId),
          eq(content.contentId, contentId),
        ),
      )
      .returning();
    return row ?? null;
  }

  // Revisions
  async createRevision(
    contentId: string,
    revisionNumber: number,
    title: string,
    blocks: ContentBlock[],
    editedBy?: string,
    changeNote?: string,
    description?: string,
  ) {
    const [row] = await this.db
      .insert(contentRevisions)
      .values({
        contentId,
        revisionNumber,
        title,
        blocks: JSON.stringify(blocks),
        editedBy: editedBy ?? null,
        changeNote: changeNote ?? null,
        description: description ?? null,
      })
      .returning();
    return row!;
  }

  async getRevisions(contentId: string) {
    return this.db
      .select()
      .from(contentRevisions)
      .where(eq(contentRevisions.contentId, contentId))
      .orderBy(desc(contentRevisions.revisionNumber));
  }

  // Tags
  async setTags(contentId: string, tagIds: string[]) {
    await this.db
      .delete(contentTags)
      .where(eq(contentTags.contentId, contentId));

    if (tagIds.length > 0) {
      await this.db.insert(contentTags).values(
        tagIds.map((tagId) => ({ contentId, tagId })),
      );
    }
  }

  async getTagsForContent(contentId: string) {
    return this.db
      .select({ tagId: tags.tagId, name: tags.name, slug: tags.slug })
      .from(contentTags)
      .innerJoin(tags, eq(contentTags.tagId, tags.tagId))
      .where(eq(contentTags.contentId, contentId));
  }

  // Full-text search using PostgreSQL tsvector
  async fullTextSearch(tenantId: string, query: string, limit = 20) {
    const tsQuery = query
      .trim()
      .split(/\s+/)
      .map((w) => `${w}:*`)
      .join(' & ');

    return this.db
      .select()
      .from(content)
      .where(
        and(
          eq(content.tenantId, tenantId),
          eq(content.status, 'published'),
          sql`to_tsvector('english', ${content.title} || ' ' || coalesce(${content.description}, '')) @@ to_tsquery('english', ${tsQuery})`,
        ),
      )
      .orderBy(
        sql`ts_rank(to_tsvector('english', ${content.title} || ' ' || coalesce(${content.description}, '')), to_tsquery('english', ${tsQuery})) DESC`,
      )
      .limit(limit);
  }

  // Categories
  async listCategories(tenantId: string) {
    return this.db
      .select()
      .from(categories)
      .where(eq(categories.tenantId, tenantId))
      .orderBy(categories.sortOrder);
  }

  async createCategory(input: {
    tenantId: string;
    name: string;
    slug: string;
    description?: string;
    parentId?: string;
    sortOrder?: number;
    iconName?: string;
  }) {
    const [row] = await this.db
      .insert(categories)
      .values({
        tenantId: input.tenantId,
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        parentId: input.parentId ?? null,
        sortOrder: input.sortOrder ?? 0,
        iconName: input.iconName ?? null,
      })
      .returning();
    return row!;
  }

  // Tags management
  async createTag(tenantId: string, name: string, slug: string) {
    const [row] = await this.db
      .insert(tags)
      .values({ tenantId, name, slug })
      .returning();
    return row!;
  }

  async listTags(tenantId: string) {
    return this.db
      .select()
      .from(tags)
      .where(eq(tags.tenantId, tenantId))
      .orderBy(tags.name);
  }
}
