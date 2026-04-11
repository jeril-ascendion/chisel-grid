import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getGrid } from '@/lib/studio-store';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ gridId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { gridId } = await params;
  const grid = getGrid(gridId);
  if (!grid) {
    return NextResponse.json({ error: 'Grid not found' }, { status: 404 });
  }
  return NextResponse.json(grid);
}
