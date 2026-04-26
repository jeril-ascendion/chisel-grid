'use client';

/**
 * Multi-tab auth sync via BroadcastChannel.
 *
 * Same browser, same origin only — does NOT cross devices/browsers.
 * That is the correct scope: we want every tab of the same user's
 * browser to share auth state without round-tripping the network.
 *
 *   Tab A signs in  → posts SIGNED_IN  → Tab B does router.refresh()
 *   Tab A signs out → posts SIGNED_OUT → Tab B calls NextAuth signOut()
 *
 * The receiver never re-broadcasts, so SIGNED_OUT cannot loop:
 *   - SIGNED_IN  is only posted by the login form on a successful signIn
 *   - SIGNED_OUT is only posted by the header's Sign Out handler
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

const CHANNEL_NAME = 'chiselgrid_auth';

export type AuthSyncMessage =
  | { type: 'SIGNED_IN' }
  | { type: 'SIGNED_OUT' };

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (typeof BroadcastChannel === 'undefined') return null;
  return new BroadcastChannel(CHANNEL_NAME);
}

/**
 * Post `SIGNED_IN`. Call from the login flow after `signIn()` resolves
 * successfully so other tabs pick up the new session via router.refresh.
 */
export function broadcastSignedIn(): void {
  const ch = getChannel();
  if (!ch) return;
  try {
    ch.postMessage({ type: 'SIGNED_IN' } satisfies AuthSyncMessage);
  } finally {
    ch.close();
  }
}

/**
 * Post `SIGNED_OUT`. Call from the Sign Out handler BEFORE `signOut()` —
 * other tabs will then call signOut themselves to clear their cookies.
 */
export function broadcastSignedOut(): void {
  const ch = getChannel();
  if (!ch) return;
  try {
    ch.postMessage({ type: 'SIGNED_OUT' } satisfies AuthSyncMessage);
  } finally {
    ch.close();
  }
}

/**
 * Mount once at the top of any client tree that should react to auth
 * events from sibling tabs. The hook is idempotent — multiple instances
 * are safe but redundant; prefer mounting once at the layout level.
 */
export function useAuthSync(): void {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof BroadcastChannel === 'undefined') return;

    const ch = new BroadcastChannel(CHANNEL_NAME);
    const onMessage = (ev: MessageEvent<AuthSyncMessage>) => {
      const data = ev.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'SIGNED_IN') {
        // Send the receiving tab to /admin so the user lands in the
        // workspace, not on whatever public page they had open.
        router.push('/admin');
        return;
      }
      if (data.type === 'SIGNED_OUT') {
        // Clear NextAuth cookie + redirect to /login. The signOut() call
        // does not re-broadcast (only the user-initiated handler does),
        // so this cannot loop.
        void signOut({ redirect: true, callbackUrl: '/login' });
      }
    };
    ch.addEventListener('message', onMessage);
    return () => {
      ch.removeEventListener('message', onMessage);
      ch.close();
    };
  }, [router]);
}
