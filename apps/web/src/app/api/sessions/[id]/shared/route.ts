import { NextResponse, type NextRequest } from 'next/server';
import { auroraConfigured } from '@/lib/db/aurora';
import { getPublicSession, toPublicSession } from '@/lib/db/sessions';

export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid session id' }, { status: 400 });
  }

  if (!auroraConfigured()) {
    return NextResponse.json(
      { error: 'Aurora not configured' },
      { status: 503 },
    );
  }

  try {
    const row = await getPublicSession(id);
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(toPublicSession(row));
  } catch (err) {
    console.error('[api/sessions/[id]/shared] GET failed:', err);
    return NextResponse.json(
      { error: 'Failed to load session', detail: (err as Error).message },
      { status: 500 },
    );
  }
}
