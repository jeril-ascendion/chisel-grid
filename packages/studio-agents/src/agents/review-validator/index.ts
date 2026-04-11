import { z } from 'zod';
import {
  type AgentContext,
  type BlackboardPatch,
  type PillarScore,
  type TwelveFactorFinding,
  type Pillar,
  createAmendment,
  createAuditEvent,
  toTOON,
} from '@chiselgrid/studio-core';
import { StudioBaseAgent } from '../../base/studio-base-agent';
import { REVIEW_VALIDATOR_SYSTEM_PROMPT } from './prompts/system';

const ReviewOutputSchema = z.object({
  pillar_scores: z.record(z.object({
    score: z.number(),
    findings: z.array(z.string()),
    recommendations: z.array(z.string()),
  })),
  twelve_factor_findings: z.array(z.object({
    factor: z.string(),
    status: z.enum(['pass', 'warn', 'fail']),
    note: z.string(),
  })),
  compliance_findings: z.array(z.any()).optional(),
  overall_readiness_score: z.number(),
  human_gate_required: z.boolean(),
  human_gate_reason: z.string().nullable(),
});

export class ReviewValidatorAgent extends StudioBaseAgent {
  readonly agentId = 'review_validator' as const;

  protected async execute(ctx: AgentContext): Promise<BlackboardPatch> {
    const bb = ctx.blackboard;
    const bbSummary = toTOON(bb);

    const userMessage = `Review this architecture:\n\n${bbSummary}\n\nCompliance tags: ${bb.intent.compliance_tags.join(', ') || 'none'}\nCriticality tier: ${bb.intent.criticality_tier}`;

    const response = await this.invoke(
      [{ role: 'user', content: userMessage }],
      { system: REVIEW_VALIDATOR_SYSTEM_PROMPT, temperature: 0.1, maxTokens: 8192 },
    );

    const jsonStr = this.extractJson(response.content);
    const raw: unknown = JSON.parse(jsonStr);
    const parsed = ReviewOutputSchema.parse(raw);

    const pillarScores = parsed.pillar_scores as Record<string, PillarScore>;
    const twelveFactorFindings = parsed.twelve_factor_findings.map(f => ({
      factor: f.factor,
      compliant: f.status === 'pass',
      notes: f.note,
    })) as TwelveFactorFinding[];

    const amendments = [
      createAmendment({
        session_id: ctx.session_id,
        turn_number: ctx.turn,
        agent_id: this.agentId,
        section_path: 'analysis.pillar_scores',
        operation: 'update',
        before_summary: `readiness: ${bb.analysis.overall_readiness_score}`,
        after_summary: `readiness: ${parsed.overall_readiness_score}`,
        rationale: 'Review validation completed',
      }),
    ];

    const auditEvents = [
      createAuditEvent({
        session_id: ctx.session_id,
        tenant_id: ctx.tenant_id,
        turn: ctx.turn,
        eventType: 'review_validation.completed',
        actor_type: 'agent',
        actor_id: this.agentId,
        payload: {
          overall_readiness_score: parsed.overall_readiness_score,
          human_gate_required: parsed.human_gate_required,
          tokens_used: response.usage.totalTokens,
        },
      }),
    ];

    return {
      analysis: {
        pillar_scores: pillarScores as Partial<Record<Pillar, PillarScore>>,
        twelve_factor_findings: twelveFactorFindings,
        overall_readiness_score: parsed.overall_readiness_score,
        status: 'complete',
      },
      amendments,
      audit_events: auditEvents,
    };
  }
}
