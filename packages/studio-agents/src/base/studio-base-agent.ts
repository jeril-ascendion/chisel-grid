import { BedrockClient, type InvokeOptions, type BedrockResponse } from '@chiselgrid/ai';
import {
  type AgentId,
  type AgentContext,
  type AgentResult,
  type BlackboardPatch,
  type AuditEvent,
  createAuditEvent,
} from '@chiselgrid/studio-core';

export abstract class StudioBaseAgent {
  protected readonly bedrock: BedrockClient;
  abstract readonly agentId: AgentId;

  constructor(bedrock: BedrockClient) {
    this.bedrock = bedrock;
  }

  async run(ctx: AgentContext): Promise<AgentResult> {
    const start = Date.now();
    try {
      const patch = await this.execute(ctx);
      const durationMs = Date.now() - start;

      const auditEvent = createAuditEvent({
        session_id: ctx.session_id,
        tenant_id: ctx.tenant_id,
        turn: ctx.turn,
        eventType: `agent.${this.agentId}.completed`,
        actor_type: 'agent',
        actor_id: this.agentId,
        payload: { duration_ms: durationMs },
      });

      if (!patch.audit_events) {
        patch.audit_events = [];
      }
      patch.audit_events.push(auditEvent);

      return {
        agent_id: this.agentId,
        session_id: ctx.session_id,
        turn: ctx.turn,
        success: true,
        patch,
        duration_ms: durationMs,
      };
    } catch (error: unknown) {
      const durationMs = Date.now() - start;
      const errorMessage = error instanceof Error ? error.message : String(error);

      const auditEvent = createAuditEvent({
        session_id: ctx.session_id,
        tenant_id: ctx.tenant_id,
        turn: ctx.turn,
        eventType: `agent.${this.agentId}.failed`,
        actor_type: 'agent',
        actor_id: this.agentId,
        payload: { error: errorMessage, duration_ms: durationMs },
      });

      return {
        agent_id: this.agentId,
        session_id: ctx.session_id,
        turn: ctx.turn,
        success: false,
        patch: { audit_events: [auditEvent] },
        error: errorMessage,
        duration_ms: durationMs,
      };
    }
  }

  protected abstract execute(ctx: AgentContext): Promise<BlackboardPatch>;

  protected async invoke(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options: InvokeOptions = {},
  ): Promise<BedrockResponse> {
    const modelId = process.env['AWS_BEDROCK_MODEL_ID'];
    return this.bedrock.invoke(messages, {
      ...options,
      ...(modelId !== undefined ? { modelId } : {}),
    });
  }

  protected extractJson(text: string): string {
    const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (fenceMatch?.[1]) {
      return fenceMatch[1].trim();
    }
    const jsonMatch = text.match(/(\{[\s\S]*\})/);
    if (jsonMatch?.[1]) {
      return jsonMatch[1].trim();
    }
    return text.trim();
  }
}
