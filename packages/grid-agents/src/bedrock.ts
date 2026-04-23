import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

export const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'ap-southeast-1',
});

export const MODEL_ID = 'anthropic.claude-sonnet-4-5';

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
