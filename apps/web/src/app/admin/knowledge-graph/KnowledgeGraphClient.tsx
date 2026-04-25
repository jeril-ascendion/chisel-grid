'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';

type NodeType = 'article' | 'diagram' | 'session' | 'decision';

interface GraphNode {
  id: string;
  title: string;
  type: NodeType;
  timesReferenced: number;
  createdAt: string;
}

interface GraphEdge {
  source: string;
  target: string;
  relationType: string;
}

interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface SimNode extends GraphNode, d3.SimulationNodeDatum {}
interface SimEdge extends d3.SimulationLinkDatum<SimNode> {
  relationType: string;
}

const TYPE_COLORS: Record<NodeType, string> = {
  article: '#3B82F6',
  diagram: '#F97316',
  session: '#A855F7',
  decision: '#22C55E',
};

const TYPE_LABELS: Record<NodeType, string> = {
  article: 'Articles',
  diagram: 'Diagrams',
  session: 'Sessions',
  decision: 'Decisions',
};

const ALL_TYPES: NodeType[] = ['article', 'diagram', 'session', 'decision'];

function nodeRadius(timesReferenced: number, maxRef: number): number {
  if (maxRef <= 0) return 8;
  const scale = Math.sqrt(timesReferenced / maxRef);
  return 8 + scale * 32;
}

function hrefFor(node: GraphNode): string | null {
  switch (node.type) {
    case 'article':
    case 'decision':
      return `/admin/content/${node.id}`;
    case 'diagram':
      return `/admin/grid/architecture?diagram=${node.id}`;
    case 'session':
      return `/admin/chamber?session=${node.id}`;
    default:
      return null;
  }
}

