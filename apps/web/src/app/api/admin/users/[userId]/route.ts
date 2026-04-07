import { NextResponse } from 'next/server';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  // In production:
  // 1. Cognito: admin-delete-user
  // 2. Aurora: soft delete (set deletedAt timestamp)

  return NextResponse.json({ userId, deleted: true });
}
