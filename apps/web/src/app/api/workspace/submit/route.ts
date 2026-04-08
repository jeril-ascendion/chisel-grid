import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';
import { ContentBlockSchema } from '@chiselgrid/types';

const SubmitRequestSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  categoryId: z.string().optional(),
  tags: z.array(z.string()),
  blocks: z.array(ContentBlockSchema).min(1),
  action: z.enum(['draft', 'submit']),
});

/**
 * POST /api/workspace/submit
 * Save draft or submit content for review.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = SubmitRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { title, slug, action, blocks, tags, categoryId } = parsed.data;

  // TODO: In production, save to database via content repository
  // and trigger review pipeline if action === 'submit'
  const contentId = crypto.randomUUID();

  return NextResponse.json({
    contentId,
    status: action === 'draft' ? 'draft' : 'submitted',
    message: action === 'draft'
      ? `Draft saved: "${title}"`
      : `Submitted for review: "${title}"`,
  });
}
