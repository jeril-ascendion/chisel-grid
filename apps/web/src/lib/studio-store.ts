import {
  type DesignBlackboard,
  createBlackboard,
} from '@chiselgrid/studio-core';

export interface StudioWorkspace {
  id: string;
  tenant_id: string;
  owner_id: string;
  name: string;
  description: string;
  domain: string;
  jurisdiction_tags: string[];
  created_at: string;
  updated_at: string;
}

export interface StudioGrid {
  id: string;
  workspace_id: string;
  tenant_id: string;
  name: string;
  client_name: string;
  client_industry: string;
  project_type: string;
  description: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface StudioSession {
  id: string;
  grid_id: string;
  workspace_id: string;
  tenant_id: string;
  created_by: string;
  status: string;
  turn_count: number;
  blackboard: DesignBlackboard;
  created_at: string;
  updated_at: string;
}

export interface StudioTurn {
  id: string;
  session_id: string;
  turn_number: number;
  role: 'user' | 'assistant' | 'agent';
  agent_id?: string;
  content: string;
  created_at: string;
}

const workspaces = new Map<string, StudioWorkspace>();
const grids = new Map<string, StudioGrid>();
const sessions = new Map<string, StudioSession>();
const turns = new Map<string, StudioTurn[]>();

export function listWorkspaces(tenantId: string): StudioWorkspace[] {
  return [...workspaces.values()].filter(w => w.tenant_id === tenantId);
}

export function getWorkspace(id: string): StudioWorkspace | undefined {
  return workspaces.get(id);
}

export function createWorkspace(ws: StudioWorkspace): StudioWorkspace {
  workspaces.set(ws.id, ws);
  return ws;
}

export function listGrids(workspaceId: string): StudioGrid[] {
  return [...grids.values()].filter(g => g.workspace_id === workspaceId);
}

export function getGrid(id: string): StudioGrid | undefined {
  return grids.get(id);
}

export function createGrid(grid: StudioGrid): StudioGrid {
  grids.set(grid.id, grid);
  return grid;
}

export function getSession(id: string): StudioSession | undefined {
  return sessions.get(id);
}

export function createSession(session: StudioSession): StudioSession {
  sessions.set(session.id, session);
  turns.set(session.id, []);
  return session;
}

export function updateSession(id: string, updates: Partial<StudioSession>): StudioSession | undefined {
  const existing = sessions.get(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
  sessions.set(id, updated);
  return updated;
}

export function listSessionsForGrid(gridId: string): StudioSession[] {
  return [...sessions.values()].filter(s => s.grid_id === gridId);
}

export function listRecentSessions(tenantId: string, limit = 10): StudioSession[] {
  return [...sessions.values()]
    .filter(s => s.tenant_id === tenantId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, limit);
}

export function addTurn(turn: StudioTurn): void {
  const list = turns.get(turn.session_id) ?? [];
  list.push(turn);
  turns.set(turn.session_id, list);
}

export function getTurns(sessionId: string): StudioTurn[] {
  return turns.get(sessionId) ?? [];
}
