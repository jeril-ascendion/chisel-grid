'use client';

export interface DiagramToolbarProps {
  diagramType: string;
  onDiagramTypeChange: (type: string) => void;
  onExportPNG: () => void;
  onExportDrawio?: () => void;
  onExportExcalidraw?: () => void;
}

export interface DiagramTypeOption {
  value: string;
  label: string;
}

export const DIAGRAM_TYPES: DiagramTypeOption[] = [
  { value: 'aws_architecture', label: 'AWS Architecture' },
  { value: 'c4_context', label: 'C4 Context' },
  { value: 'c4_container', label: 'C4 Container' },
  { value: 'sequence', label: 'Sequence' },
  { value: 'flowchart', label: 'Flow' },
];

const PRIMARY_BUTTON: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 8,
  border: '1px solid #0f172a',
  background: '#0f172a',
  color: '#ffffff',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

const SECONDARY_BUTTON: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  color: '#0f172a',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

export function DiagramToolbar({
  diagramType,
  onDiagramTypeChange,
  onExportPNG,
  onExportDrawio,
  onExportExcalidraw,
}: DiagramToolbarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '8px 12px',
        borderBottom: '1px solid #e2e8f0',
        background: '#ffffff',
      }}
    >
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {DIAGRAM_TYPES.map((opt) => {
          const active = opt.value === diagramType;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onDiagramTypeChange(opt.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: active ? '1px solid #2563eb' : '1px solid transparent',
                background: active ? '#eff6ff' : 'transparent',
                color: active ? '#1d4ed8' : '#334155',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {onExportExcalidraw && (
          <button type="button" onClick={onExportExcalidraw} style={SECONDARY_BUTTON}>
            Export Sketch
          </button>
        )}
        {onExportDrawio && (
          <button type="button" onClick={onExportDrawio} style={SECONDARY_BUTTON}>
            Export Draw.io
          </button>
        )}
        <button type="button" onClick={onExportPNG} style={PRIMARY_BUTTON}>
          Export PNG
        </button>
      </div>
    </div>
  );
}
