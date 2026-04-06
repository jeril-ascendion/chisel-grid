'use client';

import { useParams } from 'next/navigation';
import { BlockEditor } from '@/components/workspace/block-editor';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useEffect } from 'react';
import type { ContentBlock } from '@chiselgrid/types';

const mockBlocks: ContentBlock[] = [
  { type: 'heading', level: 1, content: 'Building Scalable Microservices with gRPC' },
  { type: 'text', content: 'This article explores how to build scalable microservices using gRPC, covering service definition, streaming patterns, and deployment strategies.' },
  { type: 'heading', level: 2, content: 'Why gRPC?' },
  { type: 'text', content: 'gRPC offers significant advantages over REST for service-to-service communication: strongly typed contracts, bidirectional streaming, and built-in code generation.' },
  { type: 'code', language: 'protobuf', content: 'service ArticleService {\n  rpc GetArticle (GetArticleRequest) returns (Article);\n  rpc ListArticles (ListRequest) returns (stream Article);\n}', filename: 'article.proto' },
];

export default function ContentEditPage() {
  const params = useParams();
  const setBlocks = useWorkspaceStore((s) => s.setBlocks);
  const blocks = useWorkspaceStore((s) => s.blocks);

  useEffect(() => {
    // TODO: Fetch real content from API using params.id
    if (blocks.length === 0) {
      setBlocks(mockBlocks);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Content</h1>
          <p className="text-sm text-gray-500 mt-1">ID: {params.id as string}</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100">
            Version History
          </button>
          <button className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
            Publish
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <BlockEditor />
      </div>
    </div>
  );
}
