'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { getCognitoSession, cognitoSignOut } from '@/lib/cognito-client';
import { ThemeToggle } from './theme-toggle';
import { MobileMenu } from './mobile-menu';
import { getCategories } from '@/lib/mock-data';

const NAV_LABELS: Record<string, string> = {
  'cloud-architecture': 'Cloud',
  'ai-ml': 'AI/ML',
  'full-stack': 'Software',
  'devops-sre': 'DevOps',
  'data-engineering': 'Data',
  'engineering-culture': 'Culture',
};

function Wordmark() {
  const text = 'Ascendion Engineering';
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <span className="hidden sm:inline whitespace-nowrap">
      {text.split('').map((ch, i) => (
        <span
          key={i}
          className="inline-block"
          style={mounted ? {
            animation: 'wm-in 0.5s ease both',
            animationDelay: `${i * 28}ms`,
          } : undefined}
        >
          {ch === ' ' ? '\u00A0' : ch}
        </span>
      ))}
    </span>
  );
}

export function Header() {
  const categories = getCategories();
  const { data: session, status } = useSession();
  const [cognitoUser, setCognitoUser] = useState<{ email: string; role: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check client-side Cognito session (for static S3 deployment)
    const cs = getCognitoSession();
    if (cs) setCognitoUser({ email: cs.email, role: cs.role });
  }, []);

  const isAuthenticated = (status === 'authenticated' && session?.user) || cognitoUser;
  const userDisplay = session?.user?.name ?? session?.user?.email ?? cognitoUser?.email;

  const handleSignOut = () => {
    // Must call NextAuth signOut unconditionally. Gating on
    // `status === 'authenticated'` skipped cookie clearing when useSession
    // hadn't resolved (common on static-exported pages), leaving a stale
    // NextAuth cookie that let the next "Sign In" auto-redirect to /admin.
    cognitoSignOut();
    setCognitoUser(null);
    signOut({ callbackUrl: '/' });
  };

  return (
    <header className="sticky top-0 z-40 h-[54px] border-b border-white/[0.08] bg-[#0F0F0F]">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-white tracking-tight whitespace-nowrap">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none" className="text-[#C96330]">
            <rect x="2" y="2" width="12" height="12" rx="2" fill="currentColor" opacity="0.9" />
            <rect x="18" y="2" width="12" height="12" rx="2" fill="currentColor" opacity="0.6" />
            <rect x="2" y="18" width="12" height="12" rx="2" fill="currentColor" opacity="0.6" />
            <rect x="18" y="18" width="12" height="12" rx="2" fill="currentColor" opacity="0.3" />
          </svg>
          <Wordmark />
          <span className="sm:hidden">Ascendion</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="px-3 py-1.5 rounded-[6px] text-[0.82rem] font-normal text-white/65 hover:text-white transition-[color] duration-[0.18s] ease"
            >
              {NAV_LABELS[cat.slug] ?? cat.name}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/search"
            className="p-2 rounded-[6px] text-white/65 hover:text-white transition-[color] duration-[0.18s] ease"
            aria-label="Search articles"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </Link>
          <ThemeToggle />
          {/* Auth UI is gated on `mounted` so first client render matches the
              static HTML (which has no session at build time). Without this,
              next-auth's SessionProvider on chiselgrid.com synchronously
              resolves to `unauthenticated` and renders a Sign In link that
              wasn't in the pre-rendered HTML → React hydration error #418. */}
          {mounted && isAuthenticated ? (
            <div className="hidden sm:flex items-center gap-2 ml-1">
              <span className="text-[0.8rem] text-white/65 max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap">
                {userDisplay}
              </span>
              <button
                onClick={handleSignOut}
                className="bg-white text-[#111111] text-[0.8rem] font-medium px-4 py-[0.35rem] rounded-full hover:opacity-80 transition-opacity duration-[0.18s] ease"
              >
                Sign Out
              </button>
            </div>
          ) : mounted && status !== 'loading' ? (
            <Link
              href="/login"
              className="hidden sm:inline-flex ml-1 items-center bg-white text-[#111111] text-[0.8rem] font-medium px-4 py-[0.35rem] rounded-full hover:opacity-80 transition-opacity duration-[0.18s] ease"
            >
              Sign In
            </Link>
          ) : null}
          <MobileMenu categories={categories} />
        </div>
      </div>
    </header>
  );
}
