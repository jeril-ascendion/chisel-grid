import { EventEmitter } from 'events';

const sessionBus = new Map<string, EventEmitter>();

export function getSessionEmitter(sessionId: string): EventEmitter {
  if (!sessionBus.has(sessionId)) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(20);
    sessionBus.set(sessionId, emitter);
  }
  return sessionBus.get(sessionId)!;
}

export function removeSessionEmitter(sessionId: string): void {
  sessionBus.delete(sessionId);
}

export type SessionEvent =
  | { type: 'agent_started'; agentId: string; agentName: string; timestamp: string }
  | { type: 'agent_completed'; agentId: string; agentName: string; durationMs: number; timestamp: string }
  | { type: 'agent_failed'; agentId: string; error: string; timestamp: string }
  | { type: 'pipeline_complete'; turnNumber: number; generationReady: boolean; timestamp: string }
  | { type: 'pipeline_blocked'; blockers: string[]; timestamp: string };
