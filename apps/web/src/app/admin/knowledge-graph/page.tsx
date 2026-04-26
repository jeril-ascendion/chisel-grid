'use client';

import dynamic from 'next/dynamic';

const KnowledgeGraphClient = dynamic(
  () => import('./KnowledgeGraphClient').then((m) => m.KnowledgeGraphClient),
  { ssr: false },
);

export default function KnowledgeGraphPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Knowledge Graph
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Visual web of every article, diagram, session, and decision and how
          they connect.
        </p>
      </div>

      <KnowledgeGraphClient />
    </div>
  );
}
