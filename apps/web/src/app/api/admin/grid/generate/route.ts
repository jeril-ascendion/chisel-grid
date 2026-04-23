import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MODEL_ID = 'anthropic.claude-sonnet-4-5';

function stripFences(text: string): string {
  let out = text.trim();
  const fence = out.match(/^```(?:\w+)?\n([\s\S]*?)```$/);
  if (fence && fence[1]) {
    out = fence[1].trim();
  }
  return out;
}

function mockMermaid(diagramType: string, prompt: string): string {
  const title = prompt.slice(0, 40).replace(/[^A-Za-z0-9 ]+/g, ' ').trim() || 'System';
  if (/sequence/i.test(diagramType)) {
    return `sequenceDiagram\n  participant U as User\n  participant S as ChiselGrid\n  participant B as Bedrock\n  U->>S: ${title}\n  S->>B: prompt\n  B-->>S: response\n  S-->>U: result`;
  }
  if (/er/i.test(diagramType)) {
    return `erDiagram\n  TENANT ||--o{ CONTENT : owns\n  CONTENT ||--|{ CATEGORY : classified\n  USER ||--o{ CONTENT : authors`;
  }
  return `graph LR\n  Client[👤 Client] --> CDN[CloudFront CDN]\n  CDN --> ALB[ALB]\n  ALB --> Lambda[Lambda: ${title}]\n  Lambda --> RDS[(Aurora PostgreSQL)]\n  Lambda --> S3[(S3 Bucket)]`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { prompt?: string; diagramType?: string; currentDiagram?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const prompt = (body.prompt ?? '').trim();
  const diagramType = (body.diagramType ?? 'AWS Architecture').trim();
  const currentDiagram = (body.currentDiagram ?? '').trim();

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  const systemPrompt =
    `You are an expert architecture diagram generator specialising in ${diagramType} diagrams.\n` +
    `Output ONLY valid Mermaid.js syntax. No markdown fences, no explanations, no commentary.\n` +
    `Your response MUST start with one of: graph, flowchart, sequenceDiagram, classDiagram, erDiagram, stateDiagram, C4Context, C4Container.\n` +
    `Use clear node IDs, descriptive labels, and a logical left-to-right or top-down structure.\n` +
    `Prefer square brackets for rectangles, parentheses for stadium shapes, and double parens for databases.\n` +
    (currentDiagram
      ? `The user is iterating on the following existing diagram. Modify it to reflect their new request while keeping unrelated parts intact:\n---\n${currentDiagram}\n---`
      : `Start from a clean diagram.`);

  const useMock =
    process.env.USE_MOCK_GENERATE === 'true' ||
    process.env.NEXT_PUBLIC_USE_MOCK === 'true';

  if (!useMock) {
    try {
      const client = new BedrockRuntimeClient({ region: 'ap-southeast-1' });
      const command = new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 2000,
          temperature: 0.4,
          system: systemPrompt,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const response = await client.send(command);
      const text = new TextDecoder().decode(response.body);
      const parsed = JSON.parse(text) as {
        content?: Array<{ type: string; text: string }>;
      };
      const raw = parsed.content?.[0]?.text ?? '';
      const mermaid = stripFences(raw);
      if (mermaid.length === 0) {
        return NextResponse.json({
          mermaid: mockMermaid(diagramType, prompt),
          source: 'mock-empty',
        });
      }
      return NextResponse.json({ mermaid, source: 'bedrock' });
    } catch (error) {
      console.error('[api/admin/grid/generate] Bedrock failed, falling back to mock:', error);
    }
  }

  return NextResponse.json({
    mermaid: mockMermaid(diagramType, prompt),
    source: 'mock',
  });
}
