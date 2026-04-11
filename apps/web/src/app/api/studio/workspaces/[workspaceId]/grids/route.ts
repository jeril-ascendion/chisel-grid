import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listGrids } from '@/lib/studio-store';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { workspaceId } = await params;
  return NextResponse.json(listGrids(workspaceId));
}
