import type { GridEdge, GridIR, GridNode } from './types';

export interface ExcalidrawElementBase {
  id: string;
  type: 'rectangle' | 'arrow' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  angle: 0;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: 'solid' | 'hachure' | 'cross-hatch';
  strokeWidth: 1 | 2 | 4;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  roughness: 0 | 1 | 2;
  opacity: number;
  groupIds: string[];
  frameId: null;
  roundness: { type: 3 } | null;
  seed: number;
  version: number;
  versionNonce: number;
  isDeleted: false;
  boundElements: null | Array<{ id: string; type: 'arrow' | 'text' }>;
  updated: number;
  link: null;
  locked: false;
}

export interface ExcalidrawRectangle extends ExcalidrawElementBase {
  type: 'rectangle';
}

export interface ExcalidrawArrow extends ExcalidrawElementBase {
  type: 'arrow';
  points: Array<[number, number]>;
  startBinding: { elementId: string; focus: 0; gap: 1 } | null;
  endBinding: { elementId: string; focus: 0; gap: 1 } | null;
  startArrowhead: null;
  endArrowhead: 'arrow';
}

export interface ExcalidrawText extends ExcalidrawElementBase {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: 1;
  textAlign: 'center';
  verticalAlign: 'middle';
  baseline: number;
  containerId: string;
  originalText: string;
  lineHeight: number;
}

export type ExcalidrawElement = ExcalidrawRectangle | ExcalidrawArrow | ExcalidrawText;

const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;
const FALLBACK_COLS = 5;
const FALLBACK_X_STEP = 240;
const FALLBACK_Y_STEP = 140;

const ZONE_BACKGROUND: Record<string, string> = {
  public: '#dbeafe',
  private: '#d1fae5',
  compliance: '#fee2e2',
  external: '#ede9fe',
};

const ZONE_STROKE: Record<string, string> = {
  public: '#3b82f6',
  private: '#10b981',
  compliance: '#ef4444',
  external: '#a855f7',
};

const DEFAULT_BACKGROUND = '#f1f5f9';
const DEFAULT_STROKE = '#475569';

// Deterministic seed/id derivation so the same Grid-IR always produces the
// same Excalidraw file (useful for tests and content-addressable storage).
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function nodePosition(node: GridNode, idx: number): { x: number; y: number } {
  if (
    node.position &&
    typeof node.position.x === 'number' &&
    typeof node.position.y === 'number'
  ) {
    return { x: node.position.x, y: node.position.y };
  }
  return {
    x: (idx % FALLBACK_COLS) * FALLBACK_X_STEP,
    y: Math.floor(idx / FALLBACK_COLS) * FALLBACK_Y_STEP,
  };
}

function buildRectangle(node: GridNode, idx: number, textId: string): ExcalidrawRectangle {
  const { x, y } = nodePosition(node, idx);
  const seed = hashString(node.id);
  const zone = node.zone ?? '';
  return {
    id: node.id,
    type: 'rectangle',
    x,
    y,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    angle: 0,
    strokeColor: ZONE_STROKE[zone] ?? DEFAULT_STROKE,
    backgroundColor: ZONE_BACKGROUND[zone] ?? DEFAULT_BACKGROUND,
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: { type: 3 },
    seed,
    version: 1,
    versionNonce: seed,
    isDeleted: false,
    boundElements: [{ id: textId, type: 'text' }],
    updated: 0,
    link: null,
    locked: false,
  };
}

function buildLabel(node: GridNode, idx: number, textId: string): ExcalidrawText {
  const { x, y } = nodePosition(node, idx);
  const seed = hashString(textId);
  return {
    id: textId,
    type: 'text',
    x,
    y,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    angle: 0,
    strokeColor: '#0f172a',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed,
    version: 1,
    versionNonce: seed,
    isDeleted: false,
    boundElements: null,
    updated: 0,
    link: null,
    locked: false,
    text: node.label,
    fontSize: 16,
    fontFamily: 1,
    textAlign: 'center',
    verticalAlign: 'middle',
    baseline: 18,
    containerId: node.id,
    originalText: node.label,
    lineHeight: 1.25,
  };
}

function buildArrow(
  edge: GridEdge,
  fromPos: { x: number; y: number },
  toPos: { x: number; y: number },
): ExcalidrawArrow {
  const seed = hashString(edge.id);
  const startX = fromPos.x + NODE_WIDTH;
  const startY = fromPos.y + NODE_HEIGHT / 2;
  const endX = toPos.x;
  const endY = toPos.y + NODE_HEIGHT / 2;
  return {
    id: edge.id,
    type: 'arrow',
    x: startX,
    y: startY,
    width: endX - startX,
    height: endY - startY,
    angle: 0,
    strokeColor: '#475569',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed,
    version: 1,
    versionNonce: seed,
    isDeleted: false,
    boundElements: null,
    updated: 0,
    link: null,
    locked: false,
    points: [
      [0, 0],
      [endX - startX, endY - startY],
    ],
    startBinding: { elementId: edge.from, focus: 0, gap: 1 },
    endBinding: { elementId: edge.to, focus: 0, gap: 1 },
    startArrowhead: null,
    endArrowhead: 'arrow',
  };
}

export function gridIRToExcalidraw(ir: GridIR): ExcalidrawElement[] {
  const elements: ExcalidrawElement[] = [];
  const positions = new Map<string, { x: number; y: number }>();

  ir.nodes.forEach((node, idx) => {
    const pos = nodePosition(node, idx);
    positions.set(node.id, pos);
    const textId = `${node.id}-label`;
    elements.push(buildRectangle(node, idx, textId));
    elements.push(buildLabel(node, idx, textId));
  });

  ir.edges.forEach((edge) => {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (!from || !to) return;
    elements.push(buildArrow(edge, from, to));
  });

  return elements;
}

export function gridIRToExcalidrawFile(ir: GridIR): string {
  return JSON.stringify({
    type: 'excalidraw',
    version: 2,
    source: 'chiselgrid',
    elements: gridIRToExcalidraw(ir),
    appState: {
      gridSize: null,
      viewBackgroundColor: '#ffffff',
    },
    files: {},
  });
}
