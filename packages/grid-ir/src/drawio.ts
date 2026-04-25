import type { GridEdge, GridIR, GridNode } from './types';

const NODE_WIDTH = 78;
const NODE_HEIGHT = 78;
const FALLBACK_COLS = 5;
const FALLBACK_X_STEP = 160;
const FALLBACK_Y_STEP = 120;

// Maps Grid-IR NodeType strings to mxgraph.aws4.* shape names. Anything not
// in the table falls back to a generic rounded rectangle with the type name
// as the visible label decoration.
const AWS_SHAPE_MAP: Record<string, string> = {
  'aws.api_gateway': 'mxgraph.aws4.api_gateway',
  'aws.lambda': 'mxgraph.aws4.lambda',
  'aws.aurora': 'mxgraph.aws4.aurora',
  'aws.rds': 'mxgraph.aws4.rds',
  'aws.dynamodb': 'mxgraph.aws4.dynamodb',
  'aws.s3': 'mxgraph.aws4.s3',
  'aws.cloudfront': 'mxgraph.aws4.cloudfront',
  'aws.sqs': 'mxgraph.aws4.simple_queue_service_sqs',
  'aws.sns': 'mxgraph.aws4.simple_notification_service_sns',
  'aws.step_functions': 'mxgraph.aws4.step_functions',
  'aws.cognito': 'mxgraph.aws4.cognito',
  'aws.bedrock': 'mxgraph.aws4.bedrock',
  'aws.ecs': 'mxgraph.aws4.elastic_container_service',
  'aws.eks': 'mxgraph.aws4.elastic_kubernetes_service',
  'aws.ec2': 'mxgraph.aws4.ec2',
  'aws.eventbridge': 'mxgraph.aws4.eventbridge',
  'aws.secrets_manager': 'mxgraph.aws4.secrets_manager',
  'aws.polly': 'mxgraph.aws4.polly',
};

function escapeXmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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

function nodeStyle(node: GridNode): string {
  const shape = AWS_SHAPE_MAP[String(node.type)];
  if (shape) {
    return [
      'sketch=0',
      'points=[[0,0,0],[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0,0],[0,1,0],[0.25,1,0],[0.5,1,0],[0.75,1,0],[1,1,0],[0,0.25,0],[0,0.5,0],[0,0.75,0],[1,0.25,0],[1,0.5,0],[1,0.75,0]]',
      'outlineConnect=0',
      'fontColor=#232F3E',
      'gradientColor=none',
      'fillColor=#E7157B',
      'strokeColor=#ffffff',
      'dashed=0',
      'verticalLabelPosition=bottom',
      'verticalAlign=top',
      'align=center',
      'html=1',
      `shape=${shape}`,
    ].join(';');
  }
  return [
    'rounded=1',
    'whiteSpace=wrap',
    'html=1',
    'fillColor=#dae8fc',
    'strokeColor=#6c8ebf',
  ].join(';');
}

function edgeStyle(): string {
  return [
    'edgeStyle=orthogonalEdgeStyle',
    'rounded=0',
    'orthogonalLoop=1',
    'jettySize=auto',
    'html=1',
    'exitX=1',
    'exitY=0.5',
    'exitDx=0',
    'exitDy=0',
    'entryX=0',
    'entryY=0.5',
    'entryDx=0',
    'entryDy=0',
  ].join(';');
}

function buildNodeCell(node: GridNode, idx: number): string {
  const { x, y } = nodePosition(node, idx);
  const id = escapeXmlAttribute(node.id);
  const value = escapeXmlAttribute(node.label);
  const style = escapeXmlAttribute(nodeStyle(node));
  return (
    `<mxCell id="${id}" value="${value}" style="${style}" vertex="1" parent="1">` +
    `<mxGeometry x="${x}" y="${y}" width="${NODE_WIDTH}" height="${NODE_HEIGHT}" as="geometry"/>` +
    `</mxCell>`
  );
}

function buildEdgeCell(edge: GridEdge, knownNodeIds: Set<string>): string | null {
  if (!knownNodeIds.has(edge.from) || !knownNodeIds.has(edge.to)) return null;
  const id = escapeXmlAttribute(edge.id);
  const source = escapeXmlAttribute(edge.from);
  const target = escapeXmlAttribute(edge.to);
  const value = edge.label ? escapeXmlAttribute(edge.label) : '';
  const style = escapeXmlAttribute(edgeStyle());
  return (
    `<mxCell id="${id}" value="${value}" style="${style}" edge="1" parent="1" source="${source}" target="${target}">` +
    `<mxGeometry relative="1" as="geometry"/>` +
    `</mxCell>`
  );
}

export function gridIRToDrawio(ir: GridIR): string {
  const knownNodeIds = new Set(ir.nodes.map((n) => n.id));
  const nodeCells = ir.nodes.map((n, i) => buildNodeCell(n, i)).join('');
  const edgeCells = ir.edges
    .map((e) => buildEdgeCell(e, knownNodeIds))
    .filter((cell): cell is string => cell !== null)
    .join('');
  const title = escapeXmlAttribute(ir.title);
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<mxfile host="chiselgrid" modified="" agent="chiselgrid" version="22.0.0">` +
    `<diagram name="${title}" id="chiselgrid">` +
    `<mxGraphModel dx="800" dy="600" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100" math="0" shadow="0">` +
    `<root>` +
    `<mxCell id="0"/>` +
    `<mxCell id="1" parent="0"/>` +
    nodeCells +
    edgeCells +
    `</root>` +
    `</mxGraphModel>` +
    `</diagram>` +
    `</mxfile>`
  );
}
