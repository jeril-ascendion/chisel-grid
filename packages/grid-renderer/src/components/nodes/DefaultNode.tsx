'use client';
import { Handle, Position, type NodeProps } from '@xyflow/react';

const ZONE_BG: Record<string, string> = {
  public: '#EFF6FF',
  private: '#F0FDF4',
  data: '#FFF7ED',
  database: '#FFF7ED',
  dmz: '#FEF3C7',
  compliance: '#FEF2F2',
  internal: '#F1F5F9',
  external: '#F5F3FF',
  default: '#F8F7F5',
};

const ZONE_BORDER: Record<string, string> = {
  public: '#3b82f6',
  private: '#22c55e',
  data: '#f97316',
  database: '#f97316',
  dmz: '#f59e0b',
  compliance: '#ef4444',
  internal: '#64748b',
  external: '#8b5cf6',
};

function prettyType(nodeType: string): string {
  if (!nodeType) return '';
  const stripped = nodeType.replace(/^aws\./, '');
  return stripped.replace(/_/g, ' ');
}

export function DefaultNode({ data, selected }: NodeProps) {
  const label = typeof data?.label === 'string' ? data.label : '';
  const zone = typeof data?.zone === 'string' ? data.zone : '';
  const nodeType = typeof data?.nodeType === 'string' ? data.nodeType : '';
  const bg = ZONE_BG[zone] ?? ZONE_BG.default;
  const border = ZONE_BORDER[zone] ?? '#cbd5e1';
  return (
    <div
      style={{
        padding: '10px 14px',
        borderRadius: 10,
        background: bg,
        color: '#0f172a',
        border: selected ? `2px solid ${border}` : `1px solid ${border}`,
        boxShadow: selected
          ? `0 0 0 3px ${border}33`
          : '0 1px 2px rgba(15, 23, 42, 0.08)',
        fontFamily: 'IBM Plex Sans, sans-serif',
        minWidth: 140,
        maxWidth: 220,
        textAlign: 'center',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: border }} />
      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{label}</div>
      {nodeType && (
        <div
          style={{
            fontSize: 10,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: 0.4,
            marginTop: 2,
          }}
        >
          {prettyType(nodeType)}
        </div>
      )}
      {zone && (
        <div
          style={{
            display: 'inline-block',
            marginTop: 6,
            padding: '1px 8px',
            fontSize: 10,
            fontWeight: 600,
            borderRadius: 999,
            background: border,
            color: '#ffffff',
            textTransform: 'uppercase',
            letterSpacing: 0.4,
          }}
        >
          {zone}
        </div>
      )}
      <Handle type="source" position={Position.Right} style={{ background: border }} />
    </div>
  );
}
