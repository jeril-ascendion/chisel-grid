import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
  type InvokeModelCommandInput,
  type ResponseStream,
} from '@aws-sdk/client-bedrock-runtime';

export interface BedrockConfig {
  region?: string;
  modelId?: string;
  maxRetries?: number;
  baseDelayMs?: number;
}

export interface InvokeOptions {
  modelId?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  system?: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface BedrockResponse {
  content: string;
  stopReason: string;
  usage: TokenUsage;
  modelId: string;
}

export interface StreamChunk {
  type: 'content_delta' | 'message_stop' | 'message_start' | 'usage';
  text?: string;
  stopReason?: string;
  usage?: TokenUsage;
}

const DEFAULT_MODEL_ID = 'anthropic.claude-3-5-sonnet-20241022-v2:0';
const DEFAULT_REGION = 'ap-southeast-1';
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;

export class BedrockClient {
  private readonly client: BedrockRuntimeClient;
  private readonly defaultModelId: string;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;

  private totalInputTokens = 0;
  private totalOutputTokens = 0;
  private requestCount = 0;

  constructor(config: BedrockConfig = {}) {
    this.client = new BedrockRuntimeClient({
      region: config.region ?? DEFAULT_REGION,
    });
    this.defaultModelId = config.modelId ?? DEFAULT_MODEL_ID;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.baseDelayMs = config.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  }

  async invoke(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options: InvokeOptions = {},
  ): Promise<BedrockResponse> {
    const modelId = options.modelId ?? this.defaultModelId;
    const body = this.buildRequestBody(messages, options);

    const input: InvokeModelCommandInput = {
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(body),
    };

    const rawResponse = await this.withRetry(() =>
      this.client.send(new InvokeModelCommand(input)),
    );

    const response = JSON.parse(
      new TextDecoder().decode(rawResponse.body),
    ) as ClaudeResponse;

    const usage: TokenUsage = {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    };

    this.trackUsage(usage);

    return {
      content: response.content[0]?.type === 'text' ? response.content[0].text : '',
      stopReason: response.stop_reason,
      usage,
      modelId,
    };
  }

  async *invokeStream(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options: InvokeOptions = {},
  ): AsyncGenerator<StreamChunk> {
    const modelId = options.modelId ?? this.defaultModelId;
    const body = this.buildRequestBody(messages, options);

    const input: InvokeModelCommandInput = {
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(body),
    };

    const rawResponse = await this.withRetry(() =>
      this.client.send(new InvokeModelWithResponseStreamCommand(input)),
    );

    const stream = rawResponse.body as AsyncIterable<ResponseStream> | undefined;
    if (!stream) {
      return;
    }

    let inputTokens = 0;
    let outputTokens = 0;

    for await (const event of stream) {
      if (event.chunk?.bytes) {
        const data = JSON.parse(
          new TextDecoder().decode(event.chunk.bytes),
        ) as StreamEvent;

        if (data.type === 'message_start' && data.message?.usage) {
          inputTokens = data.message.usage.input_tokens;
          yield { type: 'message_start' };
        } else if (data.type === 'content_block_delta' && data.delta?.text) {
          yield { type: 'content_delta', text: data.delta.text };
        } else if (data.type === 'message_delta') {
          outputTokens = data.usage?.output_tokens ?? 0;
          yield {
            type: 'message_stop',
            stopReason: data.delta?.stop_reason ?? 'end_turn',
            usage: {
              inputTokens,
              outputTokens,
              totalTokens: inputTokens + outputTokens,
            },
          };
          this.trackUsage({ inputTokens, outputTokens, totalTokens: inputTokens + outputTokens });
        }
      }
    }
  }

  getUsageStats(): { totalInputTokens: number; totalOutputTokens: number; requestCount: number } {
    return {
      totalInputTokens: this.totalInputTokens,
      totalOutputTokens: this.totalOutputTokens,
      requestCount: this.requestCount,
    };
  }

  resetUsageStats(): void {
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
    this.requestCount = 0;
  }

  private buildRequestBody(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options: InvokeOptions,
  ): ClaudeRequestBody {
    const body: ClaudeRequestBody = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: options.maxTokens ?? 4096,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };

    if (options.temperature !== undefined) {
      body.temperature = options.temperature;
    }
    if (options.topP !== undefined) {
      body.top_p = options.topP;
    }
    if (options.stopSequences) {
      body.stop_sequences = options.stopSequences;
    }
    if (options.system) {
      body.system = options.system;
    }

    return body;
  }

  private trackUsage(usage: TokenUsage): void {
    this.totalInputTokens += usage.inputTokens;
    this.totalOutputTokens += usage.outputTokens;
    this.requestCount++;
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: unknown) {
        lastError = error;
        if (attempt === this.maxRetries || !this.isRetryable(error)) {
          throw error;
        }
        const delay = this.baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }

  private isRetryable(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;
    const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (err.name === 'ThrottlingException') return true;
    if (err.name === 'ServiceUnavailableException') return true;
    if (err.name === 'ModelTimeoutException') return true;
    const statusCode = err.$metadata?.httpStatusCode;
    return statusCode === 429 || statusCode === 503 || statusCode === 529;
  }
}

interface ClaudeRequestBody {
  anthropic_version: string;
  max_tokens: number;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  top_p?: number;
  stop_sequences?: string[];
  system?: string;
}

interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
  stop_reason: string;
  usage: { input_tokens: number; output_tokens: number };
}

interface StreamEvent {
  type: string;
  message?: { usage: { input_tokens: number; output_tokens: number } };
  delta?: { text?: string; stop_reason?: string };
  usage?: { output_tokens: number };
}
