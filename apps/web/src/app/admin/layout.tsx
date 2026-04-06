import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/sidebar';
import { AdminBreadcrumbs } from '@/components/admin/breadcrumbs';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar user={session.user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-3">
          <AdminBreadcrumbs />
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{session.user.email}</span>
            <span className="rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">
              {session.user.role}
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
