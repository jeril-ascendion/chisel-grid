'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';

export function ArticleAdminBar({ contentId }: { contentId?: string }) {
  const { data: session } = useSession();
  if (!session?.user || session.user.role !== 'admin') return null;
  return (
    <div style={{
      position: 'fixed', top: '62px', right: '16px', zIndex: 50,
      display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'flex-end',
    }}>
      <Link href="/admin" style={{
        background: '#0F0F0F', color: '#fff', fontSize: '0.75rem',
        padding: '6px 14px', borderRadius: '6px', textDecoration: 'none',
        fontFamily: 'IBM Plex Sans, sans-serif', fontWeight: 500,
        border: '1px solid rgba(255,255,255,0.15)',
        display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        &larr; Admin Dashboard
      </Link>
      {contentId && (
        <Link href={`/admin/content/${contentId}/edit`} style={{
          background: '#C96330', color: '#fff', fontSize: '0.75rem',
          padding: '6px 14px', borderRadius: '6px', textDecoration: 'none',
          fontFamily: 'IBM Plex Sans, sans-serif', fontWeight: 500,
        }}>
          Edit Article
        </Link>
      )}
    </div>
  );
}
