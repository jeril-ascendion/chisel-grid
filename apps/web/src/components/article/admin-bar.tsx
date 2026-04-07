'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';

export function ArticleAdminBar({ contentId }: { contentId: string }) {
  const { data: session } = useSession();

  if (session?.user?.role !== 'admin') return null;

  return (
    <div className="fixed top-[var(--header-height,56px)] right-4 z-50 flex items-center gap-2 sm:right-6">
      <Link
        href={`/admin/content/${contentId}/edit`}
        className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white shadow-md hover:bg-gray-700 transition-colors sm:text-sm sm:px-4 sm:py-2"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Edit Article
      </Link>
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white shadow-md hover:bg-gray-700 transition-colors sm:text-sm sm:px-4 sm:py-2"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
        Admin Dashboard
      </Link>
    </div>
  );
}
