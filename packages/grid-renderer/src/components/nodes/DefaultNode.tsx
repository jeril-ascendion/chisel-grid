'use client';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export function DefaultNode({ data, selected }: NodeProps) {
  const label = typeof data?.label === 'string' ? data.label : '';
  return (
    <div
      style={{
        padding: '10px 16px',
        borderRadius: 10,
        background: '#ffffff',
        color: '#0f172a',
        border: selected ? '2px solid #2563eb' : '1px solid #cbd5e1',
        boxShadow: selected ? '0 0 0 3px rgba(37, 99, 235, 0.25)' : '0 1px 2px rgba(15, 23, 42, 0.08)',
        fontSize: 13,
        fontWeight: 500,
        minWidth: 120,
        textAlign: 'center',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#94a3b8' }} />
      <div>{label}</div>
      <Handle type="source" position={Position.Right} style={{ background: '#94a3b8' }} />
    </div>
  );
}
