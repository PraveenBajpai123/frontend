'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';

// ── Public types (re-exported so progress/page.tsx can import them) ────────────

export interface ConceptGraphNode {
  id: string;
  label: string;
  type: 'topic' | 'subtopic' | 'concept';
  parentId: string | null;
  mastery: number;    // 0-100
  retention: number;  // 0-100
}

export interface ConceptGraphEdge {
  source: string;
  target: string;
  type: 'PART_OF' | 'REQUIRES' | 'RELATED_TO';
}

export interface ConceptGraphData {
  nodes: ConceptGraphNode[];
  edges: ConceptGraphEdge[];
}

interface KnowledgeGraphD3Props {
  /** Hierarchical concept graph from api.graph.getConceptGraph */
  data: ConceptGraphData;
  /** Mode A = mastery gradient, Mode B = retention heatmap */
  colorMode?: 'mastery' | 'retention';
  width?: number;
  height?: number;
}

interface TooltipState {
  x: number;
  y: number;
  node: ConceptGraphNode;
}

// ── Visual constants ───────────────────────────────────────────────────────────

const NODE_R    = { topic: 30, subtopic: 20, concept: 11 } as const;
const CHARGE    = { topic: -700, subtopic: -300, concept: -130 } as const;
const LINK_DIST = { PART_OF: 120, REQUIRES: 80, RELATED_TO: 160 } as const;

// ── Color helpers ──────────────────────────────────────────────────────────────

/** Mastery mode: dark charcoal (0%) → brand lime (100%) */
const masteryColor = d3.scaleSequential(
  [0, 100],
  d3.interpolateRgb('#252525', '#CCEB58')
);

/** Retention mode: urgent red (0%) → healthy green (100%) */
const retentionColor = d3.scaleSequential(
  [0, 100],
  d3.interpolateRgb('#ef4444', '#4ade80')
);

function nodeColor(
  d: ConceptGraphNode,
  mode: 'mastery' | 'retention',
  expandedId: string | null
): string {
  // Topic nodes: white when unselected, lime when their subtopic is expanded
  if (d.type === 'topic') return '#e5e5e5';
  const val = mode === 'mastery' ? d.mastery : d.retention;
  const scale = mode === 'mastery' ? masteryColor : retentionColor;
  // Boost expanded subtopic brightness slightly
  if (d.type === 'subtopic' && d.id === expandedId) return '#CCEB58';
  return scale(val);
}

function nodeStrokeColor(d: ConceptGraphNode, expandedId: string | null): string {
  if (d.type === 'topic') return '#444';
  if (d.id === expandedId) return '#CCEB58';
  return '#333';
}

function nodeLabelFill(d: ConceptGraphNode): string {
  if (d.type === 'topic') return '#141414';
  return '#e5e5e5';
}

// ── Component ──────────────────────────────────────────────────────────────────

