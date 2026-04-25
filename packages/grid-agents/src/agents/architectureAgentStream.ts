import {
  DiagramType,
  TEMPLATES,
  validateGridIR,
  type GridIR,
} from '@chiselgrid/grid-ir';
import { streamModel } from '../bedrock';
import { buildArchitecturePrompt } from '../prompts/architecture.prompt';
import type { SkillFile } from '../skills';
import {
  StreamingGridIRParser,
  type StreamEvent,
} from '../streaming/parser';

export interface StreamChunk {
  event:
    | StreamEvent
    | { kind: 'done'; gridIR: GridIR }
    | { kind: 'error'; error: string }
    | { kind: 'skills'; skills: string[]; estimatedTokens: number };
}

export interface ArchitectureAgentStreamInput {
  prompt: string;
  diagramType: string;
  context?: string;
  existingIR?: GridIR;
  tenantSkills?: SkillFile[];
}

function buildUserMessage(input: ArchitectureAgentStreamInput): string {
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
  parts.push(
    'Stream the JSON in this exact key order so it can be rendered live: ' +
      'version, diagram_type, abstraction_level, title, zones, nodes, edges, metadata. ' +
      'Inside the nodes array, emit fully-formed node objects one at a time. ' +
      'Same for edges. Respond with ONLY the Grid-IR JSON. No markdown. No prose.',
  );

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

function mockGridIR(diagramType: string): GridIR {
  const key = diagramType as DiagramType;
  const template = TEMPLATES[key] ?? TEMPLATES[DiagramType.AWSArchitecture];
  return JSON.parse(JSON.stringify(template)) as GridIR;
}

async function* mockStream(diagramType: string): AsyncGenerator<StreamChunk> {
  const ir = mockGridIR(diagramType);
  const metaData: { title?: string; diagram_type?: string; abstraction_level?: number } = {
    title: ir.title,
    diagram_type: ir.diagram_type,
  };
  if (ir.abstraction_level !== undefined) metaData.abstraction_level = ir.abstraction_level;
  yield {
    event: {
      kind: 'meta',
      data: metaData,
    },
  };
  for (const node of ir.nodes) {
    await new Promise((r) => setTimeout(r, 120));
    yield { event: { kind: 'node', data: node } };
  }
  for (const edge of ir.edges) {
    await new Promise((r) => setTimeout(r, 80));
    yield { event: { kind: 'edge', data: edge } };
  }
  yield { event: { kind: 'done', gridIR: ir } };
}

export async function* architectureAgentStream(
  input: ArchitectureAgentStreamInput,
): AsyncGenerator<StreamChunk> {
  if (process.env.GRID_MOCK === 'true') {
    yield* mockStream(input.diagramType);
    return;
  }

  const built = buildArchitecturePrompt({
    prompt: input.prompt,
    diagramType: input.diagramType,
    ...(input.context ? { context: input.context } : {}),
    ...(input.tenantSkills ? { tenantSkills: input.tenantSkills } : {}),
  });

  yield {
    event: {
      kind: 'skills',
      skills: built.skillNames,
      estimatedTokens: built.estimatedTokens,
    },
  };

  const userMessage = buildUserMessage(input);
  const parser = new StreamingGridIRParser();
  const queued: StreamEvent[] = [];
  const emit = (event: StreamEvent) => {
    queued.push(event);
  };

  let raw = '';
  try {
    for await (const chunk of streamModel(built.systemPrompt, userMessage)) {
      raw += chunk;
      parser.feed(chunk, emit);
      while (queued.length > 0) {
        const event = queued.shift();
        if (event) yield { event };
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    yield { event: { kind: 'error', error: `Bedrock stream failed: ${message}` } };
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJSON(raw));
  } catch (err) {
    yield {
      event: {
        kind: 'error',
        error: `Failed to parse final Grid-IR: ${err instanceof Error ? err.message : String(err)}`,
      },
    };
    return;
  }

  const validation = validateGridIR(parsed);
  if (!validation.valid) {
    yield {
      event: {
        kind: 'error',
        error: `Invalid Grid-IR: ${validation.errors.join('; ')}`,
      },
    };
    return;
  }

  yield { event: { kind: 'done', gridIR: parsed as GridIR } };
}
