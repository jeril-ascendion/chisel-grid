import { WorkspaceLayout } from '@/components/workspace/workspace-layout';
import { ChamberSessionSync } from '@/components/workspace/chamber-session-sync';

export const metadata = { title: 'Chamber' };

export default function ChamberPage() {
  return (
    <div className="-m-6 flex h-[calc(100vh-57px)] flex-col">
      <ChamberSessionSync />
      <div className="border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-700 dark:bg-gray-800">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Chamber</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Research, brainstorm, analyse and fine-tune content with AI agents
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <WorkspaceLayout />
      </div>
    </div>
  );
}
