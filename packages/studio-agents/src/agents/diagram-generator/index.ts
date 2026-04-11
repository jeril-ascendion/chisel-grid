import { z } from 'zod';
import {
  type AgentContext,
  type BlackboardPatch,
  type GeneratedDiagram,
  createAmendment,
  createAuditEvent,
  toTOON,
} from '@chiselgrid/studio-core';
import { StudioBaseAgent } from '../../base/studio-base-agent';
import { DIAGRAM_GENERATOR_SYSTEM_PROMPT } from './prompts/system';

const DiagramOutputSchema = z.object({
  diagrams: z.array(z.object({
    id: z.string(),
    type: z.string(),
    format: z.string(),
    title: z.string(),
    description: z.string(),
    content: z.string(),
    version: z.number(),
    has_pending_assumptions: z.boolean(),
    agent_turn: z.number(),
  })),
});

export class DiagramGeneratorAgent extends StudioBaseAgent {
  readonly agentId = 'diagram_generator' as const;

  protected async execute(ctx: AgentContext): Promise<BlackboardPatch> {
    const bb = ctx.blackboard;
    const bbSummary = toTOON(bb);

    const pendingAssumptionIds = new Set(bb.assumptions.pending.map(a => a.id));
    const componentsWithAssumptions = bb.architecture.components
      .filter(c => c.assumptions.some(a => pendingAssumptionIds.has(a)))
      .map(c => c.name);

    const userMessage = `Generate Mermaid diagrams for this architecture:\n\n${bbSummary}\n\nComponents with pending assumptions: ${componentsWithAssumptions.join(', ') || 'none'}\n\nCurrent turn: ${ctx.turn}`;

    const response = await this.invoke(
      [{ role: 'user', content: userMessage }],
      { system: DIAGRAM_GENERATOR_SYSTEM_PROMPT, temperature: 0.1, maxTokens: 8192 },
    );

    const jsonStr = this.extractJson(response.content);
    const raw: unknown = JSON.parse(jsonStr);
    const parsed = DiagramOutputSchema.parse(raw);

    const diagrams = parsed.diagrams.map(d => ({
      ...d,
      generated_at: new Date().toISOString(),
    })) as GeneratedDiagram[];

    const c4Context = diagrams.find(d => d.type === 'c4_context');
    const sequences = diagrams.filter(d => d.type === 'sequence');
    const additional = diagrams.filter(d => d.type !== 'c4_context' && d.type !== 'sequence');

    const amendments = [
      createAmendment({
        session_id: ctx.session_id,
        turn_number: ctx.turn,
        agent_id: this.agentId,
        section_path: 'diagrams',
        operation: bb.diagrams.status === 'empty' ? 'create' : 'update',
        before_summary: `${bb.diagrams.status}`,
        after_summary: `${diagrams.length} diagrams generated`,
        rationale: 'Diagrams generated from confirmed architecture',
      }),
    ];

    const auditEvents = [
      createAuditEvent({
        session_id: ctx.session_id,
        tenant_id: ctx.tenant_id,
        turn: ctx.turn,
        eventType: 'diagram_generation.completed',
        actor_type: 'agent',
        actor_id: this.agentId,
        payload: {
          diagram_count: diagrams.length,
          types: diagrams.map(d => d.type),
          tokens_used: response.usage.totalTokens,
        },
      }),
    ];

    return {
      diagrams: {
        c4_context: c4Context,
        sequence: sequences,
        additional,
        status: 'complete',
      },
      amendments,
      audit_events: auditEvents,
    };
  }
}
