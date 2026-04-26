'use client';

import { cn } from '@/lib/utils';

export function FloatingSidebarToggle({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={collapsed ? 'Open sidebar' : 'Close sidebar'}
      aria-expanded={!collapsed}
      aria-controls="sidebar-nav"
      title={collapsed ? 'Open sidebar (Ctrl+.)' : 'Close sidebar (Ctrl+.)'}
      className={cn(
        'fixed top-1/2 z-50 flex h-7 w-7 -translate-y-1/2 items-center justify-center',
        'rounded-md border border-gray-200 dark:border-gray-700',
        'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300',
        'shadow-sm transition-[left,background-color] duration-200 ease-out',
        'hover:bg-gray-50 dark:hover:bg-gray-700',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]',
        collapsed ? 'left-[12px]' : 'left-[252px]',
      )}
    >
      {collapsed ? (
        // PanelLeftOpen — lucide-react
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M9 3v18" />
          <path d="m14 9 3 3-3 3" />
        </svg>
      ) : (
        // PanelLeftClose — lucide-react
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M9 3v18" />
          <path d="m16 15-3-3 3-3" />
        </svg>
      )}
    </button>
  );
}