export function KnowledgeGraphClient() {
  const [data, setData] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [enabledTypes, setEnabledTypes] = useState<Record<NodeType, boolean>>({
    article: true,
    diagram: true,
    session: true,
    decision: true,
  });
  const [showOrphans, setShowOrphans] = useState(true);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [hover, setHover] = useState<{
    node: GraphNode;
    x: number;
    y: number;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const simRef = useRef<d3.Simulation<SimNode, SimEdge> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/admin/knowledge-graph?limit=400')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json: GraphResponse) => {
        if (cancelled) return;
        setData(json);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const referencedIds = useMemo(() => {
    if (!data) return new Set<string>();
    const set = new Set<string>();
    for (const e of data.edges) {
      set.add(e.source);
      set.add(e.target);
    }
    return set;
  }, [data]);

  const filtered = useMemo<GraphResponse | null>(() => {
    if (!data) return null;
    const visible = data.nodes.filter((n) => {
      if (!enabledTypes[n.type]) return false;
      const hasEdges = referencedIds.has(n.id) || n.timesReferenced > 0;
      if (!hasEdges && !showOrphans) return false;
      return true;
    });
    const visibleIds = new Set(visible.map((n) => n.id));
    const visibleEdges = data.edges.filter(
      (e) => visibleIds.has(e.source) && visibleIds.has(e.target),
    );
    return { nodes: visible, edges: visibleEdges };
  }, [data, enabledTypes, showOrphans, referencedIds]);

  useEffect(() => {
    if (!filtered || !svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    svg.selectAll('*').remove();

    const root = svg.append('g').attr('class', 'graph-root');

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        root.attr('transform', event.transform.toString());
      });
    zoomRef.current = zoom;
    svg.call(zoom);

    const maxRef = Math.max(0, ...filtered.nodes.map((n) => n.timesReferenced));

    const simNodes: SimNode[] = filtered.nodes.map((n) => ({ ...n }));
    const idToNode = new Map(simNodes.map((n) => [n.id, n]));
    const simEdges: SimEdge[] = [];
    for (const e of filtered.edges) {
      const s = idToNode.get(e.source);
      const t = idToNode.get(e.target);
      if (!s || !t) continue;
      simEdges.push({ source: s, target: t, relationType: e.relationType });
    }

    const sim = d3
      .forceSimulation<SimNode, SimEdge>(simNodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimEdge>(simEdges)
          .id((d) => d.id)
          .distance(70)
          .strength(0.4),
      )
      .force('charge', d3.forceManyBody<SimNode>().strength(-180))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collision',
        d3
          .forceCollide<SimNode>()
          .radius((d) => nodeRadius(d.timesReferenced, maxRef) + 6),
      );
    simRef.current = sim;

    const link = root
      .append('g')
      .attr('class', 'links')
      .attr('stroke', '#9CA3AF')
      .attr('stroke-opacity', 0.4)
      .selectAll('line')
      .data(simEdges)
      .join('line')
      .attr('stroke-width', 1);

    const node = root
      .append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, SimNode>('g')
      .data(simNodes)
      .join('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer');

    node
      .append('circle')
      .attr('r', (d) => nodeRadius(d.timesReferenced, maxRef))
      .attr('fill', (d) => TYPE_COLORS[d.type])
      .attr('fill-opacity', (d) =>
        d.timesReferenced === 0 && !referencedIds.has(d.id) ? 0.35 : 0.9,
      )
      .attr('stroke', (d) => TYPE_COLORS[d.type])
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', (d) =>
        d.timesReferenced === 0 && !referencedIds.has(d.id) ? '3 3' : null,
      );

    node
      .append('text')
      .text((d) =>
        d.title.length > 28 ? `${d.title.slice(0, 28)}…` : d.title,
      )
      .attr('x', 0)
      .attr('y', (d) => nodeRadius(d.timesReferenced, maxRef) + 12)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('font-family', 'system-ui, -apple-system, sans-serif')
      .attr('fill', 'currentColor')
      .attr('pointer-events', 'none');

    node.on('mousemove', (event: MouseEvent, d: SimNode) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setHover({
        node: d,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    });
    node.on('mouseleave', () => setHover(null));
    node.on('click', (_event: MouseEvent, d: SimNode) => {
      setSelected({
        id: d.id,
        title: d.title,
        type: d.type,
        timesReferenced: d.timesReferenced,
        createdAt: d.createdAt,
      });
    });

    const drag = d3
      .drag<SVGGElement, SimNode>()
      .on('start', (event, d) => {
        if (!event.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) sim.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
    node.call(drag);

    sim.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as SimNode).x ?? 0)
        .attr('y1', (d) => (d.source as SimNode).y ?? 0)
        .attr('x2', (d) => (d.target as SimNode).x ?? 0)
        .attr('y2', (d) => (d.target as SimNode).y ?? 0);
      node.attr('transform', (d) => `translate(${d.x ?? 0}, ${d.y ?? 0})`);
    });

    return () => {
      sim.stop();
    };
  }, [filtered, referencedIds]);

  const resetZoom = () => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(400)
      .call(zoomRef.current.transform, d3.zoomIdentity);
  };

  const toggleType = (t: NodeType) =>
    setEnabledTypes((prev) => ({ ...prev, [t]: !prev[t] }));

  const isEmpty = !loading && !error && data && data.nodes.length === 0;

  return (
    <div className="flex h-[calc(100vh-180px)] gap-4">
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5">
          <div className="flex items-center gap-3">
            {ALL_TYPES.map((t) => (
              <label
                key={t}
                className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={enabledTypes[t]}
                  onChange={() => toggleType(t)}
                  className="h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-600"
                />
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: TYPE_COLORS[t] }}
                  aria-hidden="true"
                />
                <span>{TYPE_LABELS[t]}</span>
              </label>
            ))}
          </div>
          <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
          <label className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showOrphans}
              onChange={(e) => setShowOrphans(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-600"
            />
            <span>Show orphans</span>
          </label>
          <div className="ml-auto flex items-center gap-2">
            {data && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {filtered?.nodes.length ?? 0} nodes · {filtered?.edges.length ?? 0} edges
              </span>
            )}
            <button
              type="button"
              onClick={resetZoom}
              className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Reset zoom
            </button>
          </div>
        </div>

        <div
          ref={containerRef}
          className="relative flex-1 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="grid grid-cols-6 gap-3 opacity-60 animate-pulse"
                aria-busy="true"
                aria-label="Loading knowledge graph"
              >
                {Array.from({ length: 18 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700"
                  />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-red-600 dark:text-red-400">
              Failed to load graph: {error}
            </div>
          )}

          {isEmpty && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
              <p className="max-w-md text-sm text-gray-600 dark:text-gray-400">
                No connections yet. Create links between articles and diagrams to
                see them appear here.
              </p>
            </div>
          )}

          <svg
            ref={svgRef}
            className="h-full w-full text-gray-700 dark:text-gray-300"
            role="img"
            aria-label="Knowledge graph"
          />

          {hover && (
            <div
              className="pointer-events-none absolute z-10 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-xs shadow-md"
              style={{
                left: hover.x + 12,
                top: hover.y + 12,
                maxWidth: 280,
              }}
            >
              <div className="font-medium text-gray-900 dark:text-white">
                {hover.node.title}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: TYPE_COLORS[hover.node.type] }}
                  aria-hidden="true"
                />
                <span className="capitalize">{hover.node.type}</span>
                <span>·</span>
                <span>{hover.node.timesReferenced} refs</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <aside className="w-80 shrink-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: TYPE_COLORS[selected.type] }}
                  aria-hidden="true"
                />
                <span className="capitalize">{selected.type}</span>
              </div>
              <h2 className="mt-1 break-words text-base font-semibold text-gray-900 dark:text-white">
                {selected.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              aria-label="Close panel"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <dl className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Times referenced</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {selected.timesReferenced}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Created</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {new Date(selected.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </dd>
            </div>
          </dl>
          {hrefFor(selected) && (
            <a
              href={hrefFor(selected) ?? '#'}
              className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              Open
            </a>
          )}
        </aside>
      )}
    </div>
  );
}

export default KnowledgeGraphClient;
