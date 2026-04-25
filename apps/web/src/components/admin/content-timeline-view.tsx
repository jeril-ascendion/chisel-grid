'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ContentTypeBadge } from './content-type-badge';

interface TimelineItem {
  id: string;
  title: string;
  status: string;
  contentType: string;
  category: string;
  updatedAt: string;
  publishedAt: string | null;
}

type Granularity = 'month' | 'week';

function pickDate(item: TimelineItem): Date {
  const ts = item.publishedAt ?? item.updatedAt;
  return new Date(ts);
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function isoWeekKey(d: Date): string {
  // ISO week: shift to Thursday of same week, year + week ordinal of that day.
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function formatGroupLabel(key: string, granularity: Granularity): string {
  if (granularity === 'month') {
    const [y, m] = key.split('-');
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }
  return key;
}

export function ContentTimelineView() {
  const router = useRouter();
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [granularity, setGranularity] = useState<Granularity>('month');

  useEffect(() => {
    fetch('/api/admin/content?status=all')
      .then((r) => r.json())
      .then((data) => setItems((data.items ?? []) as TimelineItem[]))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => {
    const buckets = new Map<string, TimelineItem[]>();
    for (const item of items) {
      const d = pickDate(item);
      if (Number.isNaN(d.getTime())) continue;
      const key = granularity === 'month' ? monthKey(d) : isoWeekKey(d);
      const arr = buckets.get(key) ?? [];
      arr.push(item);
      buckets.set(key, arr);
    }
    const keys = Array.from(buckets.keys()).sort().reverse();
    return keys.map((key) => ({
      key,
      label: formatGroupLabel(key, granularity),
      items: (buckets.get(key) ?? []).sort(
        (a, b) => pickDate(b).getTime() - pickDate(a).getTime(),
      ),
    }));
  }, [items, granularity]);

  if (loading) {
    return <div className="text-sm text-gray-500">Loading timeline...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500" aria-live="polite">
          {items.length} item{items.length === 1 ? '' : 's'}
        </div>
        <div
          className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1"
          role="tablist"
          aria-label="Granularity"
        >
          {(['month', 'week'] as const).map((g) => (
            <button
              key={g}
              role="tab"
              aria-selected={granularity === g}
              onClick={() => setGranularity(g)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium',
                granularity === g
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
              )}
            >
              {g === 'month' ? 'Month' : 'Week'}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center text-sm text-gray-400">
          No articles to show on the timeline.
        </div>
      )}

      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.key} className="grid grid-cols-[160px_1fr] gap-4">
            <div className="pt-2">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">{group.label}</div>
              <div className="text-xs text-gray-500">
                {group.items.length} item{group.items.length === 1 ? '' : 's'}
              </div>
            </div>
            <div className="border-l border-gray-200 dark:border-gray-700 pl-4 space-y-2">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  data-tl-card
                  onClick={() => router.push(`/admin/content/${item.id}/edit`)}
                  className="w-full text-left rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-sm text-gray-900 dark:text-white">{item.title}</div>
                    <ContentTypeBadge contentType={item.contentType} />
                  </div>
                  <div className="mt-1 text-xs text-gray-500 flex items-center gap-2">
                    <span>{item.category || '—'}</span>
                    <span>·</span>
                    <span>{pickDate(item).toLocaleDateString()}</span>
                    <span>·</span>
                    <span>{item.status.replace('_', ' ')}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
