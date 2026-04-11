import { z } from 'zod';
import {
  type AgentContext,
  type BlackboardPatch,
  CRITICALITY_GENERATION_GATES,
  type CriticalityTier,
  createAmendment,
  createAuditEvent,
  calculateReadinessScore,
  toTOON,
} from '@chiselgrid/studio-core';
import { StudioBaseAgent } from '../../base/studio-base-agent';
import { DOCUMENT_GENERATOR_SYSTEM_PROMPT } from './prompts/system';

const DocGenOutputSchema = z.object({
  blocked: z.boolean(),
  reason: z.string().optional(),
  documents: z.array(z.object({
    type: z.string(),
    title: z.string(),
    content: z.string(),
    word_count: z.number(),
  })).optional(),
});

export class DocumentGeneratorAgent extends StudioBaseAgent {
  readonly agentId = 'document_generator' as const;

  protected async execute(ctx: AgentContext): Promise<BlackboardPatch> {
    const bb = ctx.blackboard;
    const tier = bb.intent.criticality_tier as CriticalityTier;
    const gate = CRITICALITY_GENERATION_GATES[tier];
    const score = calculateReadinessScore(bb);

    if (score < gate) {
      return {
        audit_events: [
          createAuditEvent({
            session_id: ctx.session_id,
            tenant_id: ctx.tenant_id,
            turn: ctx.turn,
            eventType: 'document_generation.blocked',
            actor_type: 'agent',
            actor_id: this.agentId,
            payload: { readiness_score: score, required: gate, tier },
          }),
        ],
      };
    }

    const bbSummary = toTOON(bb);
    const userMessage = `Generate SDD and AGENTS.md from this completed blackboard:\n\n${bbSummary}\n\nFull architecture:\n${JSON.stringify(bb.architecture, null, 2)}\n\nADRs:\n${JSON.stringify(bb.analysis.adrs, null, 2)}\n\nEstimates:\n${JSON.stringify(bb.estimates, null, 2)}`;

    const response = await this.invoke(
      [{ role: 'user', content: userMessage }],
      { system: DOCUMENT_GENERATOR_SYSTEM_PROMPT, temperature: 0.2, maxTokens: 16384 },
    );

    const jsonStr = this.extractJson(response.content);
    const raw: unknown = JSON.parse(jsonStr);
    const parsed = DocGenOutputSchema.parse(raw);

    if (parsed.blocked) {
      return {
        audit_events: [
          createAuditEvent({
            session_id: ctx.session_id,
            tenant_id: ctx.tenant_id,
            turn: ctx.turn,
            eventType: 'document_generation.blocked',
            actor_type: 'agent',
            actor_id: this.agentId,
            payload: { reason: parsed.reason },
          }),
        ],
      };
    }

    const amendments = [
      createAmendment({
        session_id: ctx.session_id,
        turn_number: ctx.turn,
        agent_id: this.agentId,
        section_path: 'exported_artifacts',
        operation: 'create',
        before_summary: 'no documents',
        after_summary: `${parsed.documents?.length ?? 0} documents generated`,
        rationale: 'Document generation completed',
      }),
    ];

    const auditEvents = [
      createAuditEvent({
        session_id: ctx.session_id,
        tenant_id: ctx.tenant_id,
        turn: ctx.turn,
        eventType: 'document_generation.completed',
        actor_type: 'agent',
        actor_id: this.agentId,
        payload: {
          document_count: parsed.documents?.length ?? 0,
          tokens_used: response.usage.totalTokens,
        },
      }),
    ];

    return {
      amendments,
      audit_events: auditEvents,
    };
  }
}
