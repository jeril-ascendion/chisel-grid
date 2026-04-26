'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { getCognitoSession } from '@/lib/cognito-client';

const UserManagement = dynamic(
  () => import('./user-management').then((m) => m.UserManagement),
  { ssr: false },
);

export function UsersAccessGuard() {
  const [state, setState] = useState<'loading' | 'allowed' | 'denied'>('loading');

  useEffect(() => {
    let cancelled = false;

    const cs = getCognitoSession();
    if (cs) {
      if (cs.role === 'admin') {
        setState('allowed');
      } else {
        setState('denied');
      }
      return;
    }

    fetch('/api/auth/session')
      .then((r) => (r.ok ? r.json() : null))
      .then((session) => {
        if (cancelled) return;
        if (session?.user?.role === 'admin') setState('allowed');
        else setState('denied');
      })
      .catch(() => {
        if (!cancelled) setState('denied');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'loading') {
    return <div className="text-sm text-gray-500">Checking permissions…</div>;
  }

  if (state === 'denied') {
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-900 px-6 py-8 text-center">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-300">Access Denied</h2>
        <p className="text-sm text-red-600 dark:text-red-400 mt-2">
          User management requires admin role.
        </p>
      </div>
    );
  }

  return <UserManagement />;
}
