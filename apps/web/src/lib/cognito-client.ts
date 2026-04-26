/**
 * Client-side Cognito authentication for static S3+CloudFront deployment.
 * Calls Cognito InitiateAuth directly from the browser — no server-side API routes needed.
 */

const CLIENT_ID = process.env['NEXT_PUBLIC_COGNITO_CLIENT_ID'] ?? '';
const CLIENT_SECRET = process.env['NEXT_PUBLIC_COGNITO_CLIENT_SECRET'] ?? '';
const REGION = process.env['NEXT_PUBLIC_COGNITO_REGION'] ?? 'ap-southeast-1';
const USER_POOL_ID = process.env['NEXT_PUBLIC_COGNITO_USER_POOL_ID'] ?? '';

const COGNITO_URL = `https://cognito-idp.${REGION}.amazonaws.com/`;
const SESSION_KEY = 'chiselgrid_session';

export interface CognitoSession {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  email: string;
  name: string;
  role: 'admin' | 'creator' | 'reader';
  groups: string[];
  expiresAt: number;
}

/** Compute HMAC-SHA256 secret hash for Cognito */
async function computeSecretHash(username: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(CLIENT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(username + CLIENT_ID));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/** Decode JWT payload */
function decodeJwt(token: string): Record<string, unknown> {
  const payload = token.split('.')[1]!;
  return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
}

/** Derive role from Cognito groups */
function deriveRole(groups: string[]): 'admin' | 'creator' | 'reader' {
  if (groups.includes('admin') || groups.includes('admins')) return 'admin';
  if (groups.includes('creator') || groups.includes('creators')) return 'creator';
  return 'reader';
}

/** Authenticate with Cognito directly */
export async function cognitoSignIn(
  email: string,
  password: string,
): Promise<{ ok: true; session: CognitoSession } | { ok: false; error: string }> {
  try {
    const secretHash = await computeSecretHash(email);

    const response = await fetch(COGNITO_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
      },
      body: JSON.stringify({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: CLIENT_ID,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
          SECRET_HASH: secretHash,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      const msg = err.message ?? err.__type ?? 'Authentication failed';
      if (msg.includes('NotAuthorized') || msg.includes('Incorrect')) {
        return { ok: false, error: 'Invalid email or password.' };
      }
      return { ok: false, error: msg };
    }

    const data = await response.json();
    const result = data.AuthenticationResult;
    if (!result?.AccessToken) {
      return { ok: false, error: 'Authentication failed — no token returned.' };
    }

    // Decode ID token for user info and groups
    const idPayload = decodeJwt(result.IdToken);
    const groups = (idPayload['cognito:groups'] as string[]) ?? [];
    const emailFromToken = (idPayload['email'] as string) ?? email;

    const session: CognitoSession = {
      accessToken: result.AccessToken,
      idToken: result.IdToken,
      refreshToken: result.RefreshToken,
      email: emailFromToken,
      name: emailFromToken,
      role: deriveRole(groups),
      groups,
      expiresAt: Date.now() + (result.ExpiresIn ?? 3600) * 1000,
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { ok: true, session };
  } catch (err) {
    return { ok: false, error: (err as Error).message ?? 'Sign in failed.' };
  }
}

/** Get stored session (null if expired or missing) */
export function getCognitoSession(): CognitoSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: CognitoSession = JSON.parse(raw);
    if (session.expiresAt < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/** Sign out — clear stored session */
export function cognitoSignOut() {
  localStorage.removeItem(SESSION_KEY);
}
