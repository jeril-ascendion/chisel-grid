import { notFound } from 'next/navigation';
import { auroraConfigured } from '@/lib/db/aurora';
import { getPublicSession, toPublicSession } from '@/lib/db/sessions';
import { SharedSessionView } from './shared-session-view';

export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const metadata = {
  title: 'Shared session',
  robots: { index: false, follow: false },
};

export default async function SharedSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  if (!UUID_RE.test(sessionId)) notFound();
  if (!auroraConfigured()) notFound();

  const row = await getPublicSession(sessionId);
  if (!row) notFound();

  return <SharedSessionView session={toPublicSession(row)} />;
}
