'use client';

export interface RecentSession {
  id: string;
  title?: string;
  lastPage: string;
  updatedAt: number;
}

const KEY = 'chiselgrid_recent_sessions';
const MAX = 10;

export function readRecentSessions(): RecentSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as RecentSession[]) : [];
  } catch {
    return [];
  }
}

export function upsertRecentSession(session: RecentSession): void {
  if (typeof window === 'undefined') return;
  const list = readRecentSessions();
  const filtered = list.filter((s) => s.id !== session.id);
  const next = [session, ...filtered].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('chiselgrid:recent-sessions-changed'));
  } catch {
    // ignore
  }
}
