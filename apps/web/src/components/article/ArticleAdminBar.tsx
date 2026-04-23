'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCognitoSession } from '@/lib/cognito-client';

interface ArticleAdminBarProps {
  contentId?: string;
}

// Does NOT use next-auth's useSession() — that hook polls /api/auth/session
// on every render/focus, which caused an infinite login/session loop in prod.
// One-shot: Cognito localStorage (static site) + /api/auth/session (dev).
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
      setSessionChecked(true);
      return;
    }
    if (cs) {
      // Signed in but not admin — done.
      setSessionChecked(true);
      return;
    }

    let cancelled = false;
    fetch('/api/auth/session')
      .then((r) => (r.ok ? r.json() : null))
      .then((session) => {
        if (cancelled) return;
        const user = session?.user as
          | { role?: string; groups?: string[] }
          | undefined;
        const adminByRole = user?.role === 'admin';
        const adminByGroups = (user?.groups?.includes('admin') || user?.groups?.includes('admins')) ?? false;
        if (user && (adminByRole || adminByGroups)) {
          setIsAdmin(true);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSessionChecked(true);
      });

    return () => {
      cancelled = true;
    };
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
