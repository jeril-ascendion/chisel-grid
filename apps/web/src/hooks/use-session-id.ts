'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function useSessionId(): string {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSession = searchParams.get('session');

  const [generated] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  });

  const sessionId = urlSession ?? generated;

  useEffect(() => {
    if (urlSession || !generated) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('session', generated);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [urlSession, searchParams, router, pathname, generated]);

  return sessionId;
}