export function KnowledgeGraphD3({
  data,
  colorMode = 'mastery',
  width = 1000,
  height = 560,
}: KnowledgeGraphD3Props) {
  const svgRef          = useRef<SVGSVGElement>(null);
  const nodeSelRef      = useRef<d3.Selection<SVGCircleElement, ConceptGraphNode, SVGGElement, unknown> | null>(null);
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [tooltip,    setTooltip]      = useState<TooltipState | null>(null);

  // ── Effect 1: Full simulation rebuild (data / drill-down / size changes) ──

  useEffect(() => {
    if (!svgRef.current) return;
    if (data.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    setTooltip(null);

    // ── Visible node/edge set ──────────────────────────────────────────────

    const visibleNodes: ConceptGraphNode[] = data.nodes.filter((n) => {
      if (n.type === 'topic' || n.type === 'subtopic') return true;
      if (n.type === 'concept') return n.parentId === expandedId;
      return false;
    });

    const visibleSet = new Set(visibleNodes.map((n) => n.id));

    const visibleEdges = data.edges.filter(
      (e) =>
        e.type !== 'PART_OF' &&
        visibleSet.has(e.source as string) &&
        visibleSet.has(e.target as string)
    );

    // Clone for d3 mutation
    const simNodes: any[] = visibleNodes.map((n) => ({ ...n }));
    const simEdges: any[] = visibleEdges.map((e) => ({ ...e }));

    // ── SVG root ───────────────────────────────────────────────────────────

    svg.attr('width', width).attr('height', height);

    // All drawing goes inside this group (zoom transforms it)
    const root = svg.append('g').attr('class', 'root');

    // ── Arrow marker (REQUIRES edges) ──────────────────────────────────────

    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'kg-arrow')
      .attr('markerWidth', 7)
      .attr('markerHeight', 5)
      .attr('refX', 7)
      .attr('refY', 2.5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M 0 0 L 7 2.5 L 0 5 z')
      .attr('fill', '#777');

    // ── Zoom ──────────────────────────────────────────────────────────────

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        root.attr('transform', event.transform.toString());
        const k = event.transform.k;
        // Fade subtopic labels in from zoom >= 0.55
        root.selectAll<SVGTextElement, any>('.lbl-subtopic')
          .attr('opacity', Math.max(0, Math.min(1, (k - 0.45) * 4)));
        // Fade concept labels in from zoom >= 1.1
        root.selectAll<SVGTextElement, any>('.lbl-concept')
          .attr('opacity', Math.max(0, Math.min(1, (k - 1.0) * 5)));
      });

    svg.call(zoom as any);

    // Click SVG background → collapse
    svg.on('click.bg', (event: MouseEvent) => {
      if (event.target === svgRef.current) {
        setExpandedId(null);
        setTooltip(null);
      }
    });

    // ── Force simulation ───────────────────────────────────────────────────

    const simulation = d3.forceSimulation(simNodes)
      .force('link',
        d3.forceLink(simEdges)
          .id((d: any) => d.id)
          .distance((d: any) => LINK_DIST[(d.type as keyof typeof LINK_DIST)] ?? 100)
          .strength(0.4)
      )
      .force('charge',
        d3.forceManyBody()
          .strength((d: any) => CHARGE[(d.type as keyof typeof CHARGE)] ?? -200)
      )
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide',
        d3.forceCollide()
          .radius((d: any) => (NODE_R[(d.type as keyof typeof NODE_R)] ?? 12) + 16)
          .strength(0.7)
      )
      .alpha(expandedId ? 0.55 : 1)
      .alphaDecay(0.025);

    // ── Edges ──────────────────────────────────────────────────────────────

    const edgeG = root.append('g').attr('class', 'edges');

    const edgeSel = edgeG.selectAll('line')
      .data(simEdges)
      .join('line')
      .attr('stroke',          (d: any) => d.type === 'RELATED_TO' ? '#3a3a3a' : '#5a5a5a')
      .attr('stroke-width',    (d: any) => d.type === 'RELATED_TO' ? 1 : 1.5)
      .attr('stroke-dasharray',(d: any) => d.type === 'RELATED_TO' ? '7 5' : null)
      .attr('stroke-opacity',  (d: any) => d.type === 'RELATED_TO' ? 0.35 : 0.65)
      .attr('marker-end',      (d: any) => d.type === 'REQUIRES' ? 'url(#kg-arrow)' : null);

    // ── Nodes ──────────────────────────────────────────────────────────────

    const nodeG = root.append('g').attr('class', 'nodes');

    const nodeSel = nodeG.selectAll<SVGCircleElement, ConceptGraphNode>('circle')
      .data(simNodes)
      .join('circle')
      .attr('r',            (d: any) => NODE_R[(d.type as keyof typeof NODE_R)] ?? 12)
      .attr('fill',         (d: any) => nodeColor(d, colorMode, expandedId))
      .attr('stroke',       (d: any) => nodeStrokeColor(d, expandedId))
      .attr('stroke-width', (d: any) => d.type === 'topic' ? 2.5 : 1.5)
      .attr('cursor',       (d: any) => d.type === 'subtopic' ? 'pointer' : 'grab')
      .attr('opacity', 0.95)
      // ── Tooltip / hover ──────────────────────────────────────────────
      .on('mouseover', (event: MouseEvent, d: any) => {
        d3.select<SVGCircleElement, any>(event.currentTarget as SVGCircleElement)
          .raise().attr('stroke-width', 3).attr('opacity', 1);
        const rect = svgRef.current!.getBoundingClientRect();
        setTooltip({ x: event.clientX - rect.left, y: event.clientY - rect.top, node: d });
      })
      .on('mousemove', (event: MouseEvent) => {
        const rect = svgRef.current!.getBoundingClientRect();
        setTooltip((p) => p ? { ...p, x: event.clientX - rect.left, y: event.clientY - rect.top } : null);
      })
      .on('mouseout', (event: MouseEvent, d: any) => {
        d3.select<SVGCircleElement, any>(event.currentTarget as SVGCircleElement)
          .attr('stroke-width', d.type === 'topic' ? 2.5 : 1.5)
          .attr('opacity', 0.95);
        setTooltip(null);
      })
      // ── Drill-down click ─────────────────────────────────────────────
      .on('click', (event: MouseEvent, d: any) => {
        event.stopPropagation();
        if (d.type === 'subtopic') {
          setExpandedId((prev) => (prev === d.id ? null : d.id));
          setTooltip(null);
        }
      })
      // ── Drag ─────────────────────────────────────────────────────────
      .call(
        d3.drag<SVGCircleElement, any>()
          .on('start', (event: d3.D3DragEvent<SVGCircleElement, any, any>, d: any) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on('drag',  (event: d3.D3DragEvent<SVGCircleElement, any, any>, d: any) => { d.fx = event.x; d.fy = event.y; })
          .on('end',   (event: d3.D3DragEvent<SVGCircleElement, any, any>, d: any) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
          }) as any
      );

    // Store ref so Effect 2 can update colors independently
    nodeSelRef.current = nodeSel as any;

    // ── Labels ─────────────────────────────────────────────────────────────

    const labelG = root.append('g').attr('pointer-events', 'none');

    const labelSel = labelG.selectAll('text')
      .data(simNodes)
      .join('text')
      .attr('class',             (d: any) => `lbl-${d.type}`)
      .attr('text-anchor',       'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-family',       "'Inter', sans-serif")
      .attr('font-size',         (d: any) => d.type === 'topic' ? '10px' : d.type === 'subtopic' ? '8.5px' : '7.5px')
      .attr('font-weight',       (d: any) => d.type === 'concept' ? '500' : '700')
      .attr('fill',              (d: any) => nodeLabelFill(d))
      .attr('opacity',           (d: any) => d.type === 'topic' ? 1 : 0)
      .text((d: any) => {
        const s: string = d.label ?? '';
        const max = d.type === 'topic' ? 10 : d.type === 'subtopic' ? 9 : 13;
        return s.length > max ? s.slice(0, max - 1) + '…' : s;
      });

    // ── Simulation tick ────────────────────────────────────────────────────

    const pad = 44;
    simulation.on('tick', () => {
      // REQUIRES edges: offset x2/y2 so arrow tip lands at circle edge
      edgeSel
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => {
          if (d.type !== 'REQUIRES') return d.target.x;
          const dx = d.target.x - d.source.x, dy = d.target.y - d.source.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          return d.target.x - (dx / len) * ((NODE_R[d.target.type as keyof typeof NODE_R] ?? 12) + 9);
        })
        .attr('y2', (d: any) => {
          if (d.type !== 'REQUIRES') return d.target.y;
          const dx = d.target.x - d.source.x, dy = d.target.y - d.source.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          return d.target.y - (dy / len) * ((NODE_R[d.target.type as keyof typeof NODE_R] ?? 12) + 9);
        });

      const cx = (d: any) => Math.max(pad, Math.min(width - pad, d.x));
      const cy = (d: any) => Math.max(pad, Math.min(height - pad, d.y));

      nodeSel.attr('cx', cx).attr('cy', cy);
      labelSel.attr('x', cx).attr('y', cy);
    });

    return () => {
      simulation.stop();
      svg.on('.zoom', null);
      svg.on('click.bg', null);
    };
  // colorMode intentionally excluded — handled by Effect 2 via smooth D3 transition
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, expandedId, width, height]);

  // ── Effect 2: Smooth color transition when mode toggle changes ─────────────

  useEffect(() => {
    if (!nodeSelRef.current) return;
    (nodeSelRef.current as any)
      .transition()
      .duration(450)
      .ease(d3.easeCubicInOut)
      .attr('fill', (d: ConceptGraphNode) => nodeColor(d, colorMode, expandedId));
  // expandedId is stable from the perspective of a mode-only toggle
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorMode]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="relative w-full select-none overflow-hidden"
      style={{ background: '#141414', borderRadius: '1rem', border: '1px solid #222' }}
    >
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full"
        style={{ cursor: 'grab', display: 'block' }}
      />

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            key="tooltip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="pointer-events-none absolute z-20 rounded-xl shadow-2xl px-4 py-3"
            style={{
              left: Math.min(tooltip.x + 16, width - 210),
              top:  Math.max(8, tooltip.y - 14),
              background: '#1e1e1e',
              border: '1px solid #2e2e2e',
              minWidth: '160px',
            }}
          >
            <p className="font-bold text-white text-sm leading-snug mb-0.5 truncate max-w-[180px]">
              {tooltip.node.label}
            </p>
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: '#555' }}>
              {tooltip.node.type}
              {tooltip.node.type === 'subtopic' && (
                <span className="ml-1" style={{ color: '#CCEB58' }}>· click to expand</span>
              )}
            </p>
            <div className="flex gap-4">
              <div>
                <p className="text-[9px] uppercase tracking-wide text-gray-600">Mastery</p>
                <p className="font-black text-lg leading-none" style={{ color: '#CCEB58' }}>
                  {tooltip.node.mastery}%
                </p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wide text-gray-600">Retention</p>
                <p className="font-black text-lg leading-none" style={{ color: '#4ade80' }}>
                  {tooltip.node.retention}%
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drill-down breadcrumb hint */}
      <AnimatePresence>
        {expandedId && (
          <motion.div
            key="hint"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute top-4 left-4 text-xs px-3 py-1.5 rounded-full font-semibold"
            style={{
              background: 'rgba(204,235,88,0.1)',
              color: '#CCEB58',
              border: '1px solid rgba(204,235,88,0.18)',
            }}
          >
            🔍 Concept view — click background to collapse
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zoom hint */}
      {!expandedId && data.nodes.length > 0 && (
        <div
          className="absolute bottom-4 right-4 text-[10px] font-semibold"
          style={{ color: '#333' }}
        >
          Scroll to zoom · Drag to pan · Click subtopic to expand concepts
        </div>
      )}

      {/* Empty state */}
      {data.nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <span className="text-4xl">🌐</span>
          <p className="text-gray-600 text-sm text-center max-w-xs leading-relaxed">
            Your knowledge graph will appear here after your first quiz.
          </p>
        </div>
      )}
    </div>
  );
}
