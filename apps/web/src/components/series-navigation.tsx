/**
 * T-19.3 Series Navigation Component
 *
 * Renders navigation between articles in an interview series.
 * Shows part numbers, titles, current position, and prev/next links.
 */

'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface SeriesPart {
  slug: string;
  title: string;
  partNumber: number;
  readTimeMinutes: number;
  audioUrl: string | null;
}

interface SeriesNavigationProps {
  seriesName: string;
  parts: SeriesPart[];
  currentPartNumber: number;
  className?: string;
}

export function SeriesNavigation({
  seriesName,
  parts,
  currentPartNumber,
  className,
}: SeriesNavigationProps) {
  const currentIndex = parts.findIndex((p) => p.partNumber === currentPartNumber);
  const prevPart = currentIndex > 0 ? parts[currentIndex - 1] : null;
  const nextPart = currentIndex < parts.length - 1 ? parts[currentIndex + 1] : null;

  return (
    <div className={cn('rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden', className)}>
      {/* Series Header */}
      <div className="bg-slate-50 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Interview Series
        </div>
        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">
          {seriesName}
        </div>
        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Part {currentPartNumber} of {parts.length}
        </div>
      </div>

      {/* Part List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {parts.map((part) => {
          const isCurrent = part.partNumber === currentPartNumber;
          return (
            <Link
              key={part.slug}
              href={`/articles/${part.slug}`}
              className={cn(
                'flex items-center gap-3 px-4 py-3 transition-colors',
                isCurrent
                  ? 'bg-blue-50 dark:bg-blue-950/30'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
              )}
            >
              <div
                className={cn(
                  'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                  isCurrent
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
                )}
              >
                {part.partNumber}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    'text-sm truncate',
                    isCurrent
                      ? 'font-semibold text-blue-700 dark:text-blue-400'
                      : 'text-slate-700 dark:text-slate-300',
                  )}
                >
                  {part.title}
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {part.readTimeMinutes} min read{part.audioUrl ? ' · Audio' : ''}
                </div>
              </div>
              {isCurrent && (
                <div className="flex-shrink-0 text-xs font-medium text-blue-600 dark:text-blue-400">
                  Current
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Prev / Next Navigation */}
      <div className="flex border-t border-slate-200 dark:border-slate-700">
        {prevPart ? (
          <Link
            href={`/articles/${prevPart.slug}`}
            className="flex-1 px-4 py-3 text-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-r border-slate-200 dark:border-slate-700"
          >
            ← Previous
          </Link>
        ) : (
          <div className="flex-1 px-4 py-3 text-center text-sm text-slate-300 dark:text-slate-600 border-r border-slate-200 dark:border-slate-700">
            ← Previous
          </div>
        )}
        {nextPart ? (
          <Link
            href={`/articles/${nextPart.slug}`}
            className="flex-1 px-4 py-3 text-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            Next →
          </Link>
        ) : (
          <div className="flex-1 px-4 py-3 text-center text-sm text-slate-300 dark:text-slate-600">
            Next →
          </div>
        )}
      </div>
    </div>
  );
}

export default SeriesNavigation;
