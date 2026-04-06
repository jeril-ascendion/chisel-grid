/**
 * T-16.x / T-17.x: Voice capture and intelligence type definitions
 * Shared Zod schemas for voice recording, transcription, and voice pipeline.
 */

import { z } from 'zod';

// --- Voice Recording ---

export const VoiceStatusEnum = z.enum([
  'uploading',
  'uploaded',
  'transcribing',
  'transcribed',
  'structuring',
  'writing',
  'reviewing',
  'human_review',
  'approved',
  'published',
  'failed',
]);
export type VoiceStatus = z.infer<typeof VoiceStatusEnum>;

export const VoiceRecordingSchema = z.object({
  voiceId: z.string().uuid(),
  tenantId: z.string().uuid(),
  uploadedBy: z.string().uuid(),
  s3Key: z.string(),
  durationMs: z.number().positive(),
  status: VoiceStatusEnum,
  languageCode: z.string().default('en-US'),
  transcriptKey: z.string().optional(),
  contentId: z.string().uuid().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type VoiceRecording = z.infer<typeof VoiceRecordingSchema>;

// --- Transcript ---

export const TranscriptSegmentSchema = z.object({
  startTime: z.number(),
  endTime: z.number(),
  content: z.string(),
  type: z.enum(['pronunciation', 'punctuation']),
  confidence: z.number().min(0).max(1),
});
export type TranscriptSegment = z.infer<typeof TranscriptSegmentSchema>;

export const TranscriptResultSchema = z.object({
  voiceId: z.string().uuid(),
  tenantId: z.string().uuid(),
  fullText: z.string(),
  segments: z.array(TranscriptSegmentSchema),
  languageCode: z.string(),
  durationMs: z.number(),
  s3TranscriptKey: z.string(),
});
export type TranscriptResult = z.infer<typeof TranscriptResultSchema>;

// --- Structured Transcript (from Structure Agent) ---

export const TranscriptSectionSchema = z.object({
  title: z.string(),
  content: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  keyPoints: z.array(z.string()),
});
export type TranscriptSection = z.infer<typeof TranscriptSectionSchema>;

export const StructuredTranscriptSchema = z.object({
  cleanedText: z.string(),
  sections: z.array(TranscriptSectionSchema),
  suggestedTitle: z.string(),
  detectedTopics: z.array(z.string()),
  fillerWordsRemoved: z.number(),
  languageCode: z.string(),
});
export type StructuredTranscript = z.infer<typeof StructuredTranscriptSchema>;

// --- Fidelity Report ---

export const FidelityReportSchema = z.object({
  fidelityScore: z.number().min(0).max(100),
  factsPreserved: z.array(
    z.object({
      fact: z.string(),
      preserved: z.boolean(),
      articleLocation: z.string().optional(),
    }),
  ),
  additionsDetected: z.array(
    z.object({
      addition: z.string(),
      severity: z.enum(['acceptable', 'minor', 'major']),
      reason: z.string(),
    }),
  ),
  summary: z.string(),
});
export type FidelityReport = z.infer<typeof FidelityReportSchema>;

// --- Gap Detection ---

export const GapDetectionSchema = z.object({
  gaps: z.array(
    z.object({
      reference: z.string(),
      context: z.string(),
      suggestion: z.string(),
      severity: z.enum(['info', 'warning', 'critical']),
    }),
  ),
  unresolvedCount: z.number(),
  resolvedCount: z.number(),
});
export type GapDetection = z.infer<typeof GapDetectionSchema>;

// --- Custom Vocabulary ---

export const VocabularyEntrySchema = z.object({
  phrase: z.string().min(1).max(256),
  soundsLike: z.string().optional(),
  ipa: z.string().optional(),
  displayAs: z.string().optional(),
});
export type VocabularyEntry = z.infer<typeof VocabularyEntrySchema>;

export const TenantVocabularySchema = z.object({
  tenantId: z.string().uuid(),
  entries: z.array(VocabularyEntrySchema),
  languageCode: z.string().default('en-US'),
  lastSynced: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type TenantVocabulary = z.infer<typeof TenantVocabularySchema>;

// --- Voice Pipeline State ---

export const VoicePipelineStateSchema = z.object({
  voiceId: z.string().uuid(),
  tenantId: z.string().uuid(),
  uploadedBy: z.string().uuid(),
  status: VoiceStatusEnum,
  s3Key: z.string(),
  durationMs: z.number(),
  languageCode: z.string().default('en-US'),
  transcript: TranscriptResultSchema.optional(),
  structuredTranscript: StructuredTranscriptSchema.optional(),
  contentId: z.string().uuid().optional(),
  fidelityReport: FidelityReportSchema.optional(),
  gapDetection: GapDetectionSchema.optional(),
  jobIds: z.array(z.string().uuid()).default([]),
});
export type VoicePipelineState = z.infer<typeof VoicePipelineStateSchema>;
