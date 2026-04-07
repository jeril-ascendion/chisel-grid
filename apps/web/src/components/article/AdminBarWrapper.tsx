'use client';

import dynamic from 'next/dynamic';

const ArticleAdminBar = dynamic(
  () => import('./ArticleAdminBar').then((mod) => mod.ArticleAdminBar),
  { ssr: false }
);

export function AdminBarWrapper({ contentId }: { contentId?: string }) {
  return <ArticleAdminBar contentId={contentId} />;
}
