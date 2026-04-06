import { NextResponse } from 'next/server';
import type { ContentBlock } from '@chiselgrid/types';

/**
 * POST /api/workspace/generate
 * Triggers the AI content pipeline. In production, this starts a Step Functions execution.
 * For now, returns mock data for frontend development.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as { topic?: string };
  const topic = body.topic;

  if (!topic || typeof topic !== 'string' || topic.length < 5) {
    return NextResponse.json(
      { error: 'Topic must be at least 5 characters' },
      { status: 400 },
    );
  }

  // TODO: In production, start Step Functions execution via AWS SDK
  // For now, return mock generated content for frontend development
  const blocks: ContentBlock[] = [
    { type: 'heading', level: 1, content: topic },
    {
      type: 'text',
      content: `This is a comprehensive guide to ${topic}. In this article, we will explore the key concepts, best practices, and practical implementations that every software engineer should know.`,
    },
    { type: 'heading', level: 2, content: 'Introduction' },
    {
      type: 'text',
      content: `Understanding ${topic} is crucial for modern software development. This section provides the foundational knowledge needed to get started.`,
    },
    {
      type: 'callout',
      variant: 'info',
      content: `This article targets senior software engineers. Basic programming knowledge is assumed.`,
    },
    { type: 'heading', level: 2, content: 'Key Concepts' },
    {
      type: 'text',
      content: `Let's dive into the core concepts that underpin ${topic}. Each concept builds on the previous one, creating a comprehensive mental model.`,
    },
    {
      type: 'code',
      language: 'typescript',
      content: `// Example implementation\nexport function example() {\n  console.log("Hello from ${topic}");\n  return { status: "success" };\n}`,
      filename: 'example.ts',
    },
    { type: 'heading', level: 2, content: 'Architecture Overview' },
    {
      type: 'diagram',
      diagramType: 'mermaid',
      content: `graph TD\n  A[Client] --> B[API Gateway]\n  B --> C[Lambda]\n  C --> D[Database]\n  C --> E[Cache]`,
      caption: `High-level architecture for ${topic}`,
    },
    { type: 'heading', level: 2, content: 'Best Practices' },
    {
      type: 'text',
      content: `When implementing ${topic}, follow these proven best practices to ensure maintainable and scalable code.`,
    },
    {
      type: 'callout',
      variant: 'warning',
      content: `Always test your implementation thoroughly before deploying to production.`,
    },
    { type: 'heading', level: 2, content: 'Conclusion' },
    {
      type: 'text',
      content: `${topic} is a powerful approach that can significantly improve your software development workflow. Start with the basics and gradually adopt more advanced patterns.`,
    },
  ];

  return NextResponse.json({
    blocks,
    message: `Generated article draft: "${topic}" with ${blocks.length} content blocks.`,
    contentId: crypto.randomUUID(),
  });
}
