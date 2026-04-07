'use client';

import { SessionProvider } from 'next-auth/react';

function isStaticSite(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'www.chiselgrid.com' || h === 'chiselgrid.com' || h.endsWith('.cloudfront.net');
}

export function Providers({ children }: { children: React.ReactNode }) {
  if (isStaticSite()) {
    // Static S3 deployment: provide an empty session to SessionProvider
    // so useSession() works but no /api/auth/session fetch is made.
    return (
      <SessionProvider
        session={null as never}
        refetchInterval={0}
        refetchOnWindowFocus={false}
        refetchWhenOffline={false}
      >
        {children}
      </SessionProvider>
    );
  }

  // Dev/server mode: normal SessionProvider
  return <SessionProvider>{children}</SessionProvider>;
}
