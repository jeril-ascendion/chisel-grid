import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { BaseAgent, AgentValidationError } from './base-agent';
import type { BedrockClient, BedrockResponse } from '../bedrock-client';
import type { PromptTemplate } from '../prompts';

// Concrete test implementation of BaseAgent
class TestAgent extends BaseAgent<{ value: string }> {
  protected readonly outputSchema = z.object({ value: z.string() });
  protected readonly agentName = 'TestAgent';

  constructor(bedrock: BedrockClient, prompt: PromptTemplate) {
    super(bedrock, prompt);
  }

  // Expose protected methods for testing
  public testParseResponse(response: BedrockResponse) {
    return this.parseResponse(response);
  }

  public testExtractJson(text: string) {
    return this.extractJson(text);
  }
}

function createMockBedrock(content: string): BedrockClient {
  return {
    invoke: vi.fn().mockResolvedValue({
      content,
      stopReason: 'end_turn',
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
      modelId: 'anthropic.claude-3-5-sonnet',
    }),
  } as unknown as BedrockClient;
}

const mockPrompt: PromptTemplate = {
  system: 'You are a test agent.',
  buildUserMessage: (vars: Record<string, string>) => `Process: ${vars['input'] ?? ''}`,
};

describe('BaseAgent', () => {
  describe('extractJson', () => {
    it('extracts JSON from markdown code fences', () => {
      const bedrock = createMockBedrock('');
      const agent = new TestAgent(bedrock, mockPrompt);

      const text = 'Here is the result:\n```json\n{"value": "hello"}\n```';
      expect(agent.testExtractJson(text)).toBe('{"value": "hello"}');
    });

    it('extracts JSON from code fences without language tag', () => {
      const bedrock = createMockBedrock('');
      const agent = new TestAgent(bedrock, mockPrompt);

      const text = '```\n{"value": "test"}\n```';
      expect(agent.testExtractJson(text)).toBe('{"value": "test"}');
    });

    it('extracts raw JSON object', () => {
      const bedrock = createMockBedrock('');
      const agent = new TestAgent(bedrock, mockPrompt);

      const text = 'Result: {"value": "raw"}';
      expect(agent.testExtractJson(text)).toBe('{"value": "raw"}');
    });

    it('extracts raw JSON array', () => {
      const bedrock = createMockBedrock('');
      const agent = new TestAgent(bedrock, mockPrompt);

      const text = 'Result: [{"value": "item"}]';
      expect(agent.testExtractJson(text)).toBe('[{"value": "item"}]');
    });

    it('returns trimmed text when no JSON found', () => {
      const bedrock = createMockBedrock('');
      const agent = new TestAgent(bedrock, mockPrompt);

      expect(agent.testExtractJson('  plain text  ')).toBe('plain text');
    });
  });

  describe('parseResponse', () => {
    it('parses valid JSON response', () => {
      const bedrock = createMockBedrock('');
      const agent = new TestAgent(bedrock, mockPrompt);

      const response: BedrockResponse = {
        content: '{"value": "success"}',
        stopReason: 'end_turn',
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
        modelId: 'test-model',
      };

      expect(agent.testParseResponse(response)).toEqual({ value: 'success' });
    });

    it('throws AgentValidationError for invalid schema', () => {
      const bedrock = createMockBedrock('');
      const agent = new TestAgent(bedrock, mockPrompt);

      const response: BedrockResponse = {
        content: '{"wrong": "field"}',
        stopReason: 'end_turn',
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
        modelId: 'test-model',
      };

      expect(() => agent.testParseResponse(response)).toThrow(AgentValidationError);
    });
  });

  describe('run', () => {
    it('invokes bedrock and returns AgentResult', async () => {
      const bedrock = createMockBedrock('{"value": "result"}');
      const agent = new TestAgent(bedrock, mockPrompt);

      const result = await agent.run({ input: 'test' });

      expect(result.data).toEqual({ value: 'result' });
      expect(result.usage.inputTokens).toBe(100);
      expect(result.usage.outputTokens).toBe(50);
      expect(result.modelId).toBe('anthropic.claude-3-5-sonnet');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('passes system prompt and user message to bedrock', async () => {
      const bedrock = createMockBedrock('{"value": "result"}');
      const agent = new TestAgent(bedrock, mockPrompt);

      await agent.run({ input: 'hello' });

      expect(bedrock.invoke).toHaveBeenCalledWith(
        [{ role: 'user', content: 'Process: hello' }],
        expect.objectContaining({
          system: 'You are a test agent.',
          maxTokens: 8192,
          temperature: 0.3,
        }),
      );
    });
  });
});

describe('AgentValidationError', () => {
  it('has correct properties', () => {
    const err = new AgentValidationError('TestAgent', 'value: Required');
    expect(err.message).toBe('TestAgent output validation failed: value: Required');
    expect(err.agentName).toBe('TestAgent');
    expect(err.validationDetails).toBe('value: Required');
    expect(err.name).toBe('AgentValidationError');
  });
});
