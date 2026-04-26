'use client';

interface Metric {
  label: string;
  value: string;
  hint?: string;
}

const metrics: Metric[] = [
  { label: 'This Month', value: '$~20', hint: 'estimated' },
  { label: 'Aurora', value: 'Stopped when idle' },
  { label: 'Storage', value: '< $1/month' },
];

export function DashboardBilling() {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Health &amp; Billing</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
          >
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{m.label}</div>
            <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              {m.value}
              {m.hint && <span className="ml-1 text-xs font-normal text-gray-500">{m.hint}</span>}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-400 italic">
        * Real billing data via AWS Cost Explorer will be added in a future release.
      </p>
    </section>
  );
}
