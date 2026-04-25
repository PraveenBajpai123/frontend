'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';

interface Node {
  id: string;
  label: string;
  mastery: number;
  level: number;
}

interface Link {
  source: string;
  target: string;
}

interface KnowledgeGraphD3Props {
  nodes: Node[];
  links: Link[];
  width?: number;
  height?: number;
}

export function KnowledgeGraphD3({
  nodes,
  links,
  width = 1000,
  height = 600,
}: KnowledgeGraphD3Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create force simulation
    const simulation = d3
      .forceSimulation(nodes as any)
      .force(
        'link',
        d3
          .forceLink(links as any)
          .id((d: any) => d.id)
          .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2));

    // Draw links
    const link = svg
      .selectAll('.link')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', '#CCEB58')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2);

    // Draw nodes
    const node = svg
      .selectAll('.node')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('class', 'node')
      .attr('r', (d: any) => 20 + d.mastery * 2)
      .attr('fill', (d: any) => {
        if (d.mastery >= 80) return '#CCEB58';
        if (d.mastery >= 50) return '#EDF8C3';
        return '#E5E5E5';
      })
      .attr('stroke', '#222222')
      .attr('stroke-width', 2)
      .call(drag(simulation) as any);

    // Add labels
    const label = svg
      .selectAll('.label')
      .data(nodes)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-family', "'Reddit Sans', sans-serif")
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .attr('fill', '#222222')
      .text((d: any) => d.label);

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y);

      label.attr('x', (d: any) => d.x).attr('y', (d: any) => d.y);
    });

    // Drag behavior
    function drag(simulation: any) {
      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      return d3
        .drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
    }

    return () => {
      simulation.stop();
    };
  }, [nodes, links, width, height]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full bg-white rounded-lg border border-border p-6 shadow-rv"
    >
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full border border-border rounded-lg bg-white"
        style={{ cursor: 'grab' }}
      />
      <div className="mt-4 flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-rv-lime" />
          <span className="text-foreground">Expert (80%+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-rv-lime-light" />
          <span className="text-foreground">Proficient (50%+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-muted" />
          <span className="text-foreground">Learning ({'<'}50%)</span>
        </div>
      </div>
    </motion.div>
  );
}
