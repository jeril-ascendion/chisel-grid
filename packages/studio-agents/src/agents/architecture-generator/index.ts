import { z } from 'zod';
import {
  type AgentContext,
  type BlackboardPatch,
  type Component,
  type Relationship,
  type ArchitecturalDecision,
  createAmendment,
  createAuditEvent,
  toTOON,
} from '@chiselgrid/studio-core';
import { StudioBaseAgent } from '../../base/studio-base-agent';
import { ARCHITECTURE_GENERATOR_SYSTEM_PROMPT } from './prompts/system';

const ArchGenOutputSchema = z.object({
  architecture_options: z.array(z.object({
    option_id: z.string(),
    option_title: z.string(),
    option_rationale: z.string(),
    option_risks: z.array(z.string()),
    components: z.array(z.any()),
    relationships: z.array(z.any()),
  })),
  recommended_option: z.string(),
  recommendation_rationale: z.string(),
  architectural_decisions: z.array(z.any()),
});

export class ArchitectureGeneratorAgent extends StudioBaseAgent {
  readonly agentId = 'architecture_generator' as const;

  protected async execute(ctx: AgentContext): Promise<BlackboardPatch> {
    const bb = ctx.blackboard;
    const userMessage = this.buildUserMessage(ctx);

    const response = await this.invoke(
      [{ role: 'user', content: userMessage }],
      { system: ARCHITECTURE_GENERATOR_SYSTEM_PROMPT, temperature: 0.15, maxTokens: 12288 },
    );

    const jsonStr = this.extractJson(response.content);
    const raw: unknown = JSON.parse(jsonStr);
    const parsed = ArchGenOutputSchema.parse(raw);

    // Select recommended option
    const recommended = parsed.architecture_options.find(o => o.option_id === parsed.recommended_option)
      ?? parsed.architecture_options[0];

    if (!recommended) {
      throw new Error('Architecture generator returned no options');
    }

    const components = recommended.components as Component[];
    const relationships = recommended.relationships as Relationship[];
    const decisions = parsed.architectural_decisions as ArchitecturalDecision[];

    const amendments = [
      createAmendment({
        session_id: ctx.session_id,
        turn_number: ctx.turn,
        agent_id: this.agentId,
        section_path: 'architecture',
        operation: bb.architecture.components.length === 0 ? 'create' : 'update',
        before_summary: `${bb.architecture.components.length} components`,
        after_summary: `${components.length} components, ${relationships.length} relationships`,
        rationale: parsed.recommendation_rationale,
      }),
    ];

    const auditEvents = [
      createAuditEvent({
        session_id: ctx.session_id,
        tenant_id: ctx.tenant_id,
        turn: ctx.turn,
        eventType: 'architecture_generation.completed',
        actor_type: 'agent',
        actor_id: this.agentId,
        payload: {
          options_generated: parsed.architecture_options.length,
          recommended_option: parsed.recommended_option,
          component_count: components.length,
          relationship_count: relationships.length,
          tokens_used: response.usage.totalTokens,
        },
      }),
    ];

    return {
      architecture: {
        components,
        relationships,
        decisions,
        status: 'complete',
      },
      amendments,
      audit_events: auditEvents,
    };
  }

  private buildUserMessage(ctx: AgentContext): string {
    const bb = ctx.blackboard;
    const bbSummary = toTOON(bb);

    let msg = `Design an architecture based on the following blackboard state:\n\n${bbSummary}`;

    if (bb.architecture.components.length > 0) {
      msg += `\n\nExisting components (extend, do not replace):\n${JSON.stringify(bb.architecture.components, null, 2)}`;
    }

    return msg;
  }
}
