import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';
import { ContentBlockSchema } from '@chiselgrid/types';
import { addArticle } from '@/lib/article-store';

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
  const contentId = crypto.randomUUID();
  const status = action === 'draft' ? 'draft' : 'in_review';

  // Store via persistence layer (Aurora when DATABASE_URL is set, in-memory otherwise)
  await addArticle({
    contentId,
    title,
    slug,
    description: '',
    status,
    blocks,
    category: categoryId ?? '',
    categoryName: '',
    categorySlug: '',
    categoryPath: '',
    categorySlugPath: '',
    categoryLevel: 1,
    tags,
    authorId: session.user.email ?? 'unknown',
    readTimeMinutes: Math.max(1, Math.ceil(blocks.length * 0.7)),
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({
    contentId,
    status,
    message: action === 'draft'
      ? `Draft saved: "${title}"`
      : `Submitted for review: "${title}"`,
  });
}
