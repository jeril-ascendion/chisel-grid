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
