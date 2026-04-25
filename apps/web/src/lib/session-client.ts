/**
 * Browser-side helpers for the authenticated session API.
 *
 * Server is source of truth; sessionStorage stays as a fast-paint cache.
 * Callers are expected to debounce their own write cadence (~1s).
 */

import type { SessionKind, SessionVisibility } from './db/sessions';

export interface ClientSession {
  sessionId: string;
  tenantId: string;
  createdBy: string;
  kind: SessionKind;
  visibility: SessionVisibility;
  title: string | null;
  state: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export async function fetchSession(
  sessionId: string,
): Promise<ClientSession | null> {
  try {
    const res = await fetch(`/api/admin/sessions/${sessionId}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      console.warn('[session-client] fetchSession non-ok:', res.status);
      return null;
    }
    return (await res.json()) as ClientSession;
  } catch (err) {
    console.warn('[session-client] fetchSession failed:', err);
    return null;
  }
}

export interface SaveSessionInput {
  kind: SessionKind;
  state: Record<string, unknown>;
  title?: string | null;
  visibility?: SessionVisibility;
}

export async function saveSession(
  sessionId: string,
  input: SaveSessionInput,
): Promise<ClientSession | null> {
  try {
    const res = await fetch(`/api/admin/sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      if (res.status !== 413) {
        console.warn('[session-client] saveSession non-ok:', res.status);
      }
      return null;
    }
    return (await res.json()) as ClientSession;
  } catch (err) {
    console.warn('[session-client] saveSession failed:', err);
    return null;
  }
}

export async function setSessionVisibility(
  sessionId: string,
  visibility: SessionVisibility,
): Promise<ClientSession | null> {
  try {
    const res = await fetch(`/api/admin/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibility }),
    });
    if (!res.ok) return null;
    return (await res.json()) as ClientSession;
  } catch (err) {
    console.warn('[session-client] setSessionVisibility failed:', err);
    return null;
  }
}
