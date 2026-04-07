import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const body = await request.json();
  const { role } = body;

  if (!role || !['admin', 'creator', 'reader'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  // In production:
  // 1. Remove user from current Cognito group
  // 2. Add user to new Cognito group (admins/creators/readers)
  // 3. Update Aurora users table

  return NextResponse.json({ userId, role });
}
