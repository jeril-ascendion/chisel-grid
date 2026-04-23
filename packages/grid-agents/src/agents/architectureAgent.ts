import {
  DiagramType,
  TEMPLATES,
  validateGridIR,
  type GridIR,
} from '@chiselgrid/grid-ir';
import { invokeModel } from '../bedrock.js';
import { ARCHITECTURE_SYSTEM_PROMPT } from '../prompts/architecture.prompt.js';

export interface ArchitectureAgentInput {
  prompt: string;
  diagramType: string;
  context?: string;
  existingIR?: GridIR;
}

function buildUserMessage(input: ArchitectureAgentInput): string {
  const parts: string[] = [];
  parts.push(`Diagram type: ${input.diagramType}`);
  parts.push('');
  parts.push('User request:');
  parts.push(input.prompt);

  if (input.context && input.context.trim().length > 0) {
    parts.push('');
    parts.push('Additional context:');
    parts.push(input.context);
  }

  if (input.existingIR) {
    parts.push('');
    parts.push(
      'Existing Grid-IR to refine. Produce an updated Grid-IR that preserves ' +
        'the intent of the original where it still applies:',
    );
    parts.push(JSON.stringify(input.existingIR));
  }

  parts.push('');
  parts.push('Respond with ONLY the Grid-IR JSON. No markdown. No prose.');

  return parts.join('\n');
}

function extractJSON(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ? fenced[1].trim() : trimmed;
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return candidate;
  }
  return candidate.slice(firstBrace, lastBrace + 1);
}

function mockResponse(diagramType: string): GridIR {
  const key = diagramType as DiagramType;
  const template = TEMPLATES[key] ?? TEMPLATES[DiagramType.AWSArchitecture];
  return JSON.parse(JSON.stringify(template)) as GridIR;
}

export async function architectureAgent(
  input: ArchitectureAgentInput,
): Promise<GridIR> {
  if (process.env.GRID_MOCK === 'true') {
    return mockResponse(input.diagramType);
  }

  const userMessage = buildUserMessage(input);
  const rawFirst = await invokeModel(ARCHITECTURE_SYSTEM_PROMPT, userMessage);

  let parsed: unknown;
  let parseError: string | null = null;
  try {
    parsed = JSON.parse(extractJSON(rawFirst));
  } catch (err) {
    parseError = err instanceof Error ? err.message : String(err);
    parsed = null;
  }

  if (parsed !== null) {
    const result = validateGridIR(parsed);
    if (result.valid) {
      return parsed as GridIR;
    }
    parseError = result.errors.join('; ');
  }

  const retryMessage = [
    userMessage,
    '',
    'Your previous response was rejected for the following reason:',
    parseError ?? 'unknown validation failure',
    '',
    'Return ONLY the corrected Grid-IR JSON. No markdown. No prose.',
  ].join('\n');

  const rawRetry = await invokeModel(ARCHITECTURE_SYSTEM_PROMPT, retryMessage);
  const retryParsed = JSON.parse(extractJSON(rawRetry));
  const retryResult = validateGridIR(retryParsed);
  if (!retryResult.valid) {
    throw new Error(
      `architectureAgent produced invalid Grid-IR after retry: ${retryResult.errors.join('; ')}`,
    );
  }
  return retryParsed as GridIR;
}
