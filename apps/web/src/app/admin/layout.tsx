'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/sidebar';
import { AdminBreadcrumbs } from '@/components/admin/breadcrumbs';
import { AdminThemeToggle } from '@/components/admin/admin-theme-toggle';

type Role = 'admin' | 'creator' | 'reader';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string; role?: Role; name?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    try {
      const raw = typeof window !== 'undefined'
        ? window.localStorage.getItem('chiselgrid_session')
        : null;
      if (raw) {
        const cs = JSON.parse(raw) as {
          email?: string;
          role?: Role;
          name?: string;
          groups?: string[];
          expiresAt?: number;
        };
        if (
          cs.expiresAt &&
          cs.expiresAt > Date.now() &&
          (cs.role === 'admin' || cs.role === 'creator' || cs.role === 'reader')
        ) {
          setUser({ email: cs.email, role: cs.role, name: cs.name });
          setLoading(false);
          return;
        }
      }
    } catch {
      // fall through
    }

    fetch('/api/auth/session')
      .then((res) => (res.ok ? res.json() : null))
      .then((session) => {
        if (cancelled) return;
        const role = session?.user?.role as Role | undefined;
        if (!session?.user || (role !== 'admin' && role !== 'creator' && role !== 'reader')) {
          router.replace('/login/');
          return;
        }
        setUser(session.user);
      })
      .catch(() => {
        if (!cancelled) router.replace('/login/');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  const role: Role = user.role ?? 'reader';

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar user={user} role={role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-3">
          <AdminBreadcrumbs />
          <div className="flex items-center gap-3">
            <AdminThemeToggle />
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              role === 'admin'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                : role === 'creator'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'bg-gray-100 dark:bg-gray-700/30 text-gray-600 dark:text-gray-400'
            }`}>
              {role}
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
