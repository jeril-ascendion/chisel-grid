// CRITICAL AUTH GUARD - DO NOT REMOVE
// See CLAUDE.md rule: Admin routes must ALWAYS check auth() and redirect to /login.
// This check has been removed by mistake multiple times - it must stay here permanently.
// Test: curl https://www.chiselgrid.com/admin must return 307 redirect not 200.
// Do NOT convert this file to a client component ('use client'). useSession() here
// causes the page shell to render before the redirect, leaking 200 responses.
// Middleware at apps/web/src/middleware.ts is the second layer — both must exist.

import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AdminSidebar } from '@/components/admin/sidebar';
import { AdminBreadcrumbs } from '@/components/admin/breadcrumbs';
import { AdminThemeToggle } from '@/components/admin/admin-theme-toggle';

type Role = 'admin' | 'creator' | 'reader';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session || !session.user) {
    redirect('/login');
  }

  const sessionUser = session.user as {
    email?: string | null;
    name?: string | null;
    role?: Role;
  };
  const role: Role =
    sessionUser.role === 'admin' ||
    sessionUser.role === 'creator' ||
    sessionUser.role === 'reader'
      ? sessionUser.role
      : 'reader';
  const user = {
    email: sessionUser.email ?? undefined,
    name: sessionUser.name ?? undefined,
    role,
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar user={user} role={role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-3">
          <AdminBreadcrumbs />
          <div className="flex items-center gap-3">
            <AdminThemeToggle />
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                role === 'admin'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  : role === 'creator'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'bg-gray-100 dark:bg-gray-700/30 text-gray-600 dark:text-gray-400'
              }`}
            >
              {role}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
