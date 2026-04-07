'use client';

import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  // On static S3+CloudFront deployment, /api/auth/session doesn't exist.
  // Disable SessionProvider polling to prevent 403 loops.
  // Auth is handled client-side via cognito-client.ts on the static site.
  return (
    <SessionProvider
      refetchInterval={0}
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
    >
      {children}
    </SessionProvider>
  );
}
