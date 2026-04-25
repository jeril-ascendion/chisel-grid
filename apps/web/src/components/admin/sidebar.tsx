'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { permissions, type Permission } from '@/lib/auth/roles';
import { readRecentSessions, type RecentSession } from '@/lib/recent-sessions';

const SESSION_AWARE_PREFIXES = ['/admin/chamber', '/admin/grid', '/admin/studio'];

type Role = 'admin' | 'creator' | 'reader';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  requires?: Permission;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/admin', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { label: 'Content Queue', href: '/admin/queue', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
      { label: 'All Content', href: '/admin/content', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    ],
  },
  {
    label: 'Content Studio',
    items: [
      { label: 'Chamber', href: '/admin/chamber', icon: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z', requires: 'canUseWorkspace' },
      { label: 'Grid', href: '/admin/grid', icon: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z', requires: 'canUseWorkspace' },
      { label: 'Studio', href: '/admin/studio', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z', requires: 'canUseWorkspace' },
      { label: 'Knowledge Graph', href: '/admin/knowledge-graph', icon: 'M5 7a2 2 0 100-4 2 2 0 000 4zm14 0a2 2 0 100-4 2 2 0 000 4zM5 21a2 2 0 100-4 2 2 0 000 4zm14 0a2 2 0 100-4 2 2 0 000 4zm-7-7a2 2 0 100-4 2 2 0 000 4zm-5-3l3.5-2M16.5 6L13 8m0 8l3.5 2M7 18l3.5-2' },
    ],
  },
  {
    items: [
      { label: 'Users', href: '/admin/users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', requires: 'canManageUsers' },
      { label: 'Categories', href: '/admin/categories', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z', requires: 'canManageCategories' },
      { label: 'Tenant Settings', href: '/admin/tenant', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', requires: 'canManageTenantSettings' },
    ],
  },
];

export function AdminSidebar({
  user,
  role,
  collapsed,
  onToggle,
}: {
  user: { name?: string | null; email?: string | null };
  role: Role;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSessionId = searchParams.get('session');
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);

  useEffect(() => {
    const load = () => setRecentSessions(readRecentSessions());
    load();
    window.addEventListener('chiselgrid:recent-sessions-changed', load);
    window.addEventListener('storage', load);
    return () => {
      window.removeEventListener('chiselgrid:recent-sessions-changed', load);
      window.removeEventListener('storage', load);
    };
  }, []);

  const hrefFor = (item: NavItem): string => {
    if (!currentSessionId) return item.href;
    if (!SESSION_AWARE_PREFIXES.some((p) => item.href === p || item.href.startsWith(p + '/'))) {
      return item.href;
    }
    return `${item.href}?session=${currentSessionId}`;
  };

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.requires || permissions[role][item.requires]),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-200 ease-in-out overflow-hidden',
        collapsed ? 'w-14' : 'w-64',
      )}
    >
      <div
        className={cn(
          'flex items-center border-b border-gray-200 dark:border-gray-700 py-3',
          collapsed ? 'justify-center px-2' : 'px-4',
        )}
      >
        <Link
          href="/admin"
          className={cn(
            'flex items-center gap-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
            collapsed ? 'p-1' : 'flex-1 -mx-1 px-1 py-0.5',
          )}
          aria-label="ChiselGrid Content Studio"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">
            CG
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                ChiselGrid
              </div>
              <div className="text-xs text-gray-500 truncate">Content Studio</div>
            </div>
          )}
        </Link>
      </div>

      <nav
        className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-4',
          collapsed ? 'px-1.5' : 'px-3',
        )}
      >
        {visibleSections.map((section, idx) => (
          <div key={section.label ?? `section-${idx}`} className="space-y-1">
            {section.label && !collapsed && (
              <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {section.label}
              </div>
            )}
            {section.label && collapsed && idx > 0 && (
              <div className="mx-2 my-2 border-t border-gray-200 dark:border-gray-700" />
            )}
            {section.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));

              if (collapsed) {
                return (
                  <Link
                    key={item.href}
                    href={hrefFor(item)}
                    className={cn(
                      'relative group flex h-10 w-10 items-center justify-center rounded-lg mx-auto transition-colors',
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700',
                    )}
                    aria-label={item.label}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d={item.icon} />
                    </svg>
                    <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded bg-gray-900 dark:bg-gray-700 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-md">
                      {item.label}
                    </span>
                  </Link>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={hrefFor(item)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700',
                  )}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d={item.icon} />
                  </svg>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}

        {!collapsed && recentSessions.length > 0 && (
          <div className="space-y-1">
            <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Recent Sessions
            </div>
            {recentSessions.slice(0, 3).map((s) => (
              <Link
                key={s.id}
                href={`${s.lastPage}?session=${s.id}`}
                className={cn(
                  'flex flex-col gap-0.5 rounded-lg px-3 py-2 text-sm transition-colors',
                  currentSessionId === s.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700',
                )}
              >
                <span className="truncate font-medium">
                  {s.title ||
                    `Session ${new Date(s.updatedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}`}
                </span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                  {new Date(s.updatedAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      {!collapsed && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {user.name ?? user.email}
          </div>
        </div>
      )}
      {collapsed && (
        <div className="border-t border-gray-200 dark:border-gray-700 py-3 flex justify-center">
          <div
            className="h-7 w-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-700 dark:text-gray-200"
            title={user.name ?? user.email ?? undefined}
          >
            {(user.name ?? user.email ?? '?').slice(0, 1).toUpperCase()}
          </div>
        </div>
      )}
    </aside>
  );
}
