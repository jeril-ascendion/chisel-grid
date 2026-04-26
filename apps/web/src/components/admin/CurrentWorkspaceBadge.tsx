'use client';

import { useCurrentWorkspace } from './WorkspaceSwitcher';

export function CurrentWorkspaceBadge({ className }: { className?: string }) {
  const workspace = useCurrentWorkspace();
  if (!workspace) return null;
  return (
    <span
      className={
        className ??
        'inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 text-[11px] text-gray-600 dark:text-gray-300'
      }
      title={
        [workspace.clientName, workspace.projectName].filter(Boolean).join(' · ') ||
        workspace.description ||
        undefined
      }
    >
      <span className="text-[10px] uppercase tracking-wider text-gray-400">Workspace</span>
      <span className="font-medium text-gray-900 dark:text-white">{workspace.name}</span>
    </span>
  );
}
