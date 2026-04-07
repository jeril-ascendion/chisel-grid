import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const body = await request.json();
  const { active } = body;

  // In production:
  // active=false: cognito admin-disable-user, Aurora update status='inactive'
  // active=true: cognito admin-enable-user, Aurora update status='active'

  return NextResponse.json({ userId, active });
}
