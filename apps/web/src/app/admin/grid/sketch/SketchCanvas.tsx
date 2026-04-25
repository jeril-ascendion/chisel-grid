'use client';

import { useEffect, useState } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import {
  gridIRToExcalidraw,
  type GridIR,
  type ExcalidrawElement,
} from '@chiselgrid/grid-ir';

interface SketchCanvasProps {
  gridIR: GridIR | null;
}

interface ExcalidrawAPI {
  updateScene: (scene: { elements: ExcalidrawElement[] }) => void;
}

export default function SketchCanvas({ gridIR }: SketchCanvasProps) {
  const [api, setApi] = useState<ExcalidrawAPI | null>(null);

  useEffect(() => {
    if (!api || !gridIR) return;
    const elements = gridIRToExcalidraw(gridIR);
    api.updateScene({ elements });
  }, [api, gridIR]);

  return (
    <div className="h-full w-full">
      <Excalidraw
        excalidrawAPI={(a) => setApi(a as unknown as ExcalidrawAPI)}
        initialData={{
          appState: {
            viewBackgroundColor: '#ffffff',
            gridSize: null as unknown as number,
          },
        }}
      />
    </div>
  );
}
