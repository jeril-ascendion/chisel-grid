import type { Node, Edge } from '@xyflow/react';
import dagre from 'dagre';
import type { GridIR, GridNode, GridEdge } from '@chiselgrid/grid-ir';

const AWS_TYPE_PREFIX = 'aws.';
const NODE_WIDTH = 180;
const NODE_HEIGHT = 72;

function mapNodeType(irType: string): string {
  if (irType.startsWith(AWS_TYPE_PREFIX)) return 'awsNode';
  return 'default';
}

function irNodeToRFNode(node: GridNode): Node {
  const rfType = mapNodeType(String(node.type));
  const base: Node = {
    id: node.id,
    type: rfType,
    position: node.position ?? { x: 0, y: 0 },
    data: {
      label: node.label,
      nodeType: node.type,
      zone: node.zone,
      properties: node.properties ?? {},
    },
  };
  return base;
}

function irEdgeToRFEdge(edge: GridEdge): Edge {
  const rfEdge: Edge = {
    id: edge.id,
    source: edge.from,
    target: edge.to,
    type: edge.animated === true ? 'animatedEdge' : 'default',
    animated: edge.animated === true,
    data: {
      protocol: edge.protocol,
      latency_ms: edge.latency_ms,
      data_flow: edge.data_flow,
      edgeType: edge.type,
    },
  };
  if (edge.label !== undefined) rfEdge.label = edge.label;
  return rfEdge;
}

function hasAuthoredPositions(irNodes: readonly GridNode[]): boolean {
  return irNodes.every(
    (n) =>
      n.position &&
      typeof n.position.x === 'number' &&
      typeof n.position.y === 'number' &&
      !(n.position.x === 0 && n.position.y === 0),
  );
}

function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 120 });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
    };
  });
}

export function gridIRToReactFlow(ir: GridIR): { nodes: Node[]; edges: Edge[] } {
  const rfNodes: Node[] = ir.nodes.map((n) => irNodeToRFNode(n));
  const edges: Edge[] = ir.edges.map((e) => irEdgeToRFEdge(e));
  const nodes = hasAuthoredPositions(ir.nodes)
    ? rfNodes
    : applyDagreLayout(rfNodes, edges);
  return { nodes, edges };
}
