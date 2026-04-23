// CRITICAL AUTH GUARD - DO NOT REMOVE
// See CLAUDE.md rule: Admin routes must ALWAYS check auth() and redirect to /login.
// This check has been removed by mistake multiple times - it must stay here permanently.
// Test: curl https://www.chiselgrid.com/admin must return 307 redirect not 200.
// Do NOT convert this file to a client component ('use client'). useSession() here
// causes the page shell to render before the redirect, leaking 200 responses.
// Middleware at apps/web/src/middleware.ts is the second layer — both must exist.

import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AdminShell } from '@/components/admin/admin-shell';

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
    <AdminShell user={user} role={role}>
      {children}
    </AdminShell>
  );
}
