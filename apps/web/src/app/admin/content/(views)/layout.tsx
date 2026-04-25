import { ContentViewSwitcher } from '@/components/admin/content-view-switcher';

export default function ContentViewsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Content</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage articles across types, statuses, and timelines
          </p>
        </div>
        <ContentViewSwitcher />
      </div>
      {children}
    </div>
  );
}
