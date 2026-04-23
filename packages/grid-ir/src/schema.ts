import { z } from 'zod';
import { DiagramType } from './types';

const GridNodePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const GridNodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  label: z.string().min(1),
  zone: z.string().optional(),
  properties: z.record(z.unknown()).optional(),
  position: GridNodePositionSchema.optional(),
  abstraction_level: z.number().int().positive().optional(),
  parent: z.string().optional(),
  icon: z.string().optional(),
});

export const GridEdgeSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  type: z.string().optional(),
  label: z.string().optional(),
  data_flow: z.string().optional(),
  protocol: z.string().optional(),
  animated: z.boolean().optional(),
  latency_ms: z.number().nonnegative().optional(),
  order: z.number().int().optional(),
});

export const GridZoneSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.string().optional(),
  color: z.string().optional(),
});

export const GridAnnotationSchema = z.object({
  node: z.string().optional(),
  edge: z.string().optional(),
  zone: z.string().optional(),
  type: z.string().min(1),
  text: z.string().min(1),
});

export const GridMetadataSchema = z.object({
  tenant_id: z.string().optional(),
  created_by: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  tags: z.array(z.string()).optional(),
  abstraction_levels_available: z.array(z.number().int().positive()).optional(),
});

export const GridIRSchema = z.object({
  version: z.string().min(1),
  diagram_type: z.nativeEnum(DiagramType),
  abstraction_level: z.number().int().positive().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  nodes: z.array(GridNodeSchema),
  edges: z.array(GridEdgeSchema),
  zones: z.array(GridZoneSchema).optional(),
  annotations: z.array(GridAnnotationSchema).optional(),
  metadata: GridMetadataSchema.optional(),
});
