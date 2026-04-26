import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { getUserRole } from '@/lib/auth/roles';
import {
  listUsersWithGroups,
  createCognitoUser,
  isValidAscendionEmail,
  isStrongPassword,
} from '@/lib/cognito-admin';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const role = getUserRole(session);
  if (role !== 'admin') {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ok: true as const, session };
}

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  try {
    const users = await listUsersWithGroups();
    return NextResponse.json({ users });
  } catch (err) {
    console.error('[api/admin/users] GET failed:', err);
    return NextResponse.json(
      { error: 'Failed to list users', detail: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  let body: {
    email?: string;
    password?: string;
    role?: string;
    sendWelcomeEmail?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = (body.email ?? '').trim();
  const password = body.password ?? '';
  const role = body.role;
  const sendWelcomeEmail = body.sendWelcomeEmail ?? true;

  if (email && !isValidAscendionEmail(email)) {
    return NextResponse.json(
      { error: 'Email address should be part of the Ascendion domain.' },
      { status: 400 },
    );
  }

  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  if (!email || !password || !role) {
    return NextResponse.json(
      { error: 'Missing required fields: email, password, role' },
      { status: 400 },
    );
  }

  if (role !== 'admin' && role !== 'creator' && role !== 'reader') {
    return NextResponse.json(
      { error: 'Role must be admin, creator, or reader' },
      { status: 400 },
    );
  }

  if (!isStrongPassword(password)) {
    return NextResponse.json(
      {
        error:
          'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.',
      },
      { status: 400 },
    );
  }

  try {
    await createCognitoUser({ email, password, role, sendWelcomeEmail });
    return NextResponse.json(
      {
        user: {
          username: email,
          email,
          role,
          enabled: true,
          status: 'CONFIRMED',
          groups: [role],
        },
      },
      { status: 201 },
    );
  } catch (err) {
    const name = (err as { name?: string }).name;
    const message = (err as Error).message ?? 'Failed to create user';
    if (name === 'UsernameExistsException') {
      return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
    }
    console.error('[api/admin/users] POST failed:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
