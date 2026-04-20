'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Client-side redirect for already-authenticated users.
 * Calls /api/auth/session once; does NOT use useSession() to avoid polling loops.
 */
export function AuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((session) => {
        if (session?.user) {
          router.replace('/admin');
        }
      })
      .catch(() => {
        // session API unavailable — stay on login
      });
  }, [router]);

  return null;
}
