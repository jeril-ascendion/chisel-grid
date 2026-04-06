import type { ContentBlock } from '@chiselgrid/types';

export interface CrawledFile {
  /** Original file path relative to source root */
  sourcePath: string;
  /** File type: html, md, mmd */
  fileType: 'html' | 'md' | 'mmd';
  /** Raw file content */
  rawContent: string;
  /** Extracted frontmatter (if any) */
  frontmatter: Record<string, unknown>;
  /** Content body without frontmatter */
  body: string;
}

export interface ConvertedContent {
  /** Original source path */
  sourcePath: string;
  /** Generated slug for ChiselGrid */
  slug: string;
  /** Content title */
  title: string;
  /** Short description/excerpt */
  description: string;
  /** Converted content blocks */
  blocks: ContentBlock[];
  /** Category assignment */
  categorySlug: string | null;
  /** Tags extracted from content or frontmatter */
  tags: string[];
  /** Original URL for redirect mapping */
  originalUrl: string;
}

export interface SlugMapping {
  originalPath: string;
  originalUrl: string;
  newSlug: string;
  redirectNeeded: boolean;
}

export interface MigrationResult {
  total: number;
  imported: number;
  skipped: number;
  failed: number;
  errors: { sourcePath: string; error: string }[];
}

export interface ValidationResult {
  url: string;
  status: number;
  contentRendered: boolean;
  error?: string;
}
