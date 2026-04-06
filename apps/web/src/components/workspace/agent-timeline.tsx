'use client';

import { useWorkspaceStore } from '@/stores/workspace-store';
import { cn } from '@/lib/utils';

export function AgentTimeline() {
  const events = useWorkspaceStore((s) => s.agentEvents);

  if (events.length === 0) return null;

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-2 max-h-36 overflow-y-auto">
      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
        Agent Activity
      </h3>
      <div className="space-y-1.5">
        {events.map((evt) => (
          <div key={evt.id} className="flex items-center gap-2 text-xs">
            <StatusDot status={evt.status} />
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {evt.agentName}
            </span>
            <span className="text-gray-500">{evt.message}</span>
            <span className="ml-auto text-gray-400 tabular-nums">
              {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'h-2 w-2 rounded-full shrink-0',
        status === 'running' && 'bg-blue-500 animate-pulse',
        status === 'completed' && 'bg-green-500',
        status === 'failed' && 'bg-red-500',
      )}
    />
  );
}
