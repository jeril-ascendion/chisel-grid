'use client';

import { cn } from '@/lib/utils';

export function ChatPanelToggle({
  open,
  onToggle,
  side = 'right',
  width = 380,
  className,
}: {
  open: boolean;
  onToggle: () => void;
  side?: 'right' | 'left';
  width?: number;
  className?: string;
}) {
  const isRight = side === 'right';
  // Right-side chat: button sits at right:width when open (divider), right:0 when closed.
  // Left-side chat: button sits at left:width when open, left:0 when closed.
  const positionStyle = isRight
    ? { right: open ? width : 0 }
    : { left: open ? width : 0 };

  // Chevron points "into" the chat when chat is open (collapse), "out" when closed (expand).
  const showRightChevron = isRight ? !open : open;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={open ? 'Hide chat panel' : 'Show chat panel'}
      aria-expanded={open}
      title={open ? 'Hide chat (Ctrl+J)' : 'Show chat (Ctrl+J)'}
      style={positionStyle}
      className={cn(
        'absolute top-1/2 z-30 -translate-y-1/2',
        'h-12 w-5 flex items-center justify-center',
        'border border-gray-200 dark:border-gray-700',
        'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300',
        'shadow-sm transition-[right,left,background-color] duration-200 ease-out',
        'hover:bg-gray-50 dark:hover:bg-gray-700',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]',
        isRight ? 'rounded-l-md border-r-0' : 'rounded-r-md border-l-0',
        className,
      )}
    >
      {showRightChevron ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      )}
    </button>
  );
}
