'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import {
  BOARD_COLUMNS,
  COLUMN_WRITES,
  statusToColumn,
  type BoardColumnId,
} from '@/lib/status-board-map';
import { ContentTypeBadge } from './content-type-badge';

interface BoardItem {
  id: string;
  title: string;
  status: string;
  contentType: string;
  author: string;
  category: string;
  updatedAt: string;
}

function Card({ item }: { item: BoardItem }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-board-card
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        'cursor-grab rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm shadow-sm hover:shadow transition-shadow',
        isDragging && 'opacity-50',
      )}
      aria-roledescription="Draggable card. Press space or enter to pick up."
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="font-medium text-gray-900 dark:text-white line-clamp-2">{item.title}</div>
        <ContentTypeBadge contentType={item.contentType} />
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
        <span>{item.category || '—'}</span>
        <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
      </div>
      <div className="text-xs text-gray-400 mt-1 truncate">{item.author}</div>
    </div>
  );
}

function Column({
  id,
  label,
  count,
  children,
}: {
  id: BoardColumnId;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-xl border bg-gray-50 dark:bg-gray-900/40 min-h-[300px]',
        isOver
          ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
          : 'border-gray-200 dark:border-gray-700',
      )}
    >
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-3 py-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{label}</h3>
        <span className="text-xs text-gray-500">{count}</span>
      </div>
      <div className="flex-1 space-y-2 p-2 overflow-y-auto">{children}</div>
    </div>
  );
}

export function ContentBoardView() {
  const router = useRouter();
  const [items, setItems] = useState<BoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  useEffect(() => {
    fetch('/api/admin/content?status=all')
      .then((r) => r.json())
      .then((data) => setItems((data.items ?? []) as BoardItem[]))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const grouped = useMemo(() => {
    const map: Record<BoardColumnId, BoardItem[]> = {
      draft: [], in_review: [], approved: [], published: [], archived: [],
    };
    for (const item of items) {
      map[statusToColumn(item.status)].push(item);
    }
    return map;
  }, [items]);

  const onDragEnd = async (e: DragEndEvent) => {
    const cardId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;
    if (!(['draft', 'in_review', 'approved', 'published', 'archived'] as const).includes(overId as BoardColumnId)) return;

    const target = overId as BoardColumnId;
    const card = items.find((i) => i.id === cardId);
    if (!card) return;
    if (statusToColumn(card.status) === target) return;

    const newStatus = COLUMN_WRITES[target];
    const previousStatus = card.status;

    // Optimistic update
    setItems((prev) => prev.map((i) => (i.id === cardId ? { ...i, status: newStatus } : i)));

    try {
      const res = await fetch(`/api/content/${cardId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      router.refresh();
    } catch {
      setItems((prev) => prev.map((i) => (i.id === cardId ? { ...i, status: previousStatus } : i)));
      showToast('Failed to update status');
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading board...</div>;
  }

  return (
    <div>
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-red-600 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {BOARD_COLUMNS.map((col) => (
            <Column key={col.id} id={col.id} label={col.label} count={grouped[col.id].length}>
              {grouped[col.id].map((item) => (
                <Card key={item.id} item={item} />
              ))}
              {grouped[col.id].length === 0 && (
                <div className="text-xs text-gray-400 px-2 py-4 text-center">No items</div>
              )}
            </Column>
          ))}
        </div>
      </DndContext>
    </div>
  );
}
