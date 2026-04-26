// CRITICAL AUTH GUARD - DO NOT REMOVE
// Second layer of /admin/* protection. apps/web/src/app/admin/layout.tsx is the first.
// Must use the NextAuth v5 wrapper form `auth((req) => ...)` so `req.auth` is populated.
// Calling `await auth()` directly in middleware does NOT see the session cookie.

import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isAdminRoute = req.nextUrl.pathname.startsWith('/admin');
  const isLoggedIn = !!req.auth;

  if (isAdminRoute && !isLoggedIn) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/admin/:path*'],
};
