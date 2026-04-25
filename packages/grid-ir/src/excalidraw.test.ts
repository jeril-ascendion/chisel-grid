import { describe, it, expect } from 'vitest';
import {
  gridIRToExcalidraw,
  gridIRToExcalidrawFile,
  type ExcalidrawArrow,
  type ExcalidrawRectangle,
} from './excalidraw';
import { DiagramType, type GridIR } from './types';

function build10NodeFixture(): GridIR {
  const zones = ['public', 'private', 'compliance', 'external', 'private', 'public', 'compliance', 'external', 'public', 'private'];
  return {
    version: '1.0',
    diagram_type: DiagramType.AWSArchitecture,
    title: 'Excalidraw fixture',
    nodes: Array.from({ length: 10 }, (_, i) => ({
      id: `node-${i}`,
      type: 'aws.lambda',
      label: `Service ${i}`,
      zone: zones[i]!,
    })),
    edges: Array.from({ length: 9 }, (_, i) => ({
      id: `edge-${i}`,
      from: `node-${i}`,
      to: `node-${i + 1}`,
      type: 'invoke',
    })),
  };
}

describe('gridIRToExcalidraw', () => {
  const ir = build10NodeFixture();
  const elements = gridIRToExcalidraw(ir);

  it('emits one rectangle and one text per node, plus one arrow per edge', () => {
    const rectangles = elements.filter((e) => e.type === 'rectangle');
    const texts = elements.filter((e) => e.type === 'text');
    const arrows = elements.filter((e) => e.type === 'arrow');
    expect(rectangles).toHaveLength(10);
    expect(texts).toHaveLength(10);
    expect(arrows).toHaveLength(9);
  });

  it('sets roughness=0 on every rectangle (sharp-edge aesthetic)', () => {
    const rectangles = elements.filter(
      (e): e is ExcalidrawRectangle => e.type === 'rectangle',
    );
    for (const rect of rectangles) {
      expect(rect.roughness).toBe(0);
      expect(rect.roundness).toBeNull();
      expect(rect.strokeColor).toBe('#000000');
      expect(rect.strokeWidth).toBe(1);
    }
  });

  it('maps zone background fills per the spec (strokes are uniform black)', () => {
    const byId = new Map(
      elements
        .filter((e): e is ExcalidrawRectangle => e.type === 'rectangle')
        .map((e) => [e.id, e]),
    );
    expect(byId.get('node-0')!.backgroundColor).toBe('#EFF6FF'); // public
    expect(byId.get('node-1')!.backgroundColor).toBe('#F0FDF4'); // private
    expect(byId.get('node-2')!.backgroundColor).toBe('#FEF2F2'); // compliance
    expect(byId.get('node-3')!.backgroundColor).toBe('#F5F3FF'); // external
  });

  it('binds arrows to source and target node ids', () => {
    const arrows = elements.filter((e): e is ExcalidrawArrow => e.type === 'arrow');
    expect(arrows[0]!.startBinding?.elementId).toBe('node-0');
    expect(arrows[0]!.endBinding?.elementId).toBe('node-1');
  });

  it('skips arrows whose endpoints are missing', () => {
    const broken: GridIR = {
      ...ir,
      edges: [
        ...ir.edges,
        { id: 'orphan', from: 'does-not-exist', to: 'node-0' },
      ],
    };
    const out = gridIRToExcalidraw(broken);
    const orphan = out.find((e) => e.id === 'orphan');
    expect(orphan).toBeUndefined();
  });
});

describe('gridIRToExcalidrawFile', () => {
  it('produces parseable JSON in the Excalidraw file shape', () => {
    const ir = build10NodeFixture();
    const file = gridIRToExcalidrawFile(ir);
    const parsed = JSON.parse(file);
    expect(parsed.type).toBe('excalidraw');
    expect(parsed.version).toBe(2);
    expect(parsed.source).toBe('chiselgrid');
    expect(Array.isArray(parsed.elements)).toBe(true);
    expect(parsed.elements.length).toBe(10 + 10 + 9); // rects + labels + arrows
  });
});
