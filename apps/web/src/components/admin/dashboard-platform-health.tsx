'use client';

interface Service {
  name: string;
  status: string;
  icon: string;
}

const services: Service[] = [
  { name: 'Aurora Database', status: 'Connected', icon: 'M12 2C6.48 2 2 4.02 2 6.5v11C2 19.98 6.48 22 12 22s10-2.02 10-4.5v-11C22 4.02 17.52 2 12 2z' },
  { name: 'CloudFront CDN', status: 'Active', icon: 'M3 15a4 4 0 0 0 4 4h9a5 5 0 1 0-.1-9.999 5.002 5.002 0 0 0-9.78 2.096A4.001 4.001 0 0 0 3 15z' },
  { name: 'Lambda Function', status: 'Running', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { name: 'Bedrock AI', status: 'Available', icon: 'M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z' },
  { name: 'Authentication', status: 'Healthy', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
  { name: 'Storage (S3)', status: 'Available', icon: 'M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z' },
];

export function DashboardPlatformHealth() {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Platform Health</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <div
            key={s.name}
            className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={s.icon} />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-white">{s.name}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">{s.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-400 italic">
        * Live health monitoring will be added in a future release.
      </p>
    </section>
  );
}
