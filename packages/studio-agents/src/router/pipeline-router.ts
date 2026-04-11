import { BedrockClient } from '@chiselgrid/ai';
import {
  type AgentId,
  type AgentContext,
  type DesignBlackboard,
  AGENT_SECTION_OWNERSHIP,
  applyPatch,
} from '@chiselgrid/studio-core';
import type { StudioBaseAgent } from '../base/studio-base-agent';
import { ContextAnalyzerAgent } from '../agents/context-analyzer/index';
import { ArchitectureGeneratorAgent } from '../agents/architecture-generator/index';
import { TradeoffAnalyzerAgent } from '../agents/tradeoff-analyzer/index';
import { DiagramGeneratorAgent } from '../agents/diagram-generator/index';
import { ReviewValidatorAgent } from '../agents/review-validator/index';
import { EstimatorAgent } from '../agents/estimator/index';
import { DocumentGeneratorAgent } from '../agents/document-generator/index';

export interface RouterDecision {
  pipeline: AgentId[];
  classification: string;
}

export const INITIAL_PIPELINE: AgentId[] = [
  'context_analyzer',
  'architecture_generator',
  'tradeoff_analyzer',
  'diagram_generator',
  'review_validator',
  'estimator',
  'document_generator',
];

export const REFINEMENT_PIPELINES: Record<string, AgentId[]> = {
  intent_change: ['context_analyzer', 'architecture_generator', 'tradeoff_analyzer', 'diagram_generator', 'review_validator', 'estimator'],
  component_change: ['architecture_generator', 'tradeoff_analyzer', 'diagram_generator', 'review_validator', 'estimator'],
  diagram_only: ['diagram_generator'],
  compliance_change: ['context_analyzer', 'review_validator'],
  estimate_only: ['estimator'],
  export_request: ['document_generator'],
};

const DIAGRAM_KEYWORDS = ['diagram', 'show', 'visualize', 'draw', 'c4', 'sequence', 'flowchart'];
const COMPLIANCE_KEYWORDS = ['compliance', 'pci', 'hipaa', 'bsp', 'regulation', 'gdpr', 'sox', 'mas', 'rbi'];
const ESTIMATE_KEYWORDS = ['estimate', 'cost', 'timeline', 'budget', 'story points', 'wbs'];
const EXPORT_KEYWORDS = ['export', 'download', 'generate document', 'pdf', 'docx'];
const COMPONENT_KEYWORDS = ['change', 'replace', 'add', 'remove', 'switch', 'modify', 'update', 'component', 'service', 'database'];

export function classifyRefinement(userMessage: string, _blackboard: DesignBlackboard): RouterDecision {
  const lower = userMessage.toLowerCase();

  const hasComponentKeywords = COMPONENT_KEYWORDS.some(k => lower.includes(k));

  if (EXPORT_KEYWORDS.some(k => lower.includes(k))) {
    return { pipeline: REFINEMENT_PIPELINES['export_request']!, classification: 'export_request' };
  }

  if (DIAGRAM_KEYWORDS.some(k => lower.includes(k)) && !hasComponentKeywords) {
    return { pipeline: REFINEMENT_PIPELINES['diagram_only']!, classification: 'diagram_only' };
  }

  if (COMPLIANCE_KEYWORDS.some(k => lower.includes(k)) && !hasComponentKeywords) {
    return { pipeline: REFINEMENT_PIPELINES['compliance_change']!, classification: 'compliance_change' };
  }

  if (ESTIMATE_KEYWORDS.some(k => lower.includes(k)) && !hasComponentKeywords) {
    return { pipeline: REFINEMENT_PIPELINES['estimate_only']!, classification: 'estimate_only' };
  }

  if (hasComponentKeywords) {
    return { pipeline: REFINEMENT_PIPELINES['component_change']!, classification: 'component_change' };
  }

  return { pipeline: REFINEMENT_PIPELINES['intent_change']!, classification: 'intent_change' };
}

export function checkGenerationGate(bb: DesignBlackboard): { allowed: boolean; blockers: string[] } {
  const blockers: string[] = [];

  const unresolvedBlocking = bb.conflicts.filter((c: { blocking: boolean; resolved: boolean }) => c.blocking && !c.resolved);
  if (unresolvedBlocking.length > 0) {
    blockers.push(`${unresolvedBlocking.length} unresolved blocking conflict(s)`);
  }

  if (bb.intent.criticality_tier <= 2) {
    const pendingGates = bb.human_gates.filter((g: { status: string }) => g.status === 'pending');
    if (pendingGates.length > 0) {
      blockers.push(`${pendingGates.length} pending human gate(s) for Tier ${bb.intent.criticality_tier}`);
    }
  }

  return { allowed: blockers.length === 0, blockers };
}

export function agentsForChangedSections(changedPaths: string[]): AgentId[] {
  const agentSet = new Set<AgentId>();

  for (const path of changedPaths) {
    for (const [agentId, sections] of Object.entries(AGENT_SECTION_OWNERSHIP) as Array<[AgentId, string[]]>) {
      if (sections.some((s: string) => path.startsWith(s) || s.startsWith(path))) {
        agentSet.add(agentId);
      }
    }
  }

  // Always include tradeoff_analyzer when architecture changes
  if (changedPaths.some(p => p.startsWith('architecture'))) {
    agentSet.add('tradeoff_analyzer');
  }

  // Sort by INITIAL_PIPELINE order
  return INITIAL_PIPELINE.filter(id => agentSet.has(id));
}

export function createAgentRegistry(bedrock?: BedrockClient): Record<AgentId, StudioBaseAgent> {
  const client = bedrock ?? new BedrockClient({ region: process.env['AWS_REGION'] ?? 'ap-southeast-1' });
  return {
    context_analyzer: new ContextAnalyzerAgent(client),
    architecture_generator: new ArchitectureGeneratorAgent(client),
    tradeoff_analyzer: new TradeoffAnalyzerAgent(client),
    diagram_generator: new DiagramGeneratorAgent(client),
    review_validator: new ReviewValidatorAgent(client),
    estimator: new EstimatorAgent(client),
    document_generator: new DocumentGeneratorAgent(client),
  };
}

export async function runPipeline(
  agentIds: AgentId[],
  ctx: AgentContext,
  registry: Record<AgentId, StudioBaseAgent>,
  onProgress?: (agentId: AgentId, status: 'started' | 'completed' | 'failed') => void,
): Promise<DesignBlackboard> {
  let bb = ctx.blackboard;

  for (const agentId of agentIds) {
    const agent = registry[agentId];
    if (!agent) continue;

    onProgress?.(agentId, 'started');

    const agentCtx: AgentContext = { ...ctx, blackboard: bb };
    const result = await agent.run(agentCtx);

    if (result.success) {
      bb = applyPatch(bb, result);
      onProgress?.(agentId, 'completed');
    } else {
      onProgress?.(agentId, 'failed');
    }

    // If Tarka blocks generation, stop pipeline
    if (agentId === 'tradeoff_analyzer' && !result.success) {
      break;
    }
  }

  return bb;
}
