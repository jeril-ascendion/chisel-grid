'use client';

import { useEffect, useState, useCallback } from 'react';
import { AdminSidebar } from '@/components/admin/sidebar';
import { AdminBreadcrumbs } from '@/components/admin/breadcrumbs';
import { AdminThemeToggle } from '@/components/admin/admin-theme-toggle';

type Role = 'admin' | 'creator' | 'reader';

const STORAGE_KEY = 'chiselgrid_sidebar_collapsed';

export function AdminShell({
  user,
  role,
  children,
}: {
  user: { name?: string | null; email?: string | null };
  role: Role;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === '1') setCollapsed(true);
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === '.') {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar
        user={user}
        role={role}
        collapsed={hydrated && collapsed}
        onToggle={toggle}
      />
      <div className="flex flex-1 flex-col overflow-hidden transition-[margin] duration-200 ease-in-out">
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
