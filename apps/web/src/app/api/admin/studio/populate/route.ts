import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { invokeModel } from '@chiselgrid/grid-agents';
import { auroraConfigured, DEFAULT_TENANT_ID } from '@/lib/db/aurora';
import { getOwnSession } from '@/lib/db/sessions';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const Body = z.object({
  source: z.literal('chamber'),
  session_id: z.string().uuid(),
  section_title: z.string().min(1).max(200),
  section_description: z.string().max(2000).optional(),
});

interface ChatMessage {
  role?: string;
  content?: string;
}

function extractTranscript(state: Record<string, unknown>): string {
  const messages = Array.isArray(state['messages']) ? (state['messages'] as ChatMessage[]) : [];
  if (messages.length === 0) return '';
  const trimmed = messages.slice(-40);
  return trimmed
    .map((m) => {
      const role = m.role === 'assistant' ? 'Assistant' : m.role === 'user' ? 'User' : 'Note';
      const text = typeof m.content === 'string' ? m.content : '';
      return `${role}: ${text}`;
    })
    .filter((line) => line.length > 6)
    .join('\n\n');
}

const SYSTEM_PROMPT = `You are a senior solutions architect at Ascendion writing a section of a client deliverable.

You will be given a Chamber session transcript and a target section. Extract and synthesise the part of the conversation that belongs in that section. Output GitHub-flavoured markdown only — no preamble, no explanations.

Rules:
- Keep the user's terminology and preserve any decisions or numbers from the transcript.
- Do not invent facts that are not supported by the transcript. If a section needs information that is missing, write a brief italic note in markdown describing what is missing.
- Use bullets for lists, short paragraphs for narrative.
- Keep the response under 600 words.`;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!auroraConfigured()) {
    return NextResponse.json({ error: 'Aurora not configured' }, { status: 503 });
  }
  const body: unknown = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', detail: parsed.error.issues }, { status: 400 });
  }

  const tenantId = (session.user as { tenantId?: string }).tenantId ?? DEFAULT_TENANT_ID;

  try {
    const chamber = await getOwnSession(parsed.data.session_id, tenantId);
    if (!chamber) {
      return NextResponse.json({ error: 'Chamber session not found' }, { status: 404 });
    }
    if (chamber.kind !== 'chamber') {
      return NextResponse.json({ error: 'Session is not a Chamber session' }, { status: 400 });
    }
    const transcript = extractTranscript(chamber.state);
    if (!transcript) {
      return NextResponse.json({
        content: `_No transcript content found in this Chamber session. Capture some thoughts in Chamber, then re-import._`,
      });
    }

    const userPrompt = `# Target section\n\n## ${parsed.data.section_title}\n\n${parsed.data.section_description ?? ''}\n\n# Chamber transcript\n\n${transcript}`;

    let content: string;
    try {
      content = await invokeModel(SYSTEM_PROMPT, userPrompt);
    } catch (err) {
      console.error('[api/admin/studio/populate] Bedrock failed:', err);
      content = `_Could not extract content from the Chamber session: ${(err as Error).message}_\n\n${transcript.slice(0, 800)}`;
    }

    return NextResponse.json({ content: content.trim() });
  } catch (err) {
    console.error('[api/admin/studio/populate] failed:', err);
    return NextResponse.json(
      { error: 'Failed to populate section', detail: (err as Error).message },
      { status: 500 },
    );
  }
}
