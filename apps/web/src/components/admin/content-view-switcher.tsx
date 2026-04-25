'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'cg.adminContentView';
const VIEWS = [
  { id: 'table' as const, label: 'Table', href: '/admin/content' },
  { id: 'board' as const, label: 'Board', href: '/admin/content/board' },
  { id: 'timeline' as const, label: 'Timeline', href: '/admin/content/timeline' },
];
type ViewId = (typeof VIEWS)[number]['id'];

function pathToView(pathname: string): ViewId {
  if (pathname.startsWith('/admin/content/board')) return 'board';
  if (pathname.startsWith('/admin/content/timeline')) return 'timeline';
  return 'table';
}

function isValidView(v: string | null): v is ViewId {
  return v === 'table' || v === 'board' || v === 'timeline';
}

export function ContentViewSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const active = pathToView(pathname);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, active);
  }, [active]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (pathname !== '/admin/content') return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isValidView(saved) && saved !== 'table') {
      const target = VIEWS.find((v) => v.id === saved)!.href;
      router.replace(target);
    }
  }, [pathname, router]);

  return (
    <div
      role="tablist"
      aria-label="Content view"
      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1"
    >
      {VIEWS.map((v) => {
        const isActive = v.id === active;
        return (
          <Link
            key={v.id}
            href={v.href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              isActive
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
            )}
          >
            {v.label}
          </Link>
        );
      })}
    </div>
  );
}
