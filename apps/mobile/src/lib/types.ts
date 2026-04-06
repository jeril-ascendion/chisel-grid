import type { ContentBlock } from '@chiselgrid/types';

export interface Article {
  contentId: string;
  tenantId: string;
  authorId: string;
  title: string;
  slug: string;
  description?: string;
  contentType: string;
  status: string;
  blocks: ContentBlock[] | string;
  categoryId?: string;
  categoryName?: string;
  heroImageUrl?: string;
  audioUrl?: string;
  readTimeMinutes?: number;
  tags?: string[];
  seoMetaTitle?: string;
  seoMetaDescription?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  categoryId: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  sortOrder: number;
  iconName?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface UserProfile {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'creator' | 'reader';
  tenantId: string;
}
