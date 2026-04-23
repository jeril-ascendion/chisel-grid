import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { getUserRole } from '@/lib/auth/roles';
import {
  getUserDetail,
  updateUserRole,
  setUserPassword,
  setUserEnabled,
  deleteCognitoUser,
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { username } = await params;
  const decoded = decodeURIComponent(username);
  try {
    const user = await getUserDetail(decoded);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ user });
  } catch (err) {
    console.error('[api/admin/users/username] GET failed:', err);
    return NextResponse.json(
      { error: 'Failed to fetch user', detail: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { username } = await params;
  const decoded = decodeURIComponent(username);

  let body: { role?: string; password?: string; enabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { role, password, enabled } = body;

  if (role !== undefined) {
    if (role !== 'admin' && role !== 'creator' && role !== 'reader') {
      return NextResponse.json(
        { error: 'Role must be admin, creator, or reader' },
        { status: 400 },
      );
    }
  }

  if (password !== undefined && password !== '' && !isStrongPassword(password)) {
    return NextResponse.json(
      {
        error:
          'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.',
      },
      { status: 400 },
    );
  }

  const selfEmail = guard.session.user?.email;
  if (enabled === false && selfEmail && selfEmail === decoded) {
    return NextResponse.json(
      { error: 'Cannot deactivate your own account.' },
      { status: 400 },
    );
  }

  try {
    if (role !== undefined) {
      await updateUserRole(decoded, role as 'admin' | 'creator' | 'reader');
    }
    if (password !== undefined && password !== '') {
      await setUserPassword(decoded, password);
    }
    if (enabled !== undefined) {
      await setUserEnabled(decoded, enabled);
    }
    const updated = await getUserDetail(decoded);
    return NextResponse.json({ user: updated });
  } catch (err) {
    console.error('[api/admin/users/username] PATCH failed:', err);
    return NextResponse.json(
      { error: 'Failed to update user', detail: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { username } = await params;
  const decoded = decodeURIComponent(username);

  const selfEmail = guard.session.user?.email;
  if (selfEmail && selfEmail === decoded) {
    return NextResponse.json(
      { error: 'Cannot remove your own account.' },
      { status: 400 },
    );
  }

  try {
    await deleteCognitoUser(decoded);
    return NextResponse.json({ deleted: true, username: decoded });
  } catch (err) {
    console.error('[api/admin/users/username] DELETE failed:', err);
    return NextResponse.json(
      { error: 'Failed to delete user', detail: (err as Error).message },
      { status: 500 },
    );
  }
}
