'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface QueueItem {
  id: string;
  title: string;
  author: string;
  submittedAt: string;
  aiScore: number;
  status: 'in_review' | 'submitted';
  category: string;
}

const mockItems: QueueItem[] = [
  { id: '1', title: 'Building Scalable Microservices with gRPC', author: 'alice@ascendion.com', submittedAt: '2026-04-05T10:30:00Z', aiScore: 78, status: 'in_review', category: 'Software Engineering' },
  { id: '2', title: 'Zero Trust Architecture for Cloud-Native Apps', author: 'bob@ascendion.com', submittedAt: '2026-04-05T14:15:00Z', aiScore: 85, status: 'submitted', category: 'Security & Compliance' },
  { id: '3', title: 'MLOps Pipeline Best Practices', author: 'carol@ascendion.com', submittedAt: '2026-04-04T09:00:00Z', aiScore: 62, status: 'in_review', category: 'AI & Machine Learning' },
  { id: '4', title: 'AWS CDK Advanced Patterns', author: 'dave@ascendion.com', submittedAt: '2026-04-04T16:45:00Z', aiScore: 91, status: 'submitted', category: 'Cloud & Infrastructure' },
  { id: '5', title: 'Event-Driven Architecture with EventBridge', author: 'eve@ascendion.com', submittedAt: '2026-04-03T11:20:00Z', aiScore: 55, status: 'in_review', category: 'Software Engineering' },
];

export function ContentQueue() {
  const [items, setItems] = useState(mockItems);

  const handleAction = (id: string, action: 'approve' | 'reject') => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    // TODO: Call API to approve/reject
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <th className="px-4 py-3 text-left font-medium text-gray-500">Title</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Author</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Category</th>
            <th className="px-4 py-3 text-center font-medium text-gray-500">AI Score</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Submitted</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900 dark:text-white">{item.title}</div>
              </td>
              <td className="px-4 py-3 text-gray-500">{item.author}</td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs">
                  {item.category}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <ScoreBadge score={item.aiScore} />
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs">
                {new Date(item.submittedAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => handleAction(item.id, 'approve')}
                    className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(item.id, 'reject')}
                    className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Reject
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                No items in the review queue
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold',
        score >= 80 && 'bg-green-100 text-green-700',
        score >= 60 && score < 80 && 'bg-yellow-100 text-yellow-700',
        score < 60 && 'bg-red-100 text-red-700',
      )}
    >
      {score}
    </span>
  );
}
