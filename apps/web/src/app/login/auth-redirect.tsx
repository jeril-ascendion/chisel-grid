'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCognitoSession } from '@/lib/cognito-client';

/**
 * Client-side redirect for already-authenticated users.
 * Checks both NextAuth session (dev mode) and Cognito localStorage (static site).
 * Does NOT use useSession() to avoid session polling loops.
 */
export function AuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Check Cognito localStorage first (static site)
    const cs = getCognitoSession();
    if (cs) {
      router.replace('/admin');
      return;
    }

    // Check NextAuth session (dev/server mode) via one-time fetch
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((session) => {
        if (session?.user) {
          router.replace('/admin');
        }
      })
      .catch(() => {
        // No session API available (static site) — stay on login
      });
  }, [router]);

  return null;
}
