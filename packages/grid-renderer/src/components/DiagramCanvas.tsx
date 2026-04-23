'use client';
import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  BackgroundVariant,
  type Node,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { GridIR } from '@chiselgrid/grid-ir';

import { DefaultNode } from './nodes/DefaultNode.js';
import { AWSNode } from './nodes/AWSNode.js';
import { gridIRToReactFlow } from '../utils/gridIRToReactFlow.js';

export interface DiagramCanvasProps {
  gridIR: GridIR;
  onNodeClick?: (nodeId: string) => void;
  className?: string;
}

const NODE_TYPES = {
  default: DefaultNode,
  awsNode: AWSNode,
};

export function DiagramCanvas({ gridIR, onNodeClick, className }: DiagramCanvasProps) {
  const { nodes, edges } = useMemo(() => gridIRToReactFlow(gridIR), [gridIR]);
  const showMiniMap = gridIR.nodes.length > 10;

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node: Node) => {
      if (onNodeClick) onNodeClick(node.id);
    },
    [onNodeClick],
  );

  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodeClick={handleNodeClick}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        {showMiniMap && <MiniMap pannable zoomable />}
      </ReactFlow>
    </div>
  );
}
