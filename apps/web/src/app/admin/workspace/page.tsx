import { WorkspaceLayout } from '@/components/workspace/workspace-layout';

export const metadata = { title: 'Content Workspace' };

export default function WorkspacePage() {
  return (
    <div className="-m-6 h-[calc(100vh-57px)]">
      <WorkspaceLayout />
    </div>
  );
}
