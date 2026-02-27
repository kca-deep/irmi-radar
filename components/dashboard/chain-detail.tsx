"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

import type { CrisisChain, CrisisNode, CategoryKey } from "@/lib/types";

interface ChainDetailProps {
  selectedChain: CrisisChain | null;
  nodes: CrisisNode[];
}

function getSeverityColor(score: number): string {
  if (score >= 80) return "text-danger";
  if (score >= 60) return "text-warning";
  if (score >= 40) return "text-caution";
  return "text-safe";
}

function getSeverityBg(score: number): string {
  if (score >= 80) return "bg-danger/10";
  if (score >= 60) return "bg-warning/10";
  if (score >= 40) return "bg-caution/10";
  return "bg-safe/10";
}

export function ChainDetail({ selectedChain, nodes }: ChainDetailProps) {
  if (!selectedChain) {
    return (
      <div className="mt-3 pt-3 border-t border-border/50">
        <p className="text-[10px] text-muted-foreground text-center">
          연쇄 반응을 클릭하여 상세 정보를 확인하세요
        </p>
      </div>
    );
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
      {/* Chain name with active indicator */}
      <div className="flex items-center gap-2">
        {selectedChain.currentlyActive && (
          <span className="size-1.5 rounded-full bg-danger animate-pulse" />
        )}
        <h4 className="text-xs font-medium text-foreground">
          {selectedChain.name}
        </h4>
      </div>

      {/* Path visualization */}
      <div className="flex flex-wrap items-center gap-1">
        {selectedChain.path.map((nodeId, index) => {
          const node = nodeMap.get(nodeId as CategoryKey);
          if (!node) return null;

          return (
            <div key={`${nodeId}-${index}`} className="flex items-center gap-1">
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded",
                  getSeverityBg(node.score),
                  getSeverityColor(node.score),
                  "font-medium"
                )}
              >
                {node.label}({node.score})
              </span>
              {index < selectedChain.path.length - 1 && (
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={12}
                  strokeWidth={2}
                  className="text-muted-foreground"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Description */}
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        {selectedChain.description}
      </p>
    </div>
  );
}
