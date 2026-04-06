import { create } from 'zustand';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import type { UserProfile } from '@/lib/types';

WebBrowser.maybeCompleteAuthSession();

const COGNITO_DOMAIN = process.env.EXPO_PUBLIC_COGNITO_DOMAIN ?? '';
const COGNITO_CLIENT_ID = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID ?? '';
const REDIRECT_URI = AuthSession.makeRedirectUri({ scheme: 'chiselgrid' });

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<boolean>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  login: async () => {
    set({ isLoading: true });
    try {
      const discovery = {
        authorizationEndpoint: `${COGNITO_DOMAIN}/oauth2/authorize`,
        tokenEndpoint: `${COGNITO_DOMAIN}/oauth2/token`,
        revocationEndpoint: `${COGNITO_DOMAIN}/oauth2/revoke`,
      };

      const request = new AuthSession.AuthRequest({
        clientId: COGNITO_CLIENT_ID,
        scopes: ['openid', 'email', 'profile'],
        redirectUri: REDIRECT_URI,
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true,
      });

      const result = await request.promptAsync(discovery);

      if (result.type === 'success' && result.params['code']) {
        // Exchange code for tokens
        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            clientId: COGNITO_CLIENT_ID,
            code: result.params['code'],
            redirectUri: REDIRECT_URI,
            extraParams: {
              code_verifier: request.codeVerifier ?? '',
            },
          },
          discovery,
        );

        if (tokenResult.accessToken) {
          await SecureStore.setItemAsync('auth_token', tokenResult.accessToken);
          if (tokenResult.refreshToken) {
            await SecureStore.setItemAsync('refresh_token', tokenResult.refreshToken);
          }

          // Decode ID token for user info (simple base64 decode of payload)
          const userInfo = decodeJwtPayload(tokenResult.idToken ?? '');
          const user: UserProfile = {
            userId: userInfo.sub ?? '',
            email: userInfo.email ?? '',
            name: userInfo.name ?? userInfo.email ?? '',
            role: deriveRole(userInfo['cognito:groups'] ?? []),
            tenantId: userInfo['custom:tenantId'] ?? 'default',
          };

          set({ user, isAuthenticated: true, isLoading: false });
          return true;
        }
      }

      set({ isLoading: false });
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      set({ isLoading: false });
      return false;
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('refresh_token');
    set({ user: null, isAuthenticated: false });
  },

  restoreSession: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        const userInfo = decodeJwtPayload(token);
        if (userInfo.exp && userInfo.exp * 1000 > Date.now()) {
          set({
            user: {
              userId: userInfo.sub ?? '',
              email: userInfo.email ?? '',
              name: userInfo.name ?? '',
              role: deriveRole(userInfo['cognito:groups'] ?? []),
              tenantId: userInfo['custom:tenantId'] ?? 'default',
            },
            isAuthenticated: true,
          });
        } else {
          // Token expired — try refresh
          await SecureStore.deleteItemAsync('auth_token');
        }
      }
    } catch {
      // Silently fail
    }
  },
}));

function decodeJwtPayload(token: string): Record<string, any> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return {};
    const payload = parts[1]!;
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return {};
  }
}

function deriveRole(groups: string[]): 'admin' | 'creator' | 'reader' {
  if (groups.includes('admins')) return 'admin';
  if (groups.includes('creators')) return 'creator';
  return 'reader';
}
