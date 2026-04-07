'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface QueueItem {
  id: string;
  title: string;
  slug: string;
  author: string;
  submittedAt: string;
  readTimeMinutes: number;
  status: 'in_review' | 'submitted';
  category: string;
  importSource?: string;
  description?: string;
  hasSvgAnimation?: boolean;
}

export function ContentQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchQueue();
  }, []);

  async function fetchQueue() {
    try {
      const res = await fetch('/api/admin/queue');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      } else {
        // Fallback: show instructions
        console.log('[ContentQueue] API not available — showing placeholder');
      }
    } catch {
      console.log('[ContentQueue] API not available — run import-taxonomy.ts first');
    } finally {
      setLoading(false);
    }
  }

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/admin/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: id, action }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
        if (selectedItem?.id === id) setSelectedItem(null);
      }
    } catch {
      // Optimistic remove on error too
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleBulkApprove = () => {
    const highScore = items.filter(i => (i.readTimeMinutes ?? 0) >= 8);
    for (const item of highScore) {
      handleAction(item.id, 'approve');
    }
  };

  const categories = [...new Set(items.map(i => i.category))].sort();
  const filtered = filter === 'all' ? items : items.filter(i => i.category === filter);

  if (loading) {
    return <div className="py-12 text-center text-gray-400">Loading content queue...</div>;
  }

  return (
    <div>
      {/* Header stats */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {items.length} article{items.length !== 1 ? 's' : ''} awaiting your review
        </p>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="text-xs border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 bg-white dark:bg-gray-800"
          >
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {items.length > 0 && (
            <button
              onClick={handleBulkApprove}
              className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
            >
              Approve All (read time &ge; 8min)
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        {/* Table */}
        <div className={cn("rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden", selectedItem ? "w-1/2" : "w-full")}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Title</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Category</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Read</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  className={cn(
                    "border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer",
                    selectedItem?.id === item.id && "bg-blue-50 dark:bg-blue-900/20",
                  )}
                  onClick={() => setSelectedItem(item)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white text-xs">{item.title}</div>
                    {item.importSource && (
                      <span className="mt-0.5 inline-block rounded bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 text-[10px] text-orange-700 dark:text-orange-400">
                        {item.importSource}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-[10px]">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">{item.readTimeMinutes}m</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAction(item.id, 'approve'); }}
                        className="rounded-md bg-green-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAction(item.id, 'reject'); }}
                        className="rounded-md border border-red-300 px-2 py-1 text-[10px] font-medium text-red-600 hover:bg-red-50"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                    {items.length === 0
                      ? 'No items in the review queue. Run the taxonomy import first.'
                      : 'No items match the selected filter.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Preview panel */}
        {selectedItem && (
          <div className="w-1/2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 overflow-y-auto max-h-[600px]">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedItem.title}</h3>
              <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600 text-xs">&times;</button>
            </div>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <p><strong>Category:</strong> {selectedItem.category}</p>
              <p><strong>Read time:</strong> {selectedItem.readTimeMinutes} minutes</p>
              <p><strong>Slug:</strong> <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">{selectedItem.slug}</code></p>
              {selectedItem.description && (
                <p><strong>Description:</strong> {selectedItem.description}</p>
              )}
              {selectedItem.hasSvgAnimation && (
                <p className="text-green-600"><strong>SVG Animation:</strong> Included</p>
              )}
              {selectedItem.importSource && (
                <p><strong>Source:</strong> <a href={`https://www.ascendion.engineering/${selectedItem.slug.replace('ascendion-', '').replace(/-/g, '/')}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View original</a></p>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleAction(selectedItem.id, 'approve')}
                className="flex-1 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Approve &amp; Publish
              </button>
              <button
                onClick={() => handleAction(selectedItem.id, 'reject')}
                className="flex-1 rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Reject
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
