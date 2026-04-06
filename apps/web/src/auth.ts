import NextAuth, { type DefaultSession } from 'next-auth';
import CognitoProvider from 'next-auth/providers/cognito';

declare module 'next-auth' {
  interface Session {
    user: {
      groups: string[];
      tenantId: string;
      role: 'admin' | 'creator' | 'reader';
    } & DefaultSession['user'];
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CognitoProvider({
      clientId: process.env.COGNITO_CLIENT_ID!,
      clientSecret: process.env.COGNITO_CLIENT_SECRET!,
      issuer: process.env.COGNITO_ISSUER!,
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    jwt({ token, account, profile }) {
      if (account && profile) {
        const cognitoGroups =
          (profile as Record<string, unknown>)['cognito:groups'] as
            | string[]
            | undefined;
        token.groups = cognitoGroups ?? [];
        token.tenantId =
          ((profile as Record<string, unknown>)['custom:tenantId'] as string) ??
          'default';
        token.sub = profile.sub ?? undefined;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.groups = (token.groups as string[]) ?? [];
        session.user.tenantId = (token.tenantId as string) ?? 'default';
        session.user.role = deriveRole((token.groups as string[]) ?? []);
      }
      return session;
    },
    authorized({ auth: session, request }) {
      const isLoggedIn = !!session?.user;
      const isProtected = request.nextUrl.pathname.startsWith('/admin');
      if (isProtected && !isLoggedIn) return false;
      return true;
    },
  },
  session: { strategy: 'jwt' },
});

function deriveRole(groups: string[]): 'admin' | 'creator' | 'reader' {
  if (groups.includes('admins')) return 'admin';
  if (groups.includes('creators')) return 'creator';
  return 'reader';
}
