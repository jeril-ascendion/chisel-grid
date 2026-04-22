import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';

export default async function middleware(req: NextRequest) {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;

  if (!user) {
    const loginUrl = new URL('/login/', req.url);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl, 307);
  }

  if (user.role !== 'admin') {
    return NextResponse.redirect(new URL('/', req.url), 307);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
