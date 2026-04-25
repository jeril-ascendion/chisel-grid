/**
 * Browser-side helpers for the authenticated session API.
 *
 * Server is source of truth; sessionStorage stays as a fast-paint cache.
 * Callers are expected to debounce their own write cadence (~1s).
 */

import { useEffect, useRef } from 'react';
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

/**
 * Multi-tab sync — polls the server every `intervalMs` while the tab is
 * visible. Calls `onRemoteUpdate(remote)` only when the server copy is
 * strictly newer than the local view (`localUpdatedAtRef.current`).
 *
 * Caller is responsible for:
 *  - keeping `localUpdatedAtRef` current after every successful save (set
 *    it to the server's returned `updatedAt`)
 *  - merging remote state into its local store inside `onRemoteUpdate`
 *
 * Polling pauses when `document.visibilityState === 'hidden'` and resumes
 * on the next visibility change. Cleared on unmount.
 */
export function useSessionPolling(
  sessionId: string | null | undefined,
  localUpdatedAtRef: React.MutableRefObject<string | null>,
  onRemoteUpdate: (remote: ClientSession) => void,
  options?: { intervalMs?: number; enabled?: boolean },
): void {
  const intervalMs = options?.intervalMs ?? 30_000;
  const enabled = options?.enabled ?? true;
  const callbackRef = useRef(onRemoteUpdate);
  callbackRef.current = onRemoteUpdate;

  useEffect(() => {
    if (!enabled || !sessionId) return;
    if (typeof window === 'undefined') return;

    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const tick = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const remote = await fetchSession(sessionId);
        if (cancelled || !remote) return;
        const localTs = localUpdatedAtRef.current
          ? Date.parse(localUpdatedAtRef.current)
          : 0;
        const remoteTs = Date.parse(remote.updatedAt);
        if (Number.isFinite(remoteTs) && remoteTs > localTs) {
          callbackRef.current(remote);
        }
      } catch {
        // ignore — next tick may succeed
      }
    };

    const start = () => {
      if (timer) return;
      timer = setInterval(tick, intervalMs);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Catch up immediately on tab focus, then resume the interval.
        void tick();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, [sessionId, intervalMs, enabled, localUpdatedAtRef]);
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
