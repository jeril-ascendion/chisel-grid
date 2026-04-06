'use client';

import { useState } from 'react';

interface HealthMetric {
  label: string;
  value: string | number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  change?: string;
}

interface BillingInfo {
  plan: string;
  status: string;
  nextBillingDate: string;
  monthlyAmount: string;
  paymentMethod: string;
}

// Mock data — in production, fetched from usage-metering and billing APIs
const mockMetrics: HealthMetric[] = [
  { label: 'Uptime', value: '99.95', unit: '%', status: 'healthy', change: '+0.02%' },
  { label: 'API Error Rate', value: '0.12', unit: '%', status: 'healthy', change: '-0.05%' },
  { label: 'Avg Response Time', value: '142', unit: 'ms', status: 'healthy', change: '-8ms' },
  { label: 'Active Users', value: 12, unit: 'users', status: 'healthy', change: '+2' },
];

const mockUsage = {
  aiTokensUsed: 1_234_567,
  aiTokensLimit: 5_000_000,
  contentItems: 247,
  contentLimit: 1_000,
  storageUsedMb: 2_340,
  storageLimit: 10_000,
  audioGenerations: 89,
  usersCount: 12,
  usersLimit: 25,
};

const mockBilling: BillingInfo = {
  plan: 'Professional',
  status: 'Active',
  nextBillingDate: '2026-05-01',
  monthlyAmount: '$199.00',
  paymentMethod: 'Visa ending in 4242',
};

const mockRecentErrors = [
  { timestamp: '2026-04-07 14:23:01', endpoint: 'POST /api/content', status: 500, message: 'Timeout connecting to Aurora' },
  { timestamp: '2026-04-07 12:45:33', endpoint: 'POST /api/ai/generate', status: 429, message: 'Bedrock rate limit exceeded' },
  { timestamp: '2026-04-06 22:10:15', endpoint: 'GET /api/search', status: 503, message: 'Service temporarily unavailable' },
];

function StatusBadge({ status }: { status: 'healthy' | 'warning' | 'critical' }) {
  const colors = {
    healthy: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colors[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${
        status === 'healthy' ? 'bg-green-500' : status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
      }`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function UsageBar({ used, limit, label, unit }: { used: number; limit: number; label: string; unit: string }) {
  const percentage = Math.min(100, (used / limit) * 100);
  const status = percentage > 90 ? 'critical' : percentage > 75 ? 'warning' : 'healthy';
  const barColor = status === 'critical' ? 'bg-red-500' : status === 'warning' ? 'bg-yellow-500' : 'bg-blue-500';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {used.toLocaleString()} / {limit.toLocaleString()} {unit}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={`h-2 rounded-full ${barColor} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>{percentage.toFixed(1)}% used</span>
        <StatusBadge status={status} />
      </div>
    </div>
  );
}

export default function TenantHealthPage() {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tenant Health</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor your platform&apos;s health, usage, and billing status.
          </p>
        </div>
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-xs font-medium ${
                timeRange === range
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Health Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {mockMetrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{metric.label}</span>
              <StatusBadge status={metric.status} />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{metric.value}</span>
              <span className="text-sm text-gray-500">{metric.unit}</span>
            </div>
            {metric.change && (
              <span className={`text-xs ${
                metric.change.startsWith('+') ? 'text-green-500' : 'text-red-500'
              }`}>
                {metric.change} vs last period
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Usage & Billing Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Usage */}
        <div className="lg:col-span-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resource Usage</h2>
          <div className="space-y-5">
            <UsageBar
              label="AI Tokens"
              used={mockUsage.aiTokensUsed}
              limit={mockUsage.aiTokensLimit}
              unit="tokens"
            />
            <UsageBar
              label="Content Items"
              used={mockUsage.contentItems}
              limit={mockUsage.contentLimit}
              unit="items"
            />
            <UsageBar
              label="Storage"
              used={mockUsage.storageUsedMb}
              limit={mockUsage.storageLimit}
              unit="MB"
            />
            <UsageBar
              label="Team Members"
              used={mockUsage.usersCount}
              limit={mockUsage.usersLimit}
              unit="users"
            />
          </div>
        </div>

        {/* Billing */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Billing</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Plan</span>
              <span className="text-sm font-medium text-blue-600">{mockBilling.plan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Status</span>
              <span className="text-sm font-medium text-green-600">{mockBilling.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Monthly</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{mockBilling.monthlyAmount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Next billing</span>
              <span className="text-sm text-gray-900 dark:text-white">{mockBilling.nextBillingDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Payment</span>
              <span className="text-sm text-gray-900 dark:text-white">{mockBilling.paymentMethod}</span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <button className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
              Manage Subscription
            </button>
            <button className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              View Invoices
            </button>
          </div>
        </div>
      </div>

      {/* Recent Errors */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Errors</h2>
        {mockRecentErrors.length === 0 ? (
          <p className="text-sm text-gray-500">No recent errors. All systems operational.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-2 text-left font-medium text-gray-500">Timestamp</th>
                  <th className="pb-2 text-left font-medium text-gray-500">Endpoint</th>
                  <th className="pb-2 text-left font-medium text-gray-500">Status</th>
                  <th className="pb-2 text-left font-medium text-gray-500">Message</th>
                </tr>
              </thead>
              <tbody>
                {mockRecentErrors.map((error, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                    <td className="py-2 text-gray-600 dark:text-gray-400 font-mono text-xs">{error.timestamp}</td>
                    <td className="py-2 text-gray-900 dark:text-white font-mono text-xs">{error.endpoint}</td>
                    <td className="py-2">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                        error.status >= 500
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                      }`}>
                        {error.status}
                      </span>
                    </td>
                    <td className="py-2 text-gray-600 dark:text-gray-400">{error.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
