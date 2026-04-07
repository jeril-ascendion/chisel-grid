/**
 * T-20.1 Bedrock Chat Completion Client
 *
 * Wraps AWS Bedrock Claude Sonnet as an OpenAI-compatible client
 * for use with @microsoft/teams-ai ActionPlanner.
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION ?? 'ap-southeast-1',
});

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: { name: string; arguments: string };
}

interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  functions?: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
  temperature?: number;
  max_tokens?: number;
}

interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: 'stop' | 'function_call';
}

interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  choices: ChatCompletionChoice[];
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/**
 * Converts OpenAI-style messages to Bedrock Claude Messages API format.
 */
function convertToBedrockMessages(messages: ChatMessage[]) {
  const systemMessages = messages.filter((m) => m.role === 'system');
  const conversationMessages = messages.filter((m) => m.role !== 'system');

  const system = systemMessages.map((m) => m.content).join('\n\n') || undefined;

  const bedrockMessages = conversationMessages.map((m) => ({
    role: m.role === 'function' ? ('user' as const) : (m.role as 'user' | 'assistant'),
    content: m.role === 'function'
      ? `Function result for ${m.name}: ${m.content}`
      : m.content,
  }));

  return { system, messages: bedrockMessages };
}

/**
 * Converts OpenAI function definitions to Bedrock tool definitions.
 */
function convertToBedrockTools(
  functions?: ChatCompletionRequest['functions'],
) {
  if (!functions?.length) return undefined;

  return functions.map((fn) => ({
    name: fn.name,
    description: fn.description,
    input_schema: fn.parameters,
  }));
}

/**
 * BedrockChatCompletionClient — drop-in replacement for OpenAI client
 * used by Teams AI Library's ActionPlanner.
 */
export class BedrockChatCompletionClient {
  private modelId: string;

  constructor(modelId?: string) {
    this.modelId = modelId ?? process.env.BEDROCK_MODEL_ID ?? 'anthropic.claude-sonnet-4-20250514';
  }

  async createChatCompletion(
    request: ChatCompletionRequest,
  ): Promise<ChatCompletionResponse> {
    const { system, messages } = convertToBedrockMessages(request.messages);
    const tools = convertToBedrockTools(request.functions);

    const body: Record<string, unknown> = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: request.max_tokens ?? 4096,
      temperature: request.temperature ?? 0.7,
      messages,
    };

    if (system) body.system = system;
    if (tools) body.tools = tools;

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(body),
    });

    const response = await bedrockClient.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));

    // Check if Claude used a tool
    const toolUse = result.content?.find(
      (block: { type: string }) => block.type === 'tool_use',
    );

    const textContent = result.content
      ?.filter((block: { type: string }) => block.type === 'text')
      .map((block: { text: string }) => block.text)
      .join('') ?? '';

    const message: ChatMessage = toolUse
      ? {
          role: 'assistant',
          content: textContent,
          function_call: {
            name: toolUse.name,
            arguments: JSON.stringify(toolUse.input),
          },
        }
      : { role: 'assistant', content: textContent };

    return {
      id: `bedrock-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      choices: [
        {
          index: 0,
          message,
          finish_reason: toolUse ? 'function_call' : 'stop',
        },
      ],
      usage: {
        prompt_tokens: result.usage?.input_tokens ?? 0,
        completion_tokens: result.usage?.output_tokens ?? 0,
        total_tokens:
          (result.usage?.input_tokens ?? 0) +
          (result.usage?.output_tokens ?? 0),
      },
    };
  }
}
