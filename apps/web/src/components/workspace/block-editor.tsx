'use client';

import { useWorkspaceStore } from '@/stores/workspace-store';
import type { ContentBlock } from '@chiselgrid/types';
import { cn } from '@/lib/utils';

export function BlockEditor() {
  const blocks = useWorkspaceStore((s) => s.blocks);
  const updateBlock = useWorkspaceStore((s) => s.updateBlock);
  const removeBlock = useWorkspaceStore((s) => s.removeBlock);
  const moveBlock = useWorkspaceStore((s) => s.moveBlock);
  const insertBlock = useWorkspaceStore((s) => s.insertBlock);

  return (
    <div className="space-y-2 max-w-3xl mx-auto">
      {blocks.map((block, i) => (
        <div key={i} className="group relative rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => i > 0 && moveBlock(i, i - 1)} className="rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100" disabled={i === 0} aria-label="Move up">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6"/></svg>
            </button>
            <button onClick={() => i < blocks.length - 1 && moveBlock(i, i + 1)} className="rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100" disabled={i === blocks.length - 1} aria-label="Move down">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <button onClick={() => removeBlock(i)} className="rounded p-1 text-gray-400 hover:text-red-500 hover:bg-red-50" aria-label="Remove block">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 px-3 py-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">{block.type}</span>
            {block.type === 'heading' && <span className="text-[10px] text-gray-400">H{block.level}</span>}
            {block.type === 'code' && <span className="text-[10px] text-gray-400">{block.language}</span>}
          </div>
          <BlockContentEditor block={block} onChange={(updated) => updateBlock(i, updated)} />
        </div>
      ))}
      <AddBlockButton onAdd={(block) => insertBlock(blocks.length, block)} />
    </div>
  );
}

function BlockContentEditor({ block, onChange }: { block: ContentBlock; onChange: (b: ContentBlock) => void }) {
  switch (block.type) {
    case 'text':
      return <textarea value={block.content} onChange={(e) => onChange({ ...block, content: e.target.value })} className="w-full resize-none bg-transparent px-3 py-2 text-sm outline-none min-h-[80px]" rows={4} />;
    case 'heading':
      return <input type="text" value={block.content} onChange={(e) => onChange({ ...block, content: e.target.value })} className={cn('w-full bg-transparent px-3 py-2 outline-none font-semibold', block.level === 1 && 'text-xl', block.level === 2 && 'text-lg', block.level === 3 && 'text-base', block.level === 4 && 'text-sm')} />;
    case 'code':
      return (
        <div>
          <div className="flex gap-2 px-3 py-1 border-b border-gray-100 dark:border-gray-700">
            <input type="text" value={block.language} onChange={(e) => onChange({ ...block, language: e.target.value })} className="bg-transparent text-xs text-gray-500 outline-none w-24" placeholder="language" />
            <input type="text" value={block.filename ?? ''} onChange={(e) => onChange({ ...block, filename: e.target.value || undefined })} className="bg-transparent text-xs text-gray-500 outline-none flex-1" placeholder="filename (optional)" />
          </div>
          <textarea value={block.content} onChange={(e) => onChange({ ...block, content: e.target.value })} className="w-full resize-none bg-[#1e1e2e] text-[#cdd6f4] font-mono text-xs px-3 py-2 outline-none min-h-[100px]" rows={6} />
        </div>
      );
    case 'callout':
      return (
        <div>
          <select value={block.variant} onChange={(e) => onChange({ ...block, variant: e.target.value as 'info' | 'warning' | 'danger' | 'success' })} className="bg-transparent text-xs text-gray-500 px-3 py-1 outline-none border-b border-gray-100 dark:border-gray-700 w-full">
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="danger">Danger</option>
            <option value="success">Success</option>
          </select>
          <textarea value={block.content} onChange={(e) => onChange({ ...block, content: e.target.value })} className="w-full resize-none bg-transparent px-3 py-2 text-sm outline-none min-h-[60px]" rows={3} />
        </div>
      );
    case 'diagram':
      return (
        <div>
          <textarea value={block.content} onChange={(e) => onChange({ ...block, content: e.target.value })} className="w-full resize-none bg-transparent font-mono text-xs px-3 py-2 outline-none min-h-[100px]" rows={6} placeholder="Mermaid diagram code..." />
          {block.caption !== undefined && <input type="text" value={block.caption} onChange={(e) => onChange({ ...block, caption: e.target.value })} className="w-full bg-transparent text-xs text-gray-500 px-3 py-1 outline-none border-t border-gray-100 dark:border-gray-700" placeholder="Caption" />}
        </div>
      );
    default:
      return null;
  }
}

function AddBlockButton({ onAdd }: { onAdd: (block: ContentBlock) => void }) {
  const blockTypes: Array<{ label: string; block: ContentBlock }> = [
    { label: 'Text', block: { type: 'text', content: '' } },
    { label: 'H2', block: { type: 'heading', level: 2, content: '' } },
    { label: 'Code', block: { type: 'code', language: 'typescript', content: '' } },
    { label: 'Callout', block: { type: 'callout', variant: 'info', content: '' } },
    { label: 'Diagram', block: { type: 'diagram', diagramType: 'mermaid', content: '' } },
  ];

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <span className="text-xs text-gray-400">Add:</span>
      {blockTypes.map((bt) => (
        <button key={bt.label} onClick={() => onAdd(bt.block)} className="rounded-md border border-dashed border-gray-300 dark:border-gray-600 px-3 py-1 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
          + {bt.label}
        </button>
      ))}
    </div>
  );
}
