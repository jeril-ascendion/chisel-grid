import { AIUsagePanel } from '@/components/admin/ai-usage-panel';

export const metadata = { title: 'AI Usage' };

export default function AIUsagePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Usage</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor AI token consumption and costs</p>
      </div>
      <AIUsagePanel />
    </div>
  );
}
