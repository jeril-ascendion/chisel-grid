import { DiagramType, NodeType, EdgeType, ZoneType } from './types';
import type { GridIR } from './types';

const awsArchitecture: GridIR = {
  version: '1.0',
  diagram_type: DiagramType.AWSArchitecture,
  abstraction_level: 2,
  title: 'AWS Serverless API',
  nodes: [
    {
      id: 'cloudfront',
      type: NodeType.AWSCloudFront,
      label: 'CloudFront',
      zone: 'public',
    },
    {
      id: 'api-gateway',
      type: NodeType.AWSAPIGateway,
      label: 'API Gateway',
      zone: 'public',
      properties: { protocol: 'REST', auth: 'Cognito' },
    },
    {
      id: 'lambda',
      type: NodeType.AWSLambda,
      label: 'Lambda Handler',
      zone: 'private',
      properties: { runtime: 'nodejs20', timeout: 29 },
    },
    {
      id: 'aurora',
      type: NodeType.AWSAurora,
      label: 'Aurora PostgreSQL',
      zone: 'data',
    },
  ],
  edges: [
    {
      id: 'e1',
      from: 'cloudfront',
      to: 'api-gateway',
      label: 'HTTPS',
      protocol: 'HTTPS',
      animated: true,
    },
    {
      id: 'e2',
      from: 'api-gateway',
      to: 'lambda',
      type: EdgeType.Invoke,
      label: 'invoke',
      animated: true,
    },
    {
      id: 'e3',
      from: 'lambda',
      to: 'aurora',
      type: EdgeType.Reads,
      label: 'SQL',
      protocol: 'PostgreSQL',
    },
  ],
  zones: [
    { id: 'public', label: 'Public Zone', type: ZoneType.Public, color: '#EFF6FF' },
    { id: 'private', label: 'Private Zone', type: ZoneType.Private, color: '#F0FDF4' },
    { id: 'data', label: 'Data Zone', type: ZoneType.Database, color: '#FEF3C7' },
  ],
};

const c4Context: GridIR = {
  version: '1.0',
  diagram_type: DiagramType.C4Context,
  abstraction_level: 1,
  title: 'System Context',
  nodes: [
    { id: 'user', type: NodeType.User, label: 'End User' },
    { id: 'admin', type: NodeType.User, label: 'Administrator' },
    { id: 'system', type: NodeType.System, label: 'ChiselGrid Platform' },
    { id: 'bedrock', type: NodeType.External, label: 'AWS Bedrock' },
  ],
  edges: [
    { id: 'e1', from: 'user', to: 'system', label: 'reads content' },
    { id: 'e2', from: 'admin', to: 'system', label: 'manages content' },
    { id: 'e3', from: 'system', to: 'bedrock', label: 'AI requests' },
  ],
};

const c4Container: GridIR = {
  version: '1.0',
  diagram_type: DiagramType.C4Container,
  abstraction_level: 2,
  title: 'Container Diagram',
  nodes: [
    { id: 'web', type: NodeType.Container, label: 'Next.js Web App' },
    { id: 'api', type: NodeType.Container, label: 'API Lambda' },
    { id: 'agents', type: NodeType.Container, label: 'Agent Workers' },
    { id: 'db', type: NodeType.Database, label: 'Aurora PostgreSQL' },
  ],
  edges: [
    { id: 'e1', from: 'web', to: 'api', label: 'HTTPS/JSON' },
    { id: 'e2', from: 'api', to: 'agents', type: EdgeType.Async, label: 'queue' },
    { id: 'e3', from: 'api', to: 'db', label: 'SQL' },
    { id: 'e4', from: 'agents', to: 'db', label: 'SQL' },
  ],
};

const c4Component: GridIR = {
  version: '1.0',
  diagram_type: DiagramType.C4Component,
  abstraction_level: 3,
  title: 'Component Diagram',
  nodes: [
    { id: 'controller', type: NodeType.Component, label: 'Request Controller' },
    { id: 'service', type: NodeType.Component, label: 'Business Service' },
    { id: 'repo', type: NodeType.Component, label: 'Repository' },
  ],
  edges: [
    { id: 'e1', from: 'controller', to: 'service', label: 'calls' },
    { id: 'e2', from: 'service', to: 'repo', label: 'uses' },
  ],
};

const sequence: GridIR = {
  version: '1.0',
  diagram_type: DiagramType.Sequence,
  title: 'Login Sequence',
  nodes: [
    { id: 'user', type: NodeType.Actor, label: 'User' },
    { id: 'web', type: NodeType.Service, label: 'Web App' },
    { id: 'cognito', type: NodeType.AWSCognito, label: 'Cognito' },
    { id: 'api', type: NodeType.AWSAPIGateway, label: 'API' },
  ],
  edges: [
    { id: 'e1', from: 'user', to: 'web', type: EdgeType.Request, label: 'enter credentials', order: 1 },
    { id: 'e2', from: 'web', to: 'cognito', type: EdgeType.Request, label: 'authenticate', order: 2 },
    { id: 'e3', from: 'cognito', to: 'web', type: EdgeType.Response, label: 'id token', order: 3 },
    { id: 'e4', from: 'web', to: 'api', type: EdgeType.Request, label: 'authorized request', order: 4 },
  ],
};

