import type { GridEdge, GridNode } from '@chiselgrid/grid-ir';

export type StreamEvent =
  | {
      kind: 'meta';
      data: {
        title?: string;
        diagram_type?: string;
        abstraction_level?: number;
      };
    }
  | { kind: 'node'; data: GridNode }
  | { kind: 'edge'; data: GridEdge };

export type EmitFn = (event: StreamEvent) => void;

const KEY_LOOKBACK = 32;

export class StreamingGridIRParser {
  private buffer = '';
  private pos = 0;
  private inString = false;
  private escape = false;
  private depth = 0;
  private nodesArrayLevel = -1;
  private edgesArrayLevel = -1;
  private currentNodeStart = -1;
  private currentEdgeStart = -1;
  private metaEmitted = false;
  private emittedNodeIds = new Set<string>();
  private emittedEdgeIds = new Set<string>();

  feed(text: string, emit: EmitFn): void {
    this.buffer += text;
    while (this.pos < this.buffer.length) {
      const c = this.buffer[this.pos];

      if (this.inString) {
        if (this.escape) {
          this.escape = false;
        } else if (c === '\\') {
          this.escape = true;
        } else if (c === '"') {
          this.inString = false;
        }
        this.pos++;
        continue;
      }

      if (c === '"') {
        this.inString = true;
        this.pos++;
        continue;
      }

      if (c === '{') {
        if (this.nodesArrayLevel !== -1 && this.depth === this.nodesArrayLevel) {
          this.currentNodeStart = this.pos;
        } else if (this.edgesArrayLevel !== -1 && this.depth === this.edgesArrayLevel) {
          this.currentEdgeStart = this.pos;
        }
        this.depth++;
        this.pos++;
        continue;
      }

      if (c === '}') {
        this.depth--;
        if (
          this.nodesArrayLevel !== -1 &&
          this.depth === this.nodesArrayLevel &&
          this.currentNodeStart !== -1
        ) {
          this.flushNode(this.buffer.slice(this.currentNodeStart, this.pos + 1), emit);
          this.currentNodeStart = -1;
        } else if (
          this.edgesArrayLevel !== -1 &&
          this.depth === this.edgesArrayLevel &&
          this.currentEdgeStart !== -1
        ) {
          this.flushEdge(this.buffer.slice(this.currentEdgeStart, this.pos + 1), emit);
          this.currentEdgeStart = -1;
        }
        this.pos++;
        continue;
      }

      if (c === '[') {
        const back = this.buffer.slice(Math.max(0, this.pos - KEY_LOOKBACK), this.pos);
        if (/"nodes"\s*:\s*$/.test(back)) {
          this.nodesArrayLevel = this.depth + 1;
          if (!this.metaEmitted) {
            this.emitMeta(emit);
            this.metaEmitted = true;
          }
        } else if (/"edges"\s*:\s*$/.test(back)) {
          this.edgesArrayLevel = this.depth + 1;
        }
        this.depth++;
        this.pos++;
        continue;
      }

      if (c === ']') {
        const closingLevel = this.depth;
        this.depth--;
        if (this.nodesArrayLevel !== -1 && closingLevel === this.nodesArrayLevel) {
          this.nodesArrayLevel = -1;
        } else if (this.edgesArrayLevel !== -1 && closingLevel === this.edgesArrayLevel) {
          this.edgesArrayLevel = -1;
        }
        this.pos++;
        continue;
      }

      this.pos++;
    }
  }

  private flushNode(slice: string, emit: EmitFn): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(slice);
    } catch {
      return;
    }
    if (!parsed || typeof parsed !== 'object') return;
    const node = parsed as GridNode;
    if (typeof node.id !== 'string' || this.emittedNodeIds.has(node.id)) return;
    this.emittedNodeIds.add(node.id);
    emit({ kind: 'node', data: node });
  }

  private flushEdge(slice: string, emit: EmitFn): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(slice);
    } catch {
      return;
    }
    if (!parsed || typeof parsed !== 'object') return;
    const edge = parsed as GridEdge;
    if (typeof edge.id !== 'string' || this.emittedEdgeIds.has(edge.id)) return;
    this.emittedEdgeIds.add(edge.id);
    emit({ kind: 'edge', data: edge });
  }

  private emitMeta(emit: EmitFn): void {
    const meta: { title?: string; diagram_type?: string; abstraction_level?: number } = {};
    const titleMatch = this.buffer.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (titleMatch && titleMatch[1] !== undefined) {
      const captured = titleMatch[1];
      try {
        meta.title = JSON.parse('"' + captured + '"') as string;
      } catch {
        meta.title = captured;
      }
    }
    const typeMatch = this.buffer.match(/"diagram_type"\s*:\s*"([^"]+)"/);
    if (typeMatch && typeMatch[1]) meta.diagram_type = typeMatch[1];
    const levelMatch = this.buffer.match(/"abstraction_level"\s*:\s*(\d+)/);
    if (levelMatch && levelMatch[1]) meta.abstraction_level = parseInt(levelMatch[1], 10);
    emit({ kind: 'meta', data: meta });
  }

  rawBuffer(): string {
    return this.buffer;
  }
}
