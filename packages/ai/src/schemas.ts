import { z } from 'zod';
import { ContentBlockSchema } from '@chiselgrid/types';

/**
 * Shared Zod schemas for AI agent inputs and outputs.
 */

// --- Review Agent schemas ---

export const ReviewScoresSchema = z.object({
  accuracy: z.number().min(0).max(100),
  completeness: z.number().min(0).max(100),
  readability: z.number().min(0).max(100),
  seo: z.number().min(0).max(100),
  depth: z.number().min(0).max(100),
});
export type ReviewScores = z.infer<typeof ReviewScoresSchema>;

export const ReviewFeedbackItemSchema = z.object({
  dimension: z.string(),
  comment: z.string(),
  severity: z.enum(['critical', 'major', 'minor']),
});
export type ReviewFeedbackItem = z.infer<typeof ReviewFeedbackItemSchema>;

export const ReviewReportSchema = z.object({
  scores: ReviewScoresSchema,
  overallScore: z.number().min(0).max(100),
  needsRevision: z.boolean(),
  feedback: z.array(ReviewFeedbackItemSchema),
  revisionInstructions: z.string(),
  summary: z.string(),
});
export type ReviewReport = z.infer<typeof ReviewReportSchema>;

// --- Writer Agent schemas ---

export const WriterOutputSchema = z.array(ContentBlockSchema).min(3);
export type WriterOutput = z.infer<typeof WriterOutputSchema>;

// --- SEO Agent schemas ---

export const InternalLinkSuggestionSchema = z.object({
  anchor: z.string(),
  targetTopic: z.string(),
});

export const SEOReportSchema = z.object({
  metaTitle: z.string().max(70),
  metaDescription: z.string().max(170),
  keywords: z.array(z.string()).min(3).max(10),
  ogTitle: z.string(),
  ogDescription: z.string(),
  jsonLd: z.record(z.unknown()),
  internalLinkSuggestions: z.array(InternalLinkSuggestionSchema),
});
export type SEOReport = z.infer<typeof SEOReportSchema>;

// --- Step Functions pipeline schemas ---

export const PipelineInputSchema = z.object({
  tenantId: z.string().uuid(),
  contentId: z.string().uuid().optional(),
  topic: z.string().min(5),
  contentType: z.enum(['standard_doc', 'blog_post']).default('standard_doc'),
  categoryId: z.string().uuid().optional(),
  categoryContext: z.string().optional(),
  additionalInstructions: z.string().optional(),
  authorId: z.string().uuid(),
  maxRevisions: z.number().min(1).max(5).default(3),
  revisionThreshold: z.number().min(0).max(100).default(60),
});
export type PipelineInput = z.infer<typeof PipelineInputSchema>;

export const PipelineStateSchema = z.object({
  input: PipelineInputSchema,
  contentId: z.string().uuid(),
  currentRevision: z.number().default(1),
  blocks: z.array(ContentBlockSchema).optional(),
  review: ReviewReportSchema.optional(),
  seo: SEOReportSchema.optional(),
  status: z.enum(['writing', 'reviewing', 'revising', 'seo', 'human_review', 'approved', 'rejected', 'published']),
  jobIds: z.array(z.string().uuid()).default([]),
});
export type PipelineState = z.infer<typeof PipelineStateSchema>;

// --- Structure Agent schemas (T-17.1) ---

export const TranscriptSectionOutputSchema = z.object({
  title: z.string(),
  content: z.string(),
  startTimeApprox: z.number().optional(),
  endTimeApprox: z.number().optional(),
  keyPoints: z.array(z.string()),
});

export const StructuredTranscriptOutputSchema = z.object({
  cleanedText: z.string(),
  sections: z.array(TranscriptSectionOutputSchema).min(1),
  suggestedTitle: z.string(),
  detectedTopics: z.array(z.string()),
  fillerWordsRemoved: z.number(),
  languageCode: z.string(),
});
export type StructuredTranscriptOutput = z.infer<typeof StructuredTranscriptOutputSchema>;

// --- Fidelity Report schemas (T-17.2) ---

export const FidelityFactSchema = z.object({
  fact: z.string(),
  preserved: z.boolean(),
  articleLocation: z.string().optional(),
});

export const FidelityAdditionSchema = z.object({
  addition: z.string(),
  severity: z.enum(['acceptable', 'minor', 'major']),
  reason: z.string(),
});

export const FidelityReportSchema = z.object({
  fidelityScore: z.number().min(0).max(100),
  factsPreserved: z.array(FidelityFactSchema),
  additionsDetected: z.array(FidelityAdditionSchema),
  summary: z.string(),
});
export type FidelityReport = z.infer<typeof FidelityReportSchema>;

// --- Gap Detection schemas (T-17.3) ---

export const GapItemSchema = z.object({
  reference: z.string(),
  context: z.string(),
  suggestion: z.string(),
  severity: z.enum(['info', 'warning', 'critical']),
});

export const GapDetectionResultSchema = z.object({
  gaps: z.array(GapItemSchema),
  unresolvedCount: z.number(),
  resolvedCount: z.number(),
});
export type GapDetectionResult = z.infer<typeof GapDetectionResultSchema>;

// --- Human Review schemas ---

export const HumanReviewDecisionSchema = z.object({
  contentId: z.string().uuid(),
  decision: z.enum(['approve', 'reject']),
  feedback: z.string().optional(),
  reviewerId: z.string().uuid(),
  taskToken: z.string(),
});
export type HumanReviewDecision = z.infer<typeof HumanReviewDecisionSchema>;
