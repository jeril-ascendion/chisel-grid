import { describe, it, expect } from 'vitest';
import { StreamingGridIRParser, type StreamEvent } from './parser';
import type { GridEdge, GridIR, GridNode } from '@chiselgrid/grid-ir';

function build25NodeFixture(): GridIR {
  const nodes: GridNode[] = [];
  const edges: GridEdge[] = [];
  for (let i = 0; i < 25; i++) {
    nodes.push({
      id: `n-${i}`,
      type: i % 2 === 0 ? 'aws.lambda' : 'aws.dynamodb',
      label: `Node ${i} \"with quotes\" and \\backslash`,
      zone: i % 3 === 0 ? 'public' : 'private',
      properties: {
        // Property key longer than KEY_LOOKBACK=32 so the parser's regex must
        // not depend on it appearing inside the lookback window.
        a_property_key_longer_than_thirty_two_characters_for_sure: i,
        nested: { key: `value-${i}`, count: i },
      },
      position: { x: i * 17, y: i * 13 },
    });
  }
  for (let i = 0; i < 24; i++) {
    edges.push({
      id: `e-${i}`,
      from: `n-${i}`,
      to: `n-${i + 1}`,
      type: 'invoke',
      label: `edge ${i}`,
      protocol: 'https',
    });
  }
  return {
    version: '1.0',
    diagram_type: 'aws_architecture' as GridIR['diagram_type'],
    abstraction_level: 2,
    title: 'Stream parser test fixture',
    nodes,
    edges,
    zones: [
      { id: 'public', label: 'Public', type: 'public' },
      { id: 'private', label: 'Private', type: 'private' },
    ],
    metadata: { tenant_id: 't1', tags: ['test'] },
  };
}

function streamOrderJSON(ir: GridIR): string {
  // Match the exact key order architectureAgentStream asks Bedrock to emit:
  // version, diagram_type, abstraction_level, title, zones, nodes, edges, metadata.
  return JSON.stringify({
    version: ir.version,
    diagram_type: ir.diagram_type,
    abstraction_level: ir.abstraction_level,
    title: ir.title,
    zones: ir.zones,
    nodes: ir.nodes,
    edges: ir.edges,
    metadata: ir.metadata,
  });
}

// Deterministic PRNG (mulberry32) so failures are reproducible by seed.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function chunkString(input: string, rng: () => number, min: number, max: number): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < input.length) {
    const size = min + Math.floor(rng() * (max - min + 1));
    chunks.push(input.slice(i, i + size));
    i += size;
  }
  return chunks;
}

function feedAndCollect(chunks: string[]): {
  nodes: GridNode[];
  edges: GridEdge[];
  metas: number;
} {
  const parser = new StreamingGridIRParser();
  const nodes: GridNode[] = [];
  const edges: GridEdge[] = [];
  let metas = 0;
  const emit = (event: StreamEvent) => {
    if (event.kind === 'node') nodes.push(event.data);
    else if (event.kind === 'edge') edges.push(event.data);
    else if (event.kind === 'meta') metas += 1;
  };
  for (const c of chunks) parser.feed(c, emit);
  return { nodes, edges, metas };
}

describe('StreamingGridIRParser', () => {
  const fixture = build25NodeFixture();
  const json = streamOrderJSON(fixture);

  it('emits every node and edge exactly once on a single full feed', () => {
    const { nodes, edges, metas } = feedAndCollect([json]);
    expect(nodes.map((n) => n.id)).toEqual(fixture.nodes.map((n) => n.id));
    expect(edges.map((e) => e.id)).toEqual(fixture.edges.map((e) => e.id));
    expect(metas).toBe(1);
  });

  it('emits every node and edge exactly once when fed one byte at a time', () => {
    const oneByteChunks: string[] = [];
    for (let i = 0; i < json.length; i++) oneByteChunks.push(json[i]!);
    const { nodes, edges } = feedAndCollect(oneByteChunks);
    expect(nodes.map((n) => n.id).sort()).toEqual(fixture.nodes.map((n) => n.id).sort());
    expect(edges.map((e) => e.id).sort()).toEqual(fixture.edges.map((e) => e.id).sort());
    // Verify the actual node/edge content survived the chunk boundaries.
    const firstNode = nodes.find((n) => n.id === 'n-0');
    expect(firstNode?.label).toBe(fixture.nodes[0]!.label);
    const firstEdge = edges.find((e) => e.id === 'e-0');
    expect(firstEdge?.protocol).toBe('https');
  });

  it.each(Array.from({ length: 100 }, (_, i) => i + 1))(
    'emits every node and edge exactly once for random chunking seed=%i',
    (seed) => {
      const rng = mulberry32(seed);
      const chunks = chunkString(json, rng, 10, 200);
      const { nodes, edges } = feedAndCollect(chunks);
      const expectedNodeIds = fixture.nodes.map((n) => n.id).sort();
      const expectedEdgeIds = fixture.edges.map((e) => e.id).sort();
      expect(nodes.map((n) => n.id).sort()).toEqual(expectedNodeIds);
      expect(edges.map((e) => e.id).sort()).toEqual(expectedEdgeIds);
      // No duplicate IDs ever emitted.
      expect(new Set(nodes.map((n) => n.id)).size).toBe(nodes.length);
      expect(new Set(edges.map((e) => e.id)).size).toBe(edges.length);
    },
  );
});
