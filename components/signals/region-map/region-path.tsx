"use client";

import { cn } from "@/lib/utils";

import type { Severity } from "@/lib/types";
import type { RegionPathData } from "./korea-map-paths";

interface RegionPathProps {
  pathData: RegionPathData;
  severity: Severity;
  score: number;
  isSelected: boolean;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}

// Tailwind 색상을 직접 사용할 수 없으므로 CSS 변수 참조
const SEVERITY_FILL: Record<Severity, string> = {
  critical: "var(--danger)",
  warning: "var(--warning)",
  caution: "var(--caution)",
  safe: "var(--safe)",
};

export function RegionPath({
  pathData,
  severity,
  score,
  isSelected,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: RegionPathProps) {
  const fillColor = SEVERITY_FILL[severity];

  return (
    <g
      className="cursor-pointer transition-all duration-200"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {/* 지역 영역 */}
      <path
        d={pathData.path}
        fill={fillColor}
        fillOpacity={isHovered ? 0.9 : 0.7}
        stroke={isSelected ? "var(--primary)" : "var(--border)"}
        strokeWidth={isSelected ? 2.5 : 1}
        className={cn(
          "transition-all duration-200",
          isHovered && "filter brightness-110"
        )}
        style={{
          transform: isHovered ? "scale(1.02)" : "scale(1)",
          transformOrigin: `${pathData.labelX}px ${pathData.labelY}px`,
        }}
      />

      {/* 지역명 + 점수 */}
      <text
        x={pathData.labelX}
        y={pathData.labelY - 4}
        textAnchor="middle"
        className="text-[8px] font-medium fill-foreground pointer-events-none"
      >
        {pathData.name}
      </text>
      <text
        x={pathData.labelX}
        y={pathData.labelY + 6}
        textAnchor="middle"
        className="text-[10px] font-bold fill-foreground pointer-events-none"
      >
        {score}
      </text>
    </g>
  );
}
