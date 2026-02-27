"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

import type { CrisisNode, CrisisEdge, CrisisChain, CategoryKey } from "@/lib/types";

interface ChainVisualizationProps {
  nodes: CrisisNode[];
  edges: CrisisEdge[];
  chains: CrisisChain[];
  selectedChainId: string | null;
  selectedNodeId: CategoryKey | null;
  onChainSelect: (chainId: string | null) => void;
  onNodeSelect: (nodeId: CategoryKey) => void;
}

// Pentagon node positions (center: 150, 120, radius: 80)
const NODE_POSITIONS: Record<CategoryKey, { x: number; y: number }> = {
  prices: { x: 150, y: 35 },         // Top
  employment: { x: 226, y: 91 },     // Top-right
  selfEmployed: { x: 197, y: 175 },  // Bottom-right
  finance: { x: 103, y: 175 },       // Bottom-left
  realEstate: { x: 74, y: 91 },      // Top-left
};

const NODE_RADIUS = 22;

function getSeverityFill(score: number): string {
  if (score >= 80) return "var(--danger)";
  if (score >= 60) return "var(--warning)";
  if (score >= 40) return "var(--caution)";
  return "var(--safe)";
}

function getStrengthStyle(strength: "strong" | "moderate" | "weak") {
  switch (strength) {
    case "strong":
      return { strokeWidth: 2.5, strokeDasharray: "none" };
    case "moderate":
      return { strokeWidth: 1.5, strokeDasharray: "none" };
    case "weak":
      return { strokeWidth: 1, strokeDasharray: "4 2" };
  }
}

export function ChainVisualization({
  nodes,
  edges,
  chains,
  selectedChainId,
  selectedNodeId,
  onChainSelect,
  onNodeSelect,
}: ChainVisualizationProps) {
  const selectedChain = selectedChainId
    ? chains.find((c) => c.id === selectedChainId)
    : null;

  // Active chains for highlighting
  const activeChains = chains.filter((c) => c.currentlyActive);

  // Determine which edges are part of selected or active chains
  const activeEdgeSet = useMemo(() => {
    const set = new Set<string>();
    const chainsToHighlight = selectedChain ? [selectedChain] : activeChains;

    chainsToHighlight.forEach((chain) => {
      for (let i = 0; i < chain.path.length - 1; i++) {
        set.add(`${chain.path[i]}-${chain.path[i + 1]}`);
      }
    });

    return set;
  }, [selectedChain, activeChains]);

  // Determine which nodes are part of selected or active chains
  const activeNodeSet = useMemo(() => {
    const set = new Set<CategoryKey>();
    const chainsToHighlight = selectedChain ? [selectedChain] : activeChains;

    chainsToHighlight.forEach((chain) => {
      chain.path.forEach((nodeId) => set.add(nodeId as CategoryKey));
    });

    return set;
  }, [selectedChain, activeChains]);

  // Calculate edge path with curve
  const getEdgePath = (from: CategoryKey, to: CategoryKey) => {
    const start = NODE_POSITIONS[from];
    const end = NODE_POSITIONS[to];

    // Calculate direction vector
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Normalize and offset start/end from node center
    const offsetStart = {
      x: start.x + (dx / dist) * NODE_RADIUS,
      y: start.y + (dy / dist) * NODE_RADIUS,
    };
    const offsetEnd = {
      x: end.x - (dx / dist) * (NODE_RADIUS + 6), // Extra space for arrow
      y: end.y - (dy / dist) * (NODE_RADIUS + 6),
    };

    // Calculate control point for quadratic curve
    const midX = (offsetStart.x + offsetEnd.x) / 2;
    const midY = (offsetStart.y + offsetEnd.y) / 2;
    // Perpendicular offset for curve
    const perpX = -dy / dist * 15;
    const perpY = dx / dist * 15;

    return {
      path: `M ${offsetStart.x} ${offsetStart.y} Q ${midX + perpX} ${midY + perpY} ${offsetEnd.x} ${offsetEnd.y}`,
      endX: offsetEnd.x,
      endY: offsetEnd.y,
      angle: Math.atan2(dy, dx) * (180 / Math.PI),
    };
  };

  return (
    <div className="relative">
      <svg
        viewBox="0 0 300 210"
        className="w-full h-auto"
        style={{ maxWidth: "300px", margin: "0 auto", display: "block" }}
      >
        <defs>
          {/* Arrow marker */}
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon
              points="0 0, 8 3, 0 6"
              fill="var(--muted-foreground)"
              opacity="0.6"
            />
          </marker>
          <marker
            id="arrowhead-active"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="var(--danger)" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((edge) => {
          const edgeKey = `${edge.from}-${edge.to}`;
          const isActive = activeEdgeSet.has(edgeKey);
          const { path } = getEdgePath(edge.from, edge.to);
          const style = getStrengthStyle(edge.strength);

          return (
            <path
              key={edgeKey}
              d={path}
              fill="none"
              stroke={isActive ? "var(--danger)" : "var(--muted-foreground)"}
              strokeWidth={style.strokeWidth}
              strokeDasharray={style.strokeDasharray}
              opacity={isActive ? 1 : 0.4}
              markerEnd={isActive ? "url(#arrowhead-active)" : "url(#arrowhead)"}
              className={cn(isActive && "animate-chain-flow")}
              style={
                isActive
                  ? { strokeDasharray: "10 10", strokeDashoffset: 0 }
                  : {}
              }
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const pos = NODE_POSITIONS[node.id];
          const isActive = activeNodeSet.has(node.id);
          const isSelected = selectedNodeId === node.id;

          return (
            <g
              key={node.id}
              className={cn(
                "cursor-pointer transition-transform",
                isActive && !isSelected && "animate-chain-pulse"
              )}
              style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
              onClick={() => onNodeSelect(node.id)}
            >
              {/* Selection ring */}
              {isSelected && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={NODE_RADIUS + 4}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  className="animate-spin"
                  style={{ animationDuration: "8s" }}
                />
              )}
              {/* Node circle */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={NODE_RADIUS}
                fill={getSeverityFill(node.score)}
                opacity={isSelected ? 1 : isActive ? 1 : 0.7}
                stroke={isSelected ? "var(--foreground)" : isActive ? "var(--foreground)" : "none"}
                strokeWidth={isSelected ? 3 : isActive ? 2 : 0}
              />
              {/* Score text */}
              <text
                x={pos.x}
                y={pos.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="11"
                fontWeight="600"
                style={{ pointerEvents: "none" }}
              >
                {node.score}
              </text>
              {/* Label */}
              <text
                x={pos.x}
                y={pos.y + NODE_RADIUS + 12}
                textAnchor="middle"
                fill={isSelected ? "var(--primary)" : "var(--foreground)"}
                fontSize="9"
                fontWeight={isSelected ? "600" : "500"}
                style={{ pointerEvents: "none" }}
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Chain selector buttons */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
        {chains.map((chain) => (
          <button
            key={chain.id}
            onClick={() =>
              onChainSelect(selectedChainId === chain.id ? null : chain.id)
            }
            className={cn(
              "text-[9px] px-2 py-1 rounded-full transition-colors",
              "border",
              selectedChainId === chain.id
                ? "bg-primary text-primary-foreground border-primary"
                : chain.currentlyActive
                  ? "bg-danger/10 text-danger border-danger/30 hover:bg-danger/20"
                  : "bg-secondary text-secondary-foreground border-border hover:bg-accent"
            )}
          >
            {chain.currentlyActive && (
              <span className="inline-block size-1 rounded-full bg-current mr-1" />
            )}
            {chain.name}
          </button>
        ))}
      </div>
    </div>
  );
}
