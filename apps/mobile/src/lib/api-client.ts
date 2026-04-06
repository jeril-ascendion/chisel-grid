import { z } from 'zod';
import * as SecureStore from 'expo-secure-store';
import type { Article, Category, PaginatedResponse } from './types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.ascendion.engineering';
const TENANT_ID = process.env.EXPO_PUBLIC_TENANT_ID ?? 'default';

async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync('auth_token');
  } catch {
    return null;
  }
}

async function fetchApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  async listArticles(params: {
    status?: string;
    categoryId?: string;
    cursor?: string;
    limit?: number;
  } = {}): Promise<PaginatedResponse<Article>> {
    const query = new URLSearchParams();
    query.set('tenantId', TENANT_ID);
    if (params.status) query.set('status', params.status);
    if (params.categoryId) query.set('categoryId', params.categoryId);
    if (params.cursor) query.set('cursor', params.cursor);
    if (params.limit) query.set('limit', String(params.limit));

    return fetchApi<PaginatedResponse<Article>>(`/content?${query.toString()}`);
  },

  async getArticle(slug: string): Promise<Article> {
    return fetchApi<Article>(`/content/slug/${slug}?tenantId=${TENANT_ID}`);
  },

  async listCategories(): Promise<Category[]> {
    const result = await fetchApi<{ categories: Category[] }>(
      `/categories?tenantId=${TENANT_ID}`,
    );
    return result.categories;
  },

  async search(query: string): Promise<Article[]> {
    const result = await fetchApi<{ items: Article[] }>(
      `/content/search?tenantId=${TENANT_ID}&q=${encodeURIComponent(query)}`,
    );
    return result.items;
  },
};