const flowchart: GridIR = {
  version: '1.0',
  diagram_type: DiagramType.Flowchart,
  title: 'Content Publish Flow',
  nodes: [
    { id: 'start', type: NodeType.Start, label: 'Start' },
    { id: 'draft', type: NodeType.Process, label: 'Create Draft' },
    { id: 'review', type: NodeType.Decision, label: 'Reviewed?' },
    { id: 'publish', type: NodeType.Process, label: 'Publish' },
    { id: 'end', type: NodeType.End, label: 'End' },
  ],
  edges: [
    { id: 'e1', from: 'start', to: 'draft' },
    { id: 'e2', from: 'draft', to: 'review' },
    { id: 'e3', from: 'review', to: 'publish', label: 'yes' },
    { id: 'e4', from: 'publish', to: 'end' },
  ],
};

const erDiagram: GridIR = {
  version: '1.0',
  diagram_type: DiagramType.ERDiagram,
  title: 'Content Data Model',
  nodes: [
    { id: 'tenant', type: NodeType.Entity, label: 'Tenant' },
    { id: 'user', type: NodeType.Entity, label: 'User' },
    { id: 'content', type: NodeType.Entity, label: 'Content' },
  ],
  edges: [
    { id: 'e1', from: 'tenant', to: 'user', type: EdgeType.Relates, label: '1 : N' },
    { id: 'e2', from: 'user', to: 'content', type: EdgeType.Relates, label: '1 : N' },
  ],
};

const networkTopology: GridIR = {
  version: '1.0',
  diagram_type: DiagramType.NetworkTopology,
  title: 'VPC Network Topology',
  nodes: [
    { id: 'internet', type: NodeType.External, label: 'Internet' },
    { id: 'public-subnet', type: NodeType.Service, label: 'Public Subnet', zone: 'public' },
    { id: 'private-subnet', type: NodeType.Service, label: 'Private Subnet', zone: 'private' },
    { id: 'db-subnet', type: NodeType.Database, label: 'DB Subnet', zone: 'data' },
  ],
  edges: [
    { id: 'e1', from: 'internet', to: 'public-subnet', label: 'IGW' },
    { id: 'e2', from: 'public-subnet', to: 'private-subnet', label: 'NAT' },
    { id: 'e3', from: 'private-subnet', to: 'db-subnet', label: 'TCP 5432' },
  ],
  zones: [
    { id: 'public', label: 'Public', type: ZoneType.Public },
    { id: 'private', label: 'Private', type: ZoneType.Private },
    { id: 'data', label: 'Data', type: ZoneType.Database },
  ],
};

const timeline: GridIR = {
  version: '1.0',
  diagram_type: DiagramType.Timeline,
  title: 'Platform Roadmap',
  nodes: [
    { id: 'm1', type: NodeType.Process, label: 'Foundation' },
    { id: 'm2', type: NodeType.Process, label: 'Grid MVP' },
    { id: 'm3', type: NodeType.Process, label: 'Animation' },
    { id: 'm4', type: NodeType.Process, label: 'Fine-tuning' },
  ],
  edges: [
    { id: 'e1', from: 'm1', to: 'm2', label: 'April 2026' },
    { id: 'e2', from: 'm2', to: 'm3', label: 'May 2026' },
    { id: 'e3', from: 'm3', to: 'm4', label: 'September 2026' },
  ],
};

const spatial3D: GridIR = {
  version: '1.0',
  diagram_type: DiagramType.Spatial3D,
  title: '3D Spatial Architecture',
  nodes: [
    { id: 'frontend', type: NodeType.Container, label: 'Frontend Layer', position: { x: 0, y: 0 } },
    { id: 'backend', type: NodeType.Container, label: 'Backend Layer', position: { x: 0, y: 100 } },
    { id: 'data', type: NodeType.Database, label: 'Data Layer', position: { x: 0, y: 200 } },
  ],
  edges: [
    { id: 'e1', from: 'frontend', to: 'backend' },
    { id: 'e2', from: 'backend', to: 'data' },
  ],
};

export const TEMPLATES: Record<DiagramType, GridIR> = {
  [DiagramType.AWSArchitecture]: awsArchitecture,
  [DiagramType.C4Context]: c4Context,
  [DiagramType.C4Container]: c4Container,
  [DiagramType.C4Component]: c4Component,
  [DiagramType.Sequence]: sequence,
  [DiagramType.Flowchart]: flowchart,
  [DiagramType.ERDiagram]: erDiagram,
  [DiagramType.NetworkTopology]: networkTopology,
  [DiagramType.Timeline]: timeline,
  [DiagramType.Spatial3D]: spatial3D,
};
