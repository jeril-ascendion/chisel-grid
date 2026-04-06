import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BedrockClient } from './bedrock-client';

// Mock the AWS SDK
vi.mock('@aws-sdk/client-bedrock-runtime', () => {
  const mockSend = vi.fn();
  return {
    BedrockRuntimeClient: vi.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    InvokeModelCommand: vi.fn().mockImplementation((input) => ({ input })),
    InvokeModelWithResponseStreamCommand: vi.fn().mockImplementation((input) => ({ input })),
  };
});

function createMockResponse(text: string) {
  return {
    body: new TextEncoder().encode(
      JSON.stringify({
        content: [{ type: 'text', text }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    ),
  };
}

describe('BedrockClient', () => {
  let client: BedrockClient;
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    client = new BedrockClient({ region: 'ap-southeast-1', maxRetries: 1, baseDelayMs: 10 });
    // Get the mockSend from the constructor
    const { BedrockRuntimeClient } = await import('@aws-sdk/client-bedrock-runtime');
    const instance = vi.mocked(BedrockRuntimeClient).mock.results[0]!.value as { send: ReturnType<typeof vi.fn> };
    mockSend = instance.send;
  });

  describe('invoke', () => {
    it('returns parsed response with usage stats', async () => {
      mockSend.mockResolvedValueOnce(createMockResponse('Hello world'));

      const result = await client.invoke([{ role: 'user', content: 'Hi' }]);

      expect(result.content).toBe('Hello world');
      expect(result.stopReason).toBe('end_turn');
      expect(result.usage.inputTokens).toBe(100);
      expect(result.usage.outputTokens).toBe(50);
      expect(result.usage.totalTokens).toBe(150);
    });

    it('uses default model when not specified', async () => {
      mockSend.mockResolvedValueOnce(createMockResponse('test'));

      const result = await client.invoke([{ role: 'user', content: 'test' }]);

      expect(result.modelId).toBe('anthropic.claude-3-5-sonnet-20241022-v2:0');
    });

    it('uses custom model when specified', async () => {
      mockSend.mockResolvedValueOnce(createMockResponse('test'));

      const result = await client.invoke(
        [{ role: 'user', content: 'test' }],
        { modelId: 'custom-model' },
      );

      expect(result.modelId).toBe('custom-model');
    });

    it('tracks usage across calls', async () => {
      mockSend.mockResolvedValue(createMockResponse('test'));

      await client.invoke([{ role: 'user', content: '1' }]);
      await client.invoke([{ role: 'user', content: '2' }]);

      const stats = client.getUsageStats();
      expect(stats.totalInputTokens).toBe(200);
      expect(stats.totalOutputTokens).toBe(100);
      expect(stats.requestCount).toBe(2);
    });

    it('resets usage stats', async () => {
      mockSend.mockResolvedValue(createMockResponse('test'));
      await client.invoke([{ role: 'user', content: 'test' }]);

      client.resetUsageStats();

      const stats = client.getUsageStats();
      expect(stats.totalInputTokens).toBe(0);
      expect(stats.totalOutputTokens).toBe(0);
      expect(stats.requestCount).toBe(0);
    });

    it('retries on ThrottlingException', async () => {
      const throttleError = new Error('Throttled');
      (throttleError as any).name = 'ThrottlingException';

      mockSend
        .mockRejectedValueOnce(throttleError)
        .mockResolvedValueOnce(createMockResponse('retried'));

      const result = await client.invoke([{ role: 'user', content: 'test' }]);

      expect(result.content).toBe('retried');
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('retries on 429 status code', async () => {
      const rateLimitError = new Error('Rate limited');
      (rateLimitError as any).$metadata = { httpStatusCode: 429 };

      mockSend
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce(createMockResponse('retried'));

      const result = await client.invoke([{ role: 'user', content: 'test' }]);

      expect(result.content).toBe('retried');
    });

    it('does not retry non-retryable errors', async () => {
      const validationError = new Error('ValidationException');
      (validationError as any).name = 'ValidationException';

      mockSend.mockRejectedValueOnce(validationError);

      await expect(
        client.invoke([{ role: 'user', content: 'test' }]),
      ).rejects.toThrow('ValidationException');

      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('includes system prompt in request body', async () => {
      const { InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');
      mockSend.mockResolvedValueOnce(createMockResponse('test'));

      await client.invoke(
        [{ role: 'user', content: 'test' }],
        { system: 'You are helpful.', temperature: 0.5 },
      );

      const commandCall = vi.mocked(InvokeModelCommand).mock.calls[0]![0]!;
      const body = JSON.parse(commandCall.body as string);
      expect(body.system).toBe('You are helpful.');
      expect(body.temperature).toBe(0.5);
    });
  });

  describe('getUsageStats', () => {
    it('returns zeros initially', () => {
      const freshClient = new BedrockClient();
      const stats = freshClient.getUsageStats();
      expect(stats.totalInputTokens).toBe(0);
      expect(stats.totalOutputTokens).toBe(0);
      expect(stats.requestCount).toBe(0);
    });
  });
});
