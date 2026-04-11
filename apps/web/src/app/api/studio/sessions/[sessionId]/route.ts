import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSession, getTurns } from '@/lib/studio-store';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionId } = await params;
  const studioSession = getSession(sessionId);
  if (!studioSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const sessionTurns = getTurns(sessionId);

  return NextResponse.json({
    ...studioSession,
    turns: sessionTurns,
  });
}
