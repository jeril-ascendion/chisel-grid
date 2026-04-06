/**
 * Lambda handlers for the Step Functions content pipeline.
 * Each handler is a step in the state machine:
 *   Writer → Review → (revision loop) → SEO → Human Gate → Publish
 */
import { BedrockClient } from '../bedrock-client.js';
import { WriterAgent } from '../agents/writer-agent.js';
import { ReviewAgent } from '../agents/review-agent.js';
import { DiagramAgent } from '../agents/diagram-agent.js';
import { SEOAgent } from '../agents/seo-agent.js';
import {
  PipelineInputSchema,
  type PipelineState,
  type WriterOutput,
  type ReviewReport,
  type SEOReport,
} from '../schemas.js';

const bedrock = new BedrockClient();

// --- Step 1: Writer ---

export interface WriterStepInput {
  input: PipelineState['input'];
  contentId: string;
  currentRevision: number;
  blocks?: WriterOutput;
  review?: ReviewReport;
}

export interface WriterStepOutput extends WriterStepInput {
  blocks: WriterOutput;
  status: 'reviewing';
  writerJobUsage: { inputTokens: number; outputTokens: number };
}

export async function writerStep(event: WriterStepInput): Promise<WriterStepOutput> {
  const writer = new WriterAgent(bedrock);

  const isRevision = event.currentRevision > 1 && event.blocks && event.review;

  const result = isRevision
    ? await writer.revise({
        originalBlocks: JSON.stringify(event.blocks),
        reviewFeedback: JSON.stringify(event.review?.feedback ?? []),
        revisionInstructions: event.review?.revisionInstructions ?? '',
      })
    : await writer.write({
        topic: event.input.topic,
        contentType: event.input.contentType,
        categoryContext: event.input.categoryContext ?? '',
        additionalInstructions: event.input.additionalInstructions ?? '',
      });

  return {
    ...event,
    blocks: result.data,
    status: 'reviewing',
    writerJobUsage: result.usage,
  };
}

// --- Step 2: Review ---

export interface ReviewStepInput extends WriterStepOutput {}

export interface ReviewStepOutput extends Omit<ReviewStepInput, 'status'> {
  review: ReviewReport;
  status: 'reviewing';
  reviewJobUsage: { inputTokens: number; outputTokens: number };
}

export async function reviewStep(event: ReviewStepInput): Promise<ReviewStepOutput> {
  const reviewer = new ReviewAgent(bedrock);

  const title = event.blocks.find((b) => b.type === 'heading' && b.level === 1)?.content ?? event.input.topic;

  const result = await reviewer.review({
    title,
    blocks: JSON.stringify(event.blocks),
    revisionNumber: event.currentRevision,
  });

  return {
    ...event,
    review: result.data,
    status: 'reviewing',
    reviewJobUsage: result.usage,
  };
}

// --- Step 3: Revision Decision ---

export interface RevisionDecisionInput extends ReviewStepOutput {}

export interface RevisionDecisionOutput extends RevisionDecisionInput {
  needsRevision: boolean;
  currentRevision: number;
}

export function revisionDecision(event: RevisionDecisionInput): RevisionDecisionOutput {
  const threshold = event.input.revisionThreshold;
  const maxRevisions = event.input.maxRevisions;
  const needsRevision =
    event.review.needsRevision &&
    event.review.overallScore < threshold &&
    event.currentRevision < maxRevisions;

  return {
    ...event,
    needsRevision,
    currentRevision: needsRevision ? event.currentRevision + 1 : event.currentRevision,
  };
}

// --- Step 4: SEO ---

export interface SEOStepInput extends RevisionDecisionOutput {}

export interface SEOStepOutput extends Omit<SEOStepInput, 'status'> {
  seo: SEOReport;
  status: 'human_review';
  seoJobUsage: { inputTokens: number; outputTokens: number };
}

export async function seoStep(event: SEOStepInput): Promise<SEOStepOutput> {
  const seoAgent = new SEOAgent(bedrock);

  const title = event.blocks.find((b) => b.type === 'heading' && b.level === 1)?.content ?? event.input.topic;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const result = await seoAgent.analyze({
    title,
    blocks: JSON.stringify(event.blocks),
    slug,
  });

  return {
    ...event,
    seo: result.data,
    status: 'human_review',
    seoJobUsage: result.usage,
  };
}

// --- Step 5: Human Review Wait (uses task token callback) ---
// This is a passthrough — Step Functions waitForTaskToken handles the pause

export interface HumanReviewInput extends SEOStepOutput {
  taskToken?: string;
}

// --- Step 6: Publish ---

export interface PublishStepInput extends SEOStepOutput {
  decision: 'approve' | 'reject';
  reviewerFeedback?: string;
}

export interface PublishStepOutput {
  contentId: string;
  status: 'published' | 'rejected';
  blocks: WriterOutput;
  seo: SEOReport;
  review: ReviewReport;
  decision: 'approve' | 'reject';
}

export function publishStep(event: PublishStepInput): PublishStepOutput {
  return {
    contentId: event.contentId,
    status: event.decision === 'approve' ? 'published' : 'rejected',
    blocks: event.blocks,
    seo: event.seo,
    review: event.review,
    decision: event.decision,
  };
}

// --- Lambda handler entry points ---

export async function handler(event: { step: string; payload: unknown }): Promise<unknown> {
  switch (event.step) {
    case 'writer':
      return writerStep(event.payload as WriterStepInput);
    case 'review':
      return reviewStep(event.payload as ReviewStepInput);
    case 'revisionDecision':
      return revisionDecision(event.payload as RevisionDecisionInput);
    case 'seo':
      return seoStep(event.payload as SEOStepInput);
    case 'publish':
      return publishStep(event.payload as PublishStepInput);
    default:
      throw new Error(`Unknown pipeline step: ${event.step}`);
  }
}
