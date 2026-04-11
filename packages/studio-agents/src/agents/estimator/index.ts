import { z } from 'zod';
import {
  type AgentContext,
  type BlackboardPatch,
  type WBSItem,
  type ResourceRole,
  createAmendment,
  createAuditEvent,
  toTOON,
} from '@chiselgrid/studio-core';
import { StudioBaseAgent } from '../../base/studio-base-agent';
import { ESTIMATOR_SYSTEM_PROMPT } from './prompts/system';

const EstimatorOutputSchema = z.object({
  wbs: z.array(z.any()),
  total_story_points: z.number(),
  timeline_weeks_low: z.number(),
  timeline_weeks_high: z.number(),
  resource_plan: z.array(z.any()),
  cost_estimate: z.any().optional(),
});

export class EstimatorAgent extends StudioBaseAgent {
  readonly agentId = 'estimator' as const;

  protected async execute(ctx: AgentContext): Promise<BlackboardPatch> {
    const bb = ctx.blackboard;
    const bbSummary = toTOON(bb);

    const userMessage = `Generate WBS and estimates for:\n\n${bbSummary}\n\nJurisdiction: ${bb.intent.jurisdiction.join(', ') || 'not specified'}\nConstraints: ${bb.requirements.constraints.map(c => c.description).join('; ') || 'none'}`;

    const response = await this.invoke(
      [{ role: 'user', content: userMessage }],
      { system: ESTIMATOR_SYSTEM_PROMPT, temperature: 0.2, maxTokens: 8192 },
    );

    const jsonStr = this.extractJson(response.content);
    const raw: unknown = JSON.parse(jsonStr);
    const parsed = EstimatorOutputSchema.parse(raw);

    const wbs = parsed.wbs as WBSItem[];
    const resourcePlan = parsed.resource_plan as ResourceRole[];
    const costEstimate = parsed.cost_estimate ? JSON.stringify(parsed.cost_estimate) : undefined;

    const amendments = [
      createAmendment({
        session_id: ctx.session_id,
        turn_number: ctx.turn,
        agent_id: this.agentId,
        section_path: 'estimates',
        operation: bb.estimates.status === 'empty' ? 'create' : 'update',
        before_summary: `${bb.estimates.wbs.length} WBS items`,
        after_summary: `${wbs.length} WBS items, ${parsed.total_story_points} SP, ${parsed.timeline_weeks_low}-${parsed.timeline_weeks_high} weeks`,
        rationale: 'Estimates generated from confirmed architecture',
      }),
    ];

    const auditEvents = [
      createAuditEvent({
        session_id: ctx.session_id,
        tenant_id: ctx.tenant_id,
        turn: ctx.turn,
        eventType: 'estimation.completed',
        actor_type: 'agent',
        actor_id: this.agentId,
        payload: {
          wbs_count: wbs.length,
          total_story_points: parsed.total_story_points,
          timeline_weeks: `${parsed.timeline_weeks_low}-${parsed.timeline_weeks_high}`,
          tokens_used: response.usage.totalTokens,
        },
      }),
    ];

    return {
      estimates: {
        wbs,
        total_story_points: parsed.total_story_points,
        timeline_weeks_low: parsed.timeline_weeks_low,
        timeline_weeks_high: parsed.timeline_weeks_high,
        resource_plan: resourcePlan,
        cost_estimate: costEstimate,
        status: 'complete',
      },
      amendments,
      audit_events: auditEvents,
    };
  }
}
