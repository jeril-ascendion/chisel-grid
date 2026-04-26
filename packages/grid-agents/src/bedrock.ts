import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';

export const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'ap-southeast-1',
});

export const MODEL_ID = 'global.anthropic.claude-sonnet-4-5-20250929-v1:0';

interface BedrockTextBlock {
  type: 'text';
  text: string;
}

interface BedrockResponseBody {
  content?: Array<BedrockTextBlock | { type: string; [key: string]: unknown }>;
}

export async function invokeModel(
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const body = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: userMessage }],
      },
    ],
  };

  try {
    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(body),
    });

    const response = await bedrockClient.send(command);
    const decoded = new TextDecoder().decode(response.body);
    const parsed = JSON.parse(decoded) as BedrockResponseBody;

    const firstText = parsed.content?.find(
      (block): block is BedrockTextBlock => block.type === 'text',
    );

    if (!firstText) {
      throw new Error('Bedrock response contained no text block');
    }

    return firstText.text;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Bedrock invokeModel failed: ${message}`);
  }
}

interface BedrockStreamChunk {
  type: string;
  delta?: { type?: string; text?: string };
  content_block?: { type?: string; text?: string };
}

export async function* streamModel(
  systemPrompt: string,
  userMessage: string,
): AsyncGenerator<string, void, void> {
  const body = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: userMessage }],
      },
    ],
  };

  const command = new InvokeModelWithResponseStreamCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(body),
  });

  const response = await bedrockClient.send(command);
  if (!response.body) {
    throw new Error('Bedrock stream response had no body');
  }

  const decoder = new TextDecoder();
  let chunkCount = 0;
  for await (const event of response.body) {
    const bytes = event.chunk?.bytes;
    if (!bytes) continue;
    chunkCount += 1;
    console.log('[bedrock-stream]', JSON.stringify({ n: chunkCount, bytes: bytes.length }));
    const decoded = decoder.decode(bytes);
    let parsed: BedrockStreamChunk;
    try {
      parsed = JSON.parse(decoded) as BedrockStreamChunk;
    } catch {
      continue;
    }
    if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
      yield parsed.delta.text;
    } else if (parsed.type === 'content_block_start' && parsed.content_block?.text) {
      yield parsed.content_block.text;
    }
  }
}
