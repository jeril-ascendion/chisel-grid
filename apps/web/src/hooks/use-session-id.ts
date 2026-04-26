'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export interface UseSessionIdOptions {
  /**
   * If set, when the URL has no `?session=` we first try to restore the
   * caller's most-recently-updated session of this kind. Falls back to a
   * freshly-generated UUID if no session exists or the API call fails.
   */
  restoreKind?: 'grid' | 'chamber' | 'studio';
}

function lastSessionStorageKey(kind: 'grid' | 'chamber' | 'studio'): string {
  // grid → cg.lastGridSession, chamber → cg.lastChamberSession, etc.
  return `cg.last${kind.charAt(0).toUpperCase()}${kind.slice(1)}Session`;
}

export function useSessionId(opts: UseSessionIdOptions = {}): string {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSession = searchParams.get('session');
  const restoreKind = opts.restoreKind;

  const [generated] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  });

  const sessionId = urlSession ?? generated;

  // Persist the active session ID so a sibling navigation (Grid landing →
  // Grid/Architecture) without a ?session= can restore it instead of
  // minting a brand-new session.
  useEffect(() => {
    if (!restoreKind || !urlSession) return;
    try {
      window.localStorage.setItem(lastSessionStorageKey(restoreKind), urlSession);
    } catch {
      // Quota / private mode — silent fallback is fine.
    }
  }, [urlSession, restoreKind]);

  useEffect(() => {
    if (urlSession || !generated) return;
    let cancelled = false;

    const replaceWith = (id: string) => {
      if (cancelled) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set('session', id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    if (!restoreKind) {
      replaceWith(generated);
      return;
    }

    // Local cache first — survives navigation across pages, instant.
    let cached: string | null = null;
    try {
      cached = window.localStorage.getItem(lastSessionStorageKey(restoreKind));
    } catch {
      cached = null;
    }
    if (cached) {
      replaceWith(cached);
      return;
    }

    void (async () => {
      try {
        const res = await fetch(
          `/api/admin/sessions?limit=1&sort=updated_at_desc&kind=${restoreKind}`,
          { cache: 'no-store' },
        );
        if (!res.ok) {
          replaceWith(generated);
          return;
        }
        const data = (await res.json()) as { sessions?: Array<{ sessionId?: string }> };
        const restoredId = data?.sessions?.[0]?.sessionId;
        replaceWith(restoredId ?? generated);
      } catch {
        replaceWith(generated);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [urlSession, searchParams, router, pathname, generated, restoreKind]);

  return sessionId;
}
