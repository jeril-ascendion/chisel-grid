import { z } from 'zod';
import {
  type AgentContext,
  type BlackboardPatch,
  type Conflict,
  type Gap,
  type Assumption,
  type HumanGate,
  BLOCKING_CONFLICT_TYPES,
  createAmendment,
  createAuditEvent,
  toTOON,
} from '@chiselgrid/studio-core';
import { StudioBaseAgent } from '../../base/studio-base-agent';
import { CONTEXT_ANALYZER_SYSTEM_PROMPT } from './prompts/system';

const ClarificationQuestionSchema = z.object({
  id: z.string(),
  gap_id: z.string(),
  question: z.string(),
  why_needed: z.string(),
  priority: z.number(),
  options: z.array(z.string()).optional(),
});

const ContextAnalyzerOutputSchema = z.object({
  intent: z.object({
    type: z.string(),
    project_type: z.string(),
    fidelity: z.string(),
    criticality_tier: z.number(),
    criticality_challenged: z.boolean(),
    criticality_signals: z.array(z.string()),
    domain: z.string(),
    sub_domain: z.string().optional(),
    jurisdiction: z.array(z.string()),
    cloud_platforms: z.array(z.string()),
    compliance_tags: z.array(z.string()),
    status: z.string(),
  }),
  requirements: z.object({
    functional: z.array(z.any()),
    nfr: z.object({
      has_ha_claim: z.boolean(),
      has_dr_strategy: z.boolean(),
    }).passthrough(),
    compliance: z.array(z.string()),
    constraints: z.array(z.any()),
    status: z.string(),
  }),
  assumptions: z.object({
    confirmed: z.array(z.any()),
    pending: z.array(z.any()),
    forbidden_defaults: z.array(z.string()),
  }),
  gaps: z.array(z.any()),
  conflicts: z.array(z.any()),
  clarification_questions: z.array(ClarificationQuestionSchema),
  understanding_summary: z.string(),
  generation_ready: z.boolean(),
  generation_blocked_reason: z.string().nullable(),
});

export class ContextAnalyzerAgent extends StudioBaseAgent {
  readonly agentId = 'context_analyzer' as const;

  protected async execute(ctx: AgentContext): Promise<BlackboardPatch> {
    const userMessage = this.buildUserMessage(ctx);

    const response = await this.invoke(
      [{ role: 'user', content: userMessage }],
      { system: CONTEXT_ANALYZER_SYSTEM_PROMPT, temperature: 0.05, maxTokens: 8192 },
    );

    const jsonStr = this.extractJson(response.content);
    const raw: unknown = JSON.parse(jsonStr);
    const parsed = ContextAnalyzerOutputSchema.parse(raw);

    // Enforce max 5 clarification questions
    const sortedQuestions = parsed.clarification_questions
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 5);

    // Map conflicts: set blocking=true for BLOCKING_CONFLICT_TYPES
    const conflicts: Conflict[] = (parsed.conflicts as Conflict[]).map(c => ({
      ...c,
      blocking: BLOCKING_CONFLICT_TYPES.has(c.type) ? true : c.blocking,
    }));

    // For Tier 1/2 blocking conflicts: create human_gate entries
    const humanGates: HumanGate[] = [];
    if (parsed.intent.criticality_tier <= 2) {
      for (const conflict of conflicts.filter(c => c.blocking && !c.resolved)) {
        humanGates.push({
          id: crypto.randomUUID(),
          session_id: ctx.session_id,
          tenant_id: ctx.tenant_id,
          triggered_by_agent: this.agentId,
          description: `Blocking conflict requires human review: ${conflict.type} — ${conflict.fact_a.statement} vs ${conflict.fact_b.statement}`,
          context_json: { conflict_id: conflict.id, conflict_type: conflict.type },
          status: 'pending',
          created_at: new Date().toISOString(),
        });
      }
    }

    const amendments = [
      createAmendment({
        session_id: ctx.session_id,
        turn_number: ctx.turn,
        agent_id: this.agentId,
        section_path: 'intent',
        operation: ctx.turn === 0 ? 'create' : 'update',
        before_summary: ctx.turn === 0 ? 'empty' : JSON.stringify(ctx.blackboard.intent.type),
        after_summary: `${parsed.intent.type} / tier ${parsed.intent.criticality_tier}`,
        rationale: parsed.understanding_summary,
      }),
    ];

    const auditEvents = [
      createAuditEvent({
        session_id: ctx.session_id,
        tenant_id: ctx.tenant_id,
        turn: ctx.turn,
        eventType: 'context_analysis.completed',
        actor_type: 'agent',
        actor_id: this.agentId,
        payload: {
          criticality_tier: parsed.intent.criticality_tier,
          criticality_challenged: parsed.intent.criticality_challenged,
          gaps_found: parsed.gaps.length,
          conflicts_found: conflicts.length,
          questions_count: sortedQuestions.length,
          generation_ready: parsed.generation_ready,
          tokens_used: response.usage.totalTokens,
        },
      }),
    ];

    return {
      intent: parsed.intent as BlackboardPatch['intent'],
      requirements: parsed.requirements as BlackboardPatch['requirements'],
      assumptions: parsed.assumptions as BlackboardPatch['assumptions'],
      gaps: parsed.gaps as Gap[],
      conflicts,
      amendments,
      audit_events: auditEvents,
    };
  }

  private buildUserMessage(ctx: AgentContext): string {
    const trigger = ctx.trigger;

    if (ctx.turn === 0 && trigger.user_message) {
      return `Analyze this architecture request and produce the output JSON:\n\n${trigger.user_message}`;
    }

    // Refinement turns: include current blackboard summary
    const bbSummary = toTOON(ctx.blackboard);
    const userMsg = trigger.user_message ?? '';

    return `Current blackboard state:\n${bbSummary}\n\nUser refinement:\n${userMsg}\n\nProduce updated output JSON.`;
  }
}
