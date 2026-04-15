import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import type { ContentBlock } from '@chiselgrid/types';
import { BedrockClient } from '@chiselgrid/ai';

/**
 * POST /api/workspace/generate
 * Calls Bedrock Claude Sonnet for real article generation.
 * Falls back to a structured mock if Bedrock fails or USE_MOCK=true.
 */

const SYSTEM_PROMPT = `You are a senior solutions architect at Ascendion writing practitioner-grade engineering articles for the Ascendion Engineering knowledge portal.

ABSOLUTE RULES:
1. The TITLE must describe the technical topic — NEVER echo the user request verbatim.
   WRONG: "Give me an article on Lambda cold starts"
   RIGHT: "Lambda Cold Start Prevention: Patterns and Benchmarks"
2. The BODY must contain real technical content — NEVER start with "Understanding [prompt]" or restate the prompt.
3. Include real code examples, AWS service names, and version numbers where relevant.
4. Reference how Netflix, Stripe, AWS, Google, or Uber solves this when applicable.
5. Return ONLY valid JSON. No markdown fences. No backticks. No preamble.`;

const BAD_TITLE_PHRASES = [
  'give me',
  'write me',
  'write an',
  'article on',
  'article about',
  'create an',
  'generate an',
];

function buildUserPrompt(topic: string): string {
  return `Topic: ${topic}

Write a technical article. Return ONLY this JSON structure:
{
  "title": "Descriptive technical title about the actual topic (NOT the user request)",
  "description": "Two sentences: what engineers will learn and why it matters",
  "readTimeMinutes": 8,
  "tags": ["tag1", "tag2", "tag3"],
  "keyTakeaways": ["takeaway1", "takeaway2", "takeaway3"],
  "blocks": [
    { "type": "heading", "level": 1, "content": "Same as title" },
    { "type": "text", "content": "Opening paragraph with a specific technical fact — NOT 'Understanding X is crucial'" },
    { "type": "heading", "level": 2, "content": "Section One Title" },
    { "type": "text", "content": "Real technical content..." },
    { "type": "code", "language": "typescript", "content": "// working code example" },
    { "type": "heading", "level": 2, "content": "Real-World Implementation" },
    { "type": "text", "content": "How Netflix/Stripe/AWS implements this specifically..." },
    { "type": "heading", "level": 2, "content": "Key Takeaways" },
    { "type": "text", "content": "Summary of the main points engineers should remember." }
  ]
}`;
}

function stripFencesAndParse(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
  return JSON.parse(cleaned);
}

function sanitizeTitle(title: string | undefined, topic: string): string {
  const t = (title ?? '').trim();
  const lower = t.toLowerCase();
  const looksBad = !t || t === topic || BAD_TITLE_PHRASES.some((p) => lower.includes(p));
  if (!looksBad) return t;
  const cleaned = topic
    .replace(
      /^(give me an? article (?:on|about)|write (?:me )?an? article (?:on|about)|create an? article (?:on|about)|generate an? article (?:on|about)|write about|article on|article about)\s*/i,
      '',
    )
    .trim();
  const words = cleaned.split(/\s+/).slice(0, 10);
  return (
    words
      .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
      .join(' ')
      .substring(0, 80) || 'Engineering Excellence in Practice'
  );
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as { topic?: string };
  const topic = body.topic;

  if (!topic || typeof topic !== 'string' || topic.length < 5) {
    return NextResponse.json(
      { error: 'Topic must be at least 5 characters' },
      { status: 400 },
    );
  }

  const useMock =
    process.env.USE_MOCK_GENERATE === 'true' ||
    process.env.NEXT_PUBLIC_USE_MOCK === 'true';

  if (!useMock) {
    try {
      const client = new BedrockClient({ region: 'ap-southeast-1' });
      const response = await client.invoke(
        [{ role: 'user', content: buildUserPrompt(topic) }],
        { system: SYSTEM_PROMPT, maxTokens: 4000, temperature: 0.7 },
      );
      const parsed = stripFencesAndParse(response.content) as {
        title?: string;
        description?: string;
        readTimeMinutes?: number;
        tags?: string[];
        keyTakeaways?: string[];
        blocks?: ContentBlock[];
      };
      const title = sanitizeTitle(parsed.title, topic);
      const blocks = Array.isArray(parsed.blocks) && parsed.blocks.length > 0
        ? parsed.blocks
        : mockBlocks(title);
      return NextResponse.json({
        blocks,
        title,
        slug: slugify(title),
        description:
          parsed.description ??
          'A practitioner-grade guide with architectural patterns and production-tested strategies.',
        readTimeMinutes: parsed.readTimeMinutes ?? 8,
        tags: parsed.tags ?? [],
        keyTakeaways: parsed.keyTakeaways ?? [],
        message: `Generated article: "${title}" with ${blocks.length} content blocks.`,
        contentId: crypto.randomUUID(),
        source: 'bedrock',
      });
    } catch (error) {
      console.error('[workspace/generate] Bedrock failed, falling back to mock:', error);
    }
  }

  const title = sanitizeTitle(undefined, topic);
  const blocks = mockBlocks(title);
  return NextResponse.json({
    blocks,
    title,
    slug: slugify(title),
    description:
      'A practitioner-grade guide with architectural patterns, implementation roadmap, and production-tested strategies.',
    message: `Generated article (mock): "${title}" with ${blocks.length} content blocks.`,
    contentId: crypto.randomUUID(),
    source: 'mock',
  });
}

function mockBlocks(title: string): ContentBlock[] {
  return [
    { type: 'heading', level: 1, content: title },
    {
      type: 'text',
      content:
        'Modern engineering teams face increasing pressure to deliver reliable, scalable systems while maintaining velocity. This guide distills hard-won lessons from production deployments into actionable patterns that senior engineers can apply immediately.',
    },
    { type: 'heading', level: 2, content: 'Why This Matters Now' },
    {
      type: 'text',
      content:
        'The landscape has shifted dramatically over the past two years. What was once a niche concern is now table stakes for any team operating at scale. Organizations that fail to adapt risk compounding technical debt that becomes increasingly expensive to unwind.',
    },
    {
      type: 'callout',
      variant: 'info',
      content:
        'This article is written for senior software engineers and architects. Familiarity with distributed systems and cloud-native patterns is assumed.',
    },
    { type: 'heading', level: 2, content: 'Core Architectural Patterns' },
    {
      type: 'text',
      content:
        'Three patterns have emerged as foundational to production-grade implementations. Each addresses a specific failure mode that teams encounter as they scale beyond initial prototypes into systems handling real traffic.',
    },
    {
      type: 'code',
      language: 'typescript',
      content:
        "// Isolation boundary with circuit breaker\nimport { CircuitBreaker } from '@core/resilience';\n\nconst breaker = new CircuitBreaker({\n  failureThreshold: 5,\n  resetTimeout: 30_000,\n});\n\nexport async function fetchUpstream(id: string) {\n  return breaker.execute(() => client.get(`/resources/${id}`));\n}",
      filename: 'resilience.ts',
    },
    { type: 'heading', level: 2, content: 'Measuring Success' },
    {
      type: 'text',
      content:
        'Define success criteria before you begin. Track mean time to recovery (MTTR), error budget consumption rate, and deployment frequency. These metrics tell a clear story about whether your architectural investments are paying off.',
    },
  ];
}
