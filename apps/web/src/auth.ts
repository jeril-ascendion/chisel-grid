import NextAuth, { type DefaultSession } from 'next-auth';
import CognitoProvider from 'next-auth/providers/cognito';
import CredentialsProvider from 'next-auth/providers/credentials';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  GetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

declare module 'next-auth' {
  interface Session {
    user: {
      groups: string[];
      tenantId: string;
      role: 'admin' | 'creator' | 'reader';
    } & DefaultSession['user'];
  }
}

const cognitoIssuer =
  process.env.COGNITO_ISSUER_URL ?? process.env.COGNITO_ISSUER;

const oauthProviders = cognitoIssuer && process.env.COGNITO_CLIENT_SECRET
  ? [
      CognitoProvider({
        clientId: process.env.COGNITO_CLIENT_ID!,
        clientSecret: process.env.COGNITO_CLIENT_SECRET,
        issuer: cognitoIssuer,
      }),
    ]
  : [];

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  providers: [
    ...oauthProviders,
    CredentialsProvider({
      id: 'cognito-credentials',
      name: 'Email & Password',
      credentials: {
        username: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const issuerUrl = cognitoIssuer ?? '';
        const region = issuerUrl.match(
          /cognito-idp\.(.+?)\.amazonaws/,
        )?.[1] ?? 'ap-southeast-1';
        const userPoolId = issuerUrl.split('/').pop()!;
        const client = new CognitoIdentityProviderClient({ region });

        try {
          const authResult = await client.send(
            new InitiateAuthCommand({
              AuthFlow: 'USER_PASSWORD_AUTH',
              ClientId: process.env.COGNITO_CLIENT_ID!,
              AuthParameters: {
                USERNAME: credentials.username as string,
                PASSWORD: credentials.password as string,
              },
            }),
          );

          if (!authResult.AuthenticationResult?.AccessToken) return null;

          const userInfo = await client.send(
            new GetUserCommand({
              AccessToken: authResult.AuthenticationResult.AccessToken,
            }),
          );

          const sub = userInfo.Username ?? '';
          const email = userInfo.UserAttributes?.find(
            (a) => a.Name === 'email',
          )?.Value ?? credentials.username as string;
          const tenantId = userInfo.UserAttributes?.find(
            (a) => a.Name === 'custom:tenantId',
          )?.Value ?? 'default';

          return {
            id: sub,
            email,
            name: email,
            tenantId,
            userPoolId,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    jwt({ token, account, profile, user }) {
      if (account?.provider === 'cognito-credentials' && user) {
        token.groups = [];
        token.tenantId =
          (user as Record<string, unknown>).tenantId as string ?? 'default';
        token.sub = user.id ?? undefined;
      } else if (account && profile) {
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
