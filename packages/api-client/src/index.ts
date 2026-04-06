import { z } from 'zod';
import { ContentBlockSchema, ContentStatusEnum, ContentTypeEnum } from '@chiselgrid/types';

// --- Response schemas with Zod validation ---

const ArticleSchema = z.object({
  contentId: z.string(),
  tenantId: z.string(),
  authorId: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable().optional(),
  contentType: ContentTypeEnum,
  status: ContentStatusEnum,
  blocks: z.union([z.array(ContentBlockSchema), z.string()]),
  categoryId: z.string().nullable().optional(),
  heroImageUrl: z.string().nullable().optional(),
  audioUrl: z.string().nullable().optional(),
  readTimeMinutes: z.number().nullable().optional(),
  seoMetaTitle: z.string().nullable().optional(),
  seoMetaDescription: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Article = z.infer<typeof ArticleSchema>;

const PaginatedResponseSchema = z.object({
  items: z.array(ArticleSchema),
  nextCursor: z.string().optional(),
  hasMore: z.boolean(),
});

export type PaginatedResponse = z.infer<typeof PaginatedResponseSchema>;

const CategorySchema = z.object({
  categoryId: z.string(),
  tenantId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  sortOrder: z.number(),
  iconName: z.string().nullable().optional(),
});

export type Category = z.infer<typeof CategorySchema>;

// --- Client ---

export interface ApiClientConfig {
  baseUrl: string;
  tenantId: string;
  getAuthToken?: () => Promise<string | null>;
}

export function createApiClient(config: ApiClientConfig) {
  const { baseUrl, tenantId, getAuthToken } = config;

  async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) ?? {}),
    };

    if (getAuthToken) {
      const token = await getAuthToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}${path}`, { ...options, headers });

    if (!response.ok) {
      throw new ApiError(response.status, response.statusText, path);
    }

    return response.json() as Promise<T>;
  }

  return {
    async listArticles(params: {
      status?: string;
      categoryId?: string;
      cursor?: string;
      limit?: number;
    } = {}): Promise<PaginatedResponse> {
      const query = new URLSearchParams({ tenantId });
      if (params.status) query.set('status', params.status);
      if (params.categoryId) query.set('categoryId', params.categoryId);
      if (params.cursor) query.set('cursor', params.cursor);
      if (params.limit) query.set('limit', String(params.limit));

      const data = await fetchApi<unknown>(`/content?${query.toString()}`);
      return PaginatedResponseSchema.parse(data);
    },

    async getArticle(slug: string): Promise<Article> {
      const data = await fetchApi<unknown>(`/content/slug/${slug}?tenantId=${tenantId}`);
      return ArticleSchema.parse(data);
    },

    async listCategories(): Promise<Category[]> {
      const data = await fetchApi<{ categories: unknown[] }>(
        `/categories?tenantId=${tenantId}`,
      );
      return z.array(CategorySchema).parse(data.categories);
    },

    async search(query: string, limit = 20): Promise<Article[]> {
      const data = await fetchApi<{ items: unknown[] }>(
        `/content/search?tenantId=${tenantId}&q=${encodeURIComponent(query)}&limit=${limit}`,
      );
      return z.array(ArticleSchema).parse(data.items);
    },
  };
}

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly statusText: string,
    public readonly path: string,
  ) {
    super(`API Error ${statusCode}: ${statusText} (${path})`);
    this.name = 'ApiError';
  }
}
