'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';

export function HeroCta() {
  const { data: session, status } = useSession();

  if (status === 'loading') return null;

  if (status === 'authenticated' && session?.user) {
    const href = session.user.role === 'admin' ? '/admin' : session.user.role === 'creator' ? '/creator' : '/admin';
    const label = session.user.role === 'admin' ? 'Go to Dashboard' : session.user.role === 'creator' ? 'My Articles' : 'Go to Dashboard';
    return (
      <div className="mt-6 text-center">
        <Link
          href={href}
          className="inline-flex items-center rounded-md bg-gray-800 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-900 transition-colors"
        >
          {label}
        </Link>
      </div>
    );
  }

  return null;
}
