import { ContentStatusBoard } from '@/components/admin/content-status-board';
import { ContentTableView } from '@/components/admin/content-table-view';

export const metadata = { title: 'Content' };

export default function ContentTablePage() {
  return (
    <div className="space-y-6">
      <ContentStatusBoard />
      <ContentTableView />
    </div>
  );
}
