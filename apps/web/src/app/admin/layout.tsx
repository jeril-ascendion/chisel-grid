'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/sidebar';
import { AdminBreadcrumbs } from '@/components/admin/breadcrumbs';
import { AdminThemeToggle } from '@/components/admin/admin-theme-toggle';
import { getCognitoSession } from '@/lib/cognito-client';

function isStaticSite(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'www.chiselgrid.com' || h === 'chiselgrid.com' || h.endsWith('.cloudfront.net');
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string; role?: string; name?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isStaticSite()) {
      // Static S3 deployment: check Cognito localStorage session
      const cs = getCognitoSession();
      if (!cs) {
        router.replace('/login/');
      } else {
        setUser({ email: cs.email, name: cs.name, role: cs.role });
      }
      setLoading(false);
      return;
    }

    // Dev/server mode: check NextAuth session via API
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((session) => {
        if (!session?.user) {
          router.replace('/login/');
        } else {
          setUser(session.user);
        }
      })
      .catch(() => {
        // API not available — try Cognito fallback
        const cs = getCognitoSession();
        if (!cs) {
          router.replace('/login/');
        } else {
          setUser({ email: cs.email, name: cs.name, role: cs.role });
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar user={user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-3">
          <AdminBreadcrumbs />
          <div className="flex items-center gap-3">
            <AdminThemeToggle />
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              user.role === 'admin'
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                : user.role === 'creator'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-700/30 text-gray-600 dark:text-gray-400'
            }`}>
              {user.role}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
