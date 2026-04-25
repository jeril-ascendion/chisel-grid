import { z } from 'zod';

export const CONTENT_TYPES = [
  'article',
  'adr',
  'diagram',
  'decision',
  'runbook',
  'template',
  'post_mortem',
] as const;
export const ContentTypeEnum = z.enum(CONTENT_TYPES);
export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_STATUSES = [
  'draft', 'submitted', 'in_review', 'approved', 'published',
  'archived', 'deprecated', 'rejected',
] as const;
export const ContentStatusEnum = z.enum(CONTENT_STATUSES);
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const TextBlockSchema = z.object({
  type: z.literal('text'),
  content: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export const HeadingBlockSchema = z.object({
  type: z.literal('heading'),
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  content: z.string(),
});

export const CodeBlockSchema = z.object({
  type: z.literal('code'),
  language: z.string(),
  content: z.string(),
  filename: z.string().optional(),
});

export const CalloutBlockSchema = z.object({
  type: z.literal('callout'),
  variant: z.enum(['info', 'warning', 'danger', 'success']),
  content: z.string(),
});

export const DiagramBlockSchema = z.object({
  type: z.literal('diagram'),
  diagramType: z.enum(['mermaid', 'd2', 'svg']),
  content: z.string(),
  caption: z.string().optional(),
});

export const ContentBlockSchema = z.discriminatedUnion('type', [
  TextBlockSchema,
  HeadingBlockSchema,
  CodeBlockSchema,
  CalloutBlockSchema,
  DiagramBlockSchema,
]);

export type ContentBlock = z.infer<typeof ContentBlockSchema>;

export const ContentMetadataSchema = z.object({
  title: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  audioUrl: z.string().url().optional(),
  heroImageUrl: z.string().url().optional(),
  readTimeMinutes: z.number().optional(),
  languageCode: z.string().optional(),
  voiceId: z.string().uuid().optional(),
  seo: z.object({
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    ogImageUrl: z.string().optional(),
  }).optional(),
});

export type ContentMetadata = z.infer<typeof ContentMetadataSchema>;
