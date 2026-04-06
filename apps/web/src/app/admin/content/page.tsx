import { ContentStatusBoard } from '@/components/admin/content-status-board';
import { ContentList } from '@/components/admin/content-list';

export const metadata = { title: 'All Content' };

export default function ContentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Content</h1>
        <p className="text-sm text-gray-500 mt-1">Manage all articles across all statuses</p>
      </div>
      <ContentStatusBoard />
      <ContentList />
    </div>
  );
}
