import { z } from 'zod';
import {
  type AgentContext,
  type BlackboardPatch,
  type TradeOff,
  type ADR,
  type Risk,
  type HumanGate,
  createAmendment,
  createAuditEvent,
  toTOON,
} from '@chiselgrid/studio-core';
import { StudioBaseAgent } from '../../base/studio-base-agent';
import { TRADEOFF_ANALYZER_SYSTEM_PROMPT } from './prompts/system';

const TarkaOutputSchema = z.object({
  tradeoffs: z.array(z.any()),
  adrs: z.array(z.any()),
  risks: z.array(z.any()),
  overall_readiness_score: z.number(),
  architecture_approved: z.boolean(),
  architecture_concerns: z.array(z.string()),
  human_gate_required: z.boolean(),
  human_gate_reason: z.string().nullable(),
});

export class TradeoffAnalyzerAgent extends StudioBaseAgent {
  readonly agentId = 'tradeoff_analyzer' as const;

  protected async execute(ctx: AgentContext): Promise<BlackboardPatch> {
    const bb = ctx.blackboard;
    const bbSummary = toTOON(bb);

    const userMessage = `Review this architecture and challenge every decision:\n\n${bbSummary}\n\nFull architecture:\n${JSON.stringify(bb.architecture, null, 2)}\n\nCriticality tier: ${bb.intent.criticality_tier}\nCompliance tags: ${bb.intent.compliance_tags.join(', ')}`;

    const response = await this.invoke(
      [{ role: 'user', content: userMessage }],
      { system: TRADEOFF_ANALYZER_SYSTEM_PROMPT, temperature: 0.3, maxTokens: 12288 },
    );

    const jsonStr = this.extractJson(response.content);
    const raw: unknown = JSON.parse(jsonStr);
    const parsed = TarkaOutputSchema.parse(raw);

    const tradeoffs = parsed.tradeoffs as TradeOff[];
    const adrs = parsed.adrs as ADR[];
    const risks = parsed.risks as Risk[];

    const amendments = [
      createAmendment({
        session_id: ctx.session_id,
        turn_number: ctx.turn,
        agent_id: this.agentId,
        section_path: 'analysis',
        operation: 'update',
        before_summary: `readiness: ${bb.analysis.overall_readiness_score}`,
        after_summary: `readiness: ${parsed.overall_readiness_score}, ${tradeoffs.length} tradeoffs, ${adrs.length} ADRs`,
        rationale: parsed.architecture_approved
          ? 'Architecture approved by Tarka Sastra review'
          : `Architecture concerns: ${parsed.architecture_concerns.join('; ')}`,
      }),
    ];

    const auditEvents = [
      createAuditEvent({
        session_id: ctx.session_id,
        tenant_id: ctx.tenant_id,
        turn: ctx.turn,
        eventType: 'tradeoff_analysis.completed',
        actor_type: 'agent',
        actor_id: this.agentId,
        payload: {
          architecture_approved: parsed.architecture_approved,
          tradeoffs_count: tradeoffs.length,
          adrs_count: adrs.length,
          risks_count: risks.length,
          overall_readiness_score: parsed.overall_readiness_score,
          tokens_used: response.usage.totalTokens,
        },
      }),
    ];

    return {
      analysis: {
        tradeoffs,
        adrs,
        risks,
        overall_readiness_score: parsed.overall_readiness_score,
        status: parsed.architecture_approved ? 'complete' : 'partial',
      },
      amendments,
      audit_events: auditEvents,
    };
  }
}
