import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { WorkspaceLayout } from '@/components/workspace/workspace-layout';

export const metadata = { title: 'Content Workspace' };

export default async function WorkspacePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return <WorkspaceLayout />;
}
