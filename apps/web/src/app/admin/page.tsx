import { ContentStatusBoard } from '@/components/admin/content-status-board';

export const metadata = { title: 'Admin Dashboard' };

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of content pipeline and AI usage</p>
      </div>
      <ContentStatusBoard />
    </div>
  );
}
