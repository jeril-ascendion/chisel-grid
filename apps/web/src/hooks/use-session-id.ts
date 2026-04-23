'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function useSessionId(): string | null {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const existing = searchParams.get('session');
    if (existing) {
      setSessionId(existing);
      return;
    }
    const fresh =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const params = new URLSearchParams(searchParams.toString());
    params.set('session', fresh);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setSessionId(fresh);
  }, [searchParams, router, pathname]);

  return sessionId;
}
