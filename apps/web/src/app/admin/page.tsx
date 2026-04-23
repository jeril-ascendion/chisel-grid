import { ContentStatusBoard } from '@/components/admin/content-status-board';
import { DashboardAIUsage } from '@/components/admin/dashboard-ai-usage';
import { DashboardPlatformHealth } from '@/components/admin/dashboard-platform-health';
import { DashboardBilling } from '@/components/admin/dashboard-billing';

export const metadata = { title: 'Content Studio Dashboard' };

export default function AdminDashboard() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Content pipeline, AI usage, platform health and billing.</p>
      </div>

      <ContentStatusBoard />
      <DashboardAIUsage />
      <DashboardPlatformHealth />
      <DashboardBilling />
    </div>
  );
}
