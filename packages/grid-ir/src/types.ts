export enum DiagramType {
  AWSArchitecture = 'aws_architecture',
  C4Context = 'c4_context',
  C4Container = 'c4_container',
  C4Component = 'c4_component',
  Sequence = 'sequence',
  Flowchart = 'flowchart',
  ERDiagram = 'er_diagram',
  NetworkTopology = 'network_topology',
  Timeline = 'timeline',
  Spatial3D = 'spatial_3d',
}

export enum AbstractionLevel {
  Context = 1,
  Container = 2,
  Component = 3,
  Code = 4,
}

export enum NodeType {
  AWSAPIGateway = 'aws.api_gateway',
  AWSLambda = 'aws.lambda',
  AWSAurora = 'aws.aurora',
  AWSRDS = 'aws.rds',
  AWSDynamoDB = 'aws.dynamodb',
  AWSS3 = 'aws.s3',
  AWSCloudFront = 'aws.cloudfront',
  AWSSQS = 'aws.sqs',
  AWSSNS = 'aws.sns',
  AWSStepFunctions = 'aws.step_functions',
  AWSCognito = 'aws.cognito',
  AWSBedrock = 'aws.bedrock',
  AWSECS = 'aws.ecs',
  AWSEKS = 'aws.eks',
  AWSEC2 = 'aws.ec2',
  AWSEventBridge = 'aws.eventbridge',
  AWSSecretsManager = 'aws.secrets_manager',
  AWSPolly = 'aws.polly',
  Service = 'service',
  Container = 'container',
  Component = 'component',
  System = 'system',
  Database = 'database',
  DataStore = 'data_store',
  User = 'user',
  Actor = 'actor',
  External = 'external',
  Process = 'process',
  Decision = 'decision',
  Start = 'start',
  End = 'end',
  Entity = 'entity',
}

export enum EdgeType {
  Invoke = 'invoke',
  Request = 'request',
  Response = 'response',
  Async = 'async',
  Event = 'event',
  DataFlow = 'data_flow',
  DependsOn = 'depends_on',
  Uses = 'uses',
  Reads = 'reads',
  Writes = 'writes',
  Publishes = 'publishes',
  Subscribes = 'subscribes',
  Relates = 'relates',
}

export enum ZoneType {
  Public = 'public',
  Private = 'private',
  DMZ = 'dmz',
  Database = 'database',
  Application = 'application',
  Presentation = 'presentation',
  Compliance = 'compliance',
  Internal = 'internal',
  External = 'external',
}

export interface GridNodePosition {
  x: number;
  y: number;
}

export interface GridNode {
  id: string;
  type: NodeType | string;
  label: string;
  zone?: string;
  properties?: Record<string, unknown>;
  position?: GridNodePosition;
  abstraction_level?: number;
  parent?: string;
  icon?: string;
}

export interface GridEdge {
  id: string;
  from: string;
  to: string;
  type?: EdgeType | string;
  label?: string;
  data_flow?: string;
  protocol?: string;
  animated?: boolean;
  latency_ms?: number;
  order?: number;
}

export interface GridZone {
  id: string;
  label: string;
  type?: ZoneType | string;
  color?: string;
}

export interface GridAnnotation {
  node?: string;
  edge?: string;
  zone?: string;
  type: string;
  text: string;
}

export interface GridMetadata {
  tenant_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  tags?: string[];
  abstraction_levels_available?: number[];
}

export interface GridIR {
  version: string;
  diagram_type: DiagramType;
  abstraction_level?: number;
  title: string;
  description?: string;
  nodes: GridNode[];
  edges: GridEdge[];
  zones?: GridZone[];
  annotations?: GridAnnotation[];
  metadata?: GridMetadata;
}
