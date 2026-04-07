'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ArticleAdminBarProps {
  contentId?: string;
}

export function ArticleAdminBar({ contentId }: ArticleAdminBarProps) {
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);

  const pathname = usePathname();

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      setIsAdmin(session.user.role === 'admin');
    }
  }, [session, status]);

  if (!isAdmin) return null;
  if (pathname.startsWith('/admin')) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '70px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignItems: 'flex-end',
      }}
    >
      <Link
        href="/admin"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: '#0F0F0F',
          color: '#FFFFFF',
          fontSize: '13px',
          fontWeight: 500,
          padding: '8px 16px',
          borderRadius: '8px',
          textDecoration: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          fontFamily: 'IBM Plex Sans, sans-serif',
          border: '1px solid rgba(255,255,255,0.15)',
          whiteSpace: 'nowrap',
        }}
      >
        &larr; Admin Dashboard
      </Link>
      {contentId && (
        <Link
          href={`/admin/content/${contentId}/edit`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#C96330',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 500,
            padding: '8px 16px',
            borderRadius: '8px',
            textDecoration: 'none',
            boxShadow: '0 2px 8px rgba(201,99,48,0.4)',
            fontFamily: 'IBM Plex Sans, sans-serif',
            whiteSpace: 'nowrap',
          }}
        >
          ✏ Edit Article
        </Link>
      )}
    </div>
  );
}
