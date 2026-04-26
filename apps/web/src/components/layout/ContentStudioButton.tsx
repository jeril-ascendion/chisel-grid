'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getCognitoSession } from '@/lib/cognito-client';

function ContentStudioButtonInner() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [hasCognito, setHasCognito] = useState(false);

  useEffect(() => {
    setMounted(true);
    setHasCognito(Boolean(getCognitoSession()));
  }, []);

  if (!mounted) return null;
  const authed = (status === 'authenticated' && session?.user) || hasCognito;
  if (!authed) return null;

  return (
    <Link
      href="/admin"
      aria-label="Open Content Studio"
      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
      style={{
        backgroundColor: 'rgba(201,99,48,0.15)',
        color: '#E07A42',
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
      Content Studio
    </Link>
  );
}

export default ContentStudioButtonInner;
