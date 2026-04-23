'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCognitoSession } from '@/lib/cognito-client';

interface ArticleAdminBarProps {
  contentId?: string;
}

// Single source of truth: localStorage Cognito session, same as header.tsx.
// Must not fall back to /api/auth/session — a stale NextAuth cookie there
// leaked the Admin button to users whose header showed "Sign In".
export function ArticleAdminBar({ contentId }: ArticleAdminBarProps) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    setMounted(true);
    const cs = getCognitoSession();
    if (cs && cs.role === 'admin' && (cs.groups?.includes('admin') || cs.groups?.includes('admins'))) {
      setIsAdmin(true);
    }
    setSessionChecked(true);
  }, []);

  if (!mounted) return null;
  if (!sessionChecked) return null;
  if (pathname?.startsWith('/admin')) return null;
  if (!isAdmin) return null;

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
          whiteSpace: 'nowrap' as const,
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
            whiteSpace: 'nowrap' as const,
          }}
        >
          ✏ Edit Article
        </Link>
      )}
    </div>
  );
}
