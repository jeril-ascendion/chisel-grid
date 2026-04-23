import { DiagramType } from './types';
import type { GridIR } from './types';

export function gridIRToMermaid(ir: GridIR): string {
  if (ir.diagram_type === DiagramType.Sequence) {
    return toSequenceDiagram(ir);
  }
  return toFlowchart(ir);
}

function sanitizeId(id: string): string {
  const cleaned = id.replace(/[^a-zA-Z0-9_]/g, '_');
  return /^[0-9]/.test(cleaned) ? `n_${cleaned}` : cleaned;
}

function escapeLabel(label: string): string {
  return label.replace(/"/g, "'").replace(/\n/g, ' ');
}

function toFlowchart(ir: GridIR): string {
  const lines: string[] = ['flowchart LR'];
  if (ir.title) {
    lines.push(`  %% ${ir.title}`);
  }
  for (const node of ir.nodes) {
    lines.push(`  ${sanitizeId(node.id)}["${escapeLabel(node.label)}"]`);
  }
  for (const edge of ir.edges) {
    const from = sanitizeId(edge.from);
    const to = sanitizeId(edge.to);
    if (edge.label) {
      lines.push(`  ${from} -->|${escapeLabel(edge.label)}| ${to}`);
    } else {
      lines.push(`  ${from} --> ${to}`);
    }
  }
  return lines.join('\n');
}

function toSequenceDiagram(ir: GridIR): string {
  const lines: string[] = ['sequenceDiagram'];
  if (ir.title) {
    lines.push(`  %% ${ir.title}`);
  }
  for (const node of ir.nodes) {
    lines.push(
      `  participant ${sanitizeId(node.id)} as ${escapeLabel(node.label)}`,
    );
  }
  const ordered = [...ir.edges].sort((a, b) => {
    const ao = a.order ?? 0;
    const bo = b.order ?? 0;
    return ao - bo;
  });
  for (const edge of ordered) {
    const arrow =
      edge.type === 'async' || edge.type === 'event' || edge.type === 'response'
        ? '-->>'
        : '->>';
    const label = edge.label ? escapeLabel(edge.label) : '';
    lines.push(
      `  ${sanitizeId(edge.from)}${arrow}${sanitizeId(edge.to)}: ${label}`,
    );
  }
  return lines.join('\n');
}
