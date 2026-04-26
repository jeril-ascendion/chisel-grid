/**
 * Minimal Grid-IR → SVG renderer.
 *
 * Produces a static, self-contained SVG suitable for embedding inline in
 * Studio documents and exports (markdown, docx, pdf). Not intended to
 * compete with the React Flow canvas — just a deterministic, dependency-free
 * snapshot.
 */

interface GridNodeLite {
  id: string;
  label?: string;
  type?: string;
  position?: { x?: number; y?: number };
}

interface GridEdgeLite {
  id?: string;
  from: string;
  to: string;
  label?: string;
}

interface GridIRLite {
  title?: string;
  nodes?: GridNodeLite[];
  edges?: GridEdgeLite[];
}

const NODE_W = 160;
const NODE_H = 56;
const PADDING = 40;
const GRID_GAP_X = 60;
const GRID_GAP_Y = 80;
const ACCENT = '#C96330';
const STROKE = '#3A3A3A';
const TEXT = '#0F0F0F';
const BG = '#FFFFFF';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface Positioned {
  id: string;
  label: string;
  x: number;
  y: number;
}

function layout(nodes: GridNodeLite[]): Map<string, Positioned> {
  const out = new Map<string, Positioned>();
  const haveCoords = nodes.every((n) => typeof n.position?.x === 'number' && typeof n.position?.y === 'number');

  if (haveCoords) {
    let minX = Infinity, minY = Infinity;
    for (const n of nodes) {
      const x = n.position!.x as number;
      const y = n.position!.y as number;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
    }
    if (!Number.isFinite(minX)) minX = 0;
    if (!Number.isFinite(minY)) minY = 0;
    for (const n of nodes) {
      const x = (n.position!.x as number) - minX + PADDING;
      const y = (n.position!.y as number) - minY + PADDING;
      out.set(n.id, { id: n.id, label: n.label ?? n.type ?? n.id, x, y });
    }
  } else {
    const cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
    nodes.forEach((n, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = PADDING + col * (NODE_W + GRID_GAP_X);
      const y = PADDING + row * (NODE_H + GRID_GAP_Y);
      out.set(n.id, { id: n.id, label: n.label ?? n.type ?? n.id, x, y });
    });
  }
  return out;
}

export function gridIrToSvg(ir: GridIRLite): string {
  const nodes = Array.isArray(ir.nodes) ? ir.nodes : [];
  const edges = Array.isArray(ir.edges) ? ir.edges : [];
  const positioned = layout(nodes);

  let maxX = 0;
  let maxY = 0;
  for (const p of positioned.values()) {
    if (p.x + NODE_W > maxX) maxX = p.x + NODE_W;
    if (p.y + NODE_H > maxY) maxY = p.y + NODE_H;
  }
  const width = Math.max(maxX + PADDING, 320);
  const height = Math.max(maxY + PADDING + 40, 200);

  const titleText = (ir.title ?? '').trim();

  const edgeSvg = edges
    .map((e) => {
      const a = positioned.get(e.from);
      const b = positioned.get(e.to);
      if (!a || !b) return '';
      const x1 = a.x + NODE_W / 2;
      const y1 = a.y + NODE_H / 2;
      const x2 = b.x + NODE_W / 2;
      const y2 = b.y + NODE_H / 2;
      const labelMid = e.label
        ? `<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 4}" font-size="10" font-family="IBM Plex Mono, monospace" fill="${STROKE}" text-anchor="middle">${escapeXml(e.label)}</text>`
        : '';
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${STROKE}" stroke-width="1.2" marker-end="url(#arrow)"/>${labelMid}`;
    })
    .join('');

  const nodeSvg = Array.from(positioned.values())
    .map((p) => {
      const label = (p.label ?? '').slice(0, 32);
      return `<g><rect x="${p.x}" y="${p.y}" width="${NODE_W}" height="${NODE_H}" rx="6" fill="${BG}" stroke="${ACCENT}" stroke-width="1.5"/><text x="${p.x + NODE_W / 2}" y="${p.y + NODE_H / 2 + 4}" text-anchor="middle" font-family="IBM Plex Sans, system-ui, sans-serif" font-size="13" fill="${TEXT}">${escapeXml(label)}</text></g>`;
    })
    .join('');

  const titleSvg = titleText
    ? `<text x="${PADDING}" y="22" font-family="IBM Plex Sans, system-ui, sans-serif" font-size="14" font-weight="600" fill="${TEXT}">${escapeXml(titleText)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${STROKE}"/></marker></defs><rect width="100%" height="100%" fill="${BG}"/>${titleSvg}${edgeSvg}${nodeSvg}</svg>`;
}
