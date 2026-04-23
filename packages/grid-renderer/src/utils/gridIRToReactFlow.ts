import type { Node, Edge } from '@xyflow/react';
import type { GridIR, GridNode, GridEdge, GridZone } from '@chiselgrid/grid-ir';

const AWS_TYPE_PREFIX = 'aws.';

function mapNodeType(irType: string): string {
  if (irType.startsWith(AWS_TYPE_PREFIX)) return 'awsNode';
  return 'default';
}

function zoneToGroupNode(zone: GridZone, index: number): Node {
  return {
    id: `zone-${zone.id}`,
    type: 'group',
    position: { x: 40 + index * 360, y: 40 },
    data: { label: zone.label },
    style: {
      width: 320,
      height: 400,
      backgroundColor: zone.color ?? 'rgba(148, 163, 184, 0.08)',
      border: '1px dashed rgb(148, 163, 184)',
      borderRadius: 12,
    },
  };
}

function irNodeToRFNode(node: GridNode, fallbackIndex: number): Node {
  const position = node.position ?? {
    x: 80 + (fallbackIndex % 4) * 220,
    y: 80 + Math.floor(fallbackIndex / 4) * 160,
  };
  const rfType = mapNodeType(String(node.type));
  const base: Node = {
    id: node.id,
    type: rfType,
    position,
    data: {
      label: node.label,
      nodeType: node.type,
      zone: node.zone,
      properties: node.properties ?? {},
    },
  };
  if (node.parent) base.parentId = node.parent;
  else if (node.zone) base.parentId = `zone-${node.zone}`;
  if (base.parentId) base.extent = 'parent';
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

export function gridIRToReactFlow(ir: GridIR): { nodes: Node[]; edges: Edge[] } {
  const zoneNodes: Node[] = (ir.zones ?? []).map((zone, idx) => zoneToGroupNode(zone, idx));
  const irNodes: Node[] = ir.nodes.map((n, idx) => irNodeToRFNode(n, idx));
  const edges: Edge[] = ir.edges.map((e) => irEdgeToRFEdge(e));
  return { nodes: [...zoneNodes, ...irNodes], edges };
}
