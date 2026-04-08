'use client';

import { useWorkspaceStore } from '@/stores/workspace-store';
import { ChatPanel } from './chat-panel';
import { PreviewPanel } from './preview-panel';
import { AgentTimeline } from './agent-timeline';
import { SEOPanel } from './seo-panel';
import { SubmitForm } from './submit-form';
import { cn } from '@/lib/utils';

export function WorkspaceLayout() {
  const pipelineStatus = useWorkspaceStore((s) => s.pipelineStatus);
  const blocks = useWorkspaceStore((s) => s.blocks);

  return (
    <div className="flex h-full overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Left pane: Chat + Agent Timeline */}
      <div className="flex w-[480px] shrink-0 flex-col border-r border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            AI Content Studio
          </h2>
          <PipelineStatusBadge status={pipelineStatus} />
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
          <AgentTimeline />
          <ChatPanel />
        </div>
      </div>

      {/* Right pane: Preview + SEO + Submit */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Content Preview
          </h2>
          <span className="text-xs text-gray-500">
            {blocks.length} blocks
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <PreviewPanel />
        </div>
        <SEOPanel />
        <SubmitForm />
      </div>
    </div>
  );
}

function PipelineStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    idle: 'bg-gray-100 text-gray-600',
    writing: 'bg-blue-100 text-blue-700',
    reviewing: 'bg-yellow-100 text-yellow-700',
    revising: 'bg-orange-100 text-orange-700',
    seo: 'bg-purple-100 text-purple-700',
    human_review: 'bg-pink-100 text-pink-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    published: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', colors[status] ?? colors.idle)}>
      {status.replace('_', ' ')}
    </span>
  );
}
