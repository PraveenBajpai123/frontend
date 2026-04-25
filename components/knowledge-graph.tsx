"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { motion } from "framer-motion";

interface GraphNode {
  id: string;
  title: string;
  mastery: number;
  x?: number;
  y?: number;
}

interface GraphEdge {
  source: string;
  target: string;
}

interface KnowledgeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface KnowledgeGraphProps {
  data: KnowledgeGraphData;
}

export default function KnowledgeGraph({ data }: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const width = svgRef.current.clientWidth;
    const height = 500;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    // Create simulation
    const simulation = d3
      .forceSimulation(data.nodes as any)
      .force(
        "link",
        d3
          .forceLink(
            data.edges.map((edge) => ({
              source: data.nodes.find((n) => n.id === edge.source),
              target: data.nodes.find((n) => n.id === edge.target),
            }))
          )
          .id((d: any) => d.id)
          .distance(100)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    // Add defs for gradients
    const defs = svg.append("defs");

    // Gradient for high mastery
    defs
      .append("linearGradient")
      .attr("id", "gradient-high")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "100%")
      .selectAll("stop")
      .data([
        { offset: "0%", color: "#6366f1" },
        { offset: "100%", color: "#14b8a6" },
      ])
      .enter()
      .append("stop")
      .attr("offset", (d: any) => d.offset)
      .attr("stop-color", (d: any) => d.color);

    // Gradient for medium mastery
    defs
      .append("linearGradient")
      .attr("id", "gradient-medium")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "100%")
      .selectAll("stop")
      .data([
        { offset: "0%", color: "#ec4899" },
        { offset: "100%", color: "#f59e0b" },
      ])
      .enter()
      .append("stop")
      .attr("offset", (d: any) => d.offset)
      .attr("stop-color", (d: any) => d.color);

    // Links
    const links = svg
      .append("g")
      .selectAll("line")
      .data(data.edges)
      .join("line")
      .attr("stroke", "#334155")
      .attr("stroke-width", 2)
      .attr("opacity", 0.6);

    // Nodes
    const nodes = svg
      .append("g")
      .selectAll("circle")
      .data(data.nodes)
      .join("circle")
      .attr("r", (d: any) => 20 + (d.mastery / 100) * 20)
      .attr("fill", (d: any) =>
        d.mastery >= 75
          ? "url(#gradient-high)"
          : d.mastery >= 50
            ? "url(#gradient-medium)"
            : "#334155"
      )
      .attr("stroke", "#1e293b")
      .attr("stroke-width", 3)
      .attr("cursor", "pointer")
      .on("mouseenter", function (d: any) {
        setHoveredNode(d.target.__data__.id);
        d3.select(this)
          .attr("stroke-width", 4)
          .attr("opacity", 1);
      })
      .on("mouseleave", function () {
        setHoveredNode(null);
        d3.select(this)
          .attr("stroke-width", 3)
          .attr("opacity", 0.8);
      });

    // Labels
    const labels = svg
      .append("g")
      .selectAll("text")
      .data(data.nodes)
      .join("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.3em")
      .attr("fill", "#f1f5f9")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .attr("pointer-events", "none")
      .text((d: any) => d.mastery + "%");

    // Update positions on simulation tick
    simulation.on("tick", () => {
      links
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      nodes
        .attr("cx", (d: any) => Math.max(40, Math.min(width - 40, d.x)))
        .attr("cy", (d: any) => Math.max(40, Math.min(height - 40, d.y)));

      labels
        .attr("x", (d: any) => Math.max(40, Math.min(width - 40, d.x)))
        .attr("y", (d: any) => Math.max(40, Math.min(height - 40, d.y)));
    });

    return () => {
      simulation.stop();
    };
  }, [data]);

  return (
    <div className="bg-surface rounded-lg p-6 border border-surface-light">
      <svg
        ref={svgRef}
        className="w-full"
        style={{ minHeight: "500px", background: "#0f172a" }}
      />

      {/* Legend */}
      <motion.div
        className="mt-6 grid grid-cols-3 gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-teal-500" />
          <span className="text-muted-text text-sm">75-100% Mastery</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-amber-500" />
          <span className="text-muted-text text-sm">50-75% Mastery</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-surface-light" />
          <span className="text-muted-text text-sm">Below 50% Mastery</span>
        </div>
      </motion.div>
    </div>
  );
}
