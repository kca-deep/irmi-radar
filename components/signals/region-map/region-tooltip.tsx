"use client";

import { Badge } from "@/components/ui/badge";
import { SEVERITY_LABEL_MAP } from "@/lib/constants";
import { cn } from "@/lib/utils";

import type { RegionScore } from "@/lib/types";

interface RegionTooltipProps {
  region: RegionScore;
  x: number;
  y: number;
  visible: boolean;
}

// 툴팁이 화면 밖으로 나가지 않도록 조정
function adjustPosition(x: number, y: number) {
  const tooltipWidth = 160;
  const tooltipHeight = 120;
  const padding = 10;

  let adjustedX = x;
  let adjustedY = y - tooltipHeight - padding;

  // 화면 상단 벗어남 방지
  if (adjustedY < padding) {
    adjustedY = y + padding;
  }

  // 화면 좌우 벗어남 방지
  if (adjustedX - tooltipWidth / 2 < padding) {
    adjustedX = tooltipWidth / 2 + padding;
  }
  if (typeof window !== "undefined" && adjustedX + tooltipWidth / 2 > window.innerWidth - padding) {
    adjustedX = window.innerWidth - tooltipWidth / 2 - padding;
  }

  return { x: adjustedX, y: adjustedY };
}

const SEVERITY_BADGE_CLASS: Record<string, string> = {
  critical: "bg-danger text-danger-foreground",
  warning: "bg-warning text-warning-foreground",
  caution: "bg-caution text-caution-foreground",
  safe: "bg-safe text-safe-foreground",
};

export function RegionTooltip({ region, x, y, visible }: RegionTooltipProps) {
  if (!visible) return null;

  const pos = adjustPosition(x, y);

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: pos.x,
        top: pos.y,
        transform: "translate(-50%, 0)",
      }}
    >
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3 min-w-[140px]">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="font-semibold text-sm">{region.name}</span>
          <Badge
            className={cn("text-[10px]", SEVERITY_BADGE_CLASS[region.severity])}
          >
            {SEVERITY_LABEL_MAP[region.severity]}
          </Badge>
        </div>

        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">종합점수</span>
            <span className="font-medium">{region.score}점</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">감지 신호</span>
            <span className="font-medium">{region.signalCount}건</span>
          </div>
        </div>

        {region.topSignal && (
          <div className="mt-2 pt-2 border-t border-border">
            <p className="text-[10px] text-muted-foreground line-clamp-2">
              {region.topSignal}
            </p>
          </div>
        )}

        {/* 툴팁 화살표 */}
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-full">
          <div className="border-8 border-transparent border-t-popover" />
        </div>
      </div>
    </div>
  );
}
