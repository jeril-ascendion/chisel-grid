'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  CONTENT_VIEWS,
  CONTENT_VIEW_STORAGE_KEY,
  hrefForContentView,
  isValidContentView,
  pathToContentView,
} from '@/lib/content-view';

export function ContentViewSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const active = pathToContentView(pathname);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(CONTENT_VIEW_STORAGE_KEY, active);
  }, [active]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (pathname !== '/admin/content') return;
    const saved = window.localStorage.getItem(CONTENT_VIEW_STORAGE_KEY);
    if (isValidContentView(saved) && saved !== 'table') {
      router.replace(hrefForContentView(saved));
    }
  }, [pathname, router]);

  return (
    <div
      role="tablist"
      aria-label="Content view"
      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1"
    >
      {CONTENT_VIEWS.map((v) => {
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
