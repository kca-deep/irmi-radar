"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Progress } from "@/components/ui/progress";
import { getSeverityByScore } from "@/lib/constants";
import { CATEGORY_ICON_MAP, SEVERITY_COLOR_MAP, TREND_ICON_MAP } from "@/lib/icon-maps";
import { cn } from "@/lib/utils";

import type { CategoryKey, Trend } from "@/lib/types";

interface CategoryRiskBarProps {
  categoryKey: CategoryKey;
  label: string;
  score: number;
  trend: Trend;
  keyIssues?: string[];
  index?: number;
}

// Tailwind purge 대응: 정적 클래스 매핑
const INDICATOR_CLASS: Record<string, string> = {
  danger: "[&_[data-slot=progress-indicator]]:bg-danger",
  warning: "[&_[data-slot=progress-indicator]]:bg-warning",
  caution: "[&_[data-slot=progress-indicator]]:bg-caution",
  safe: "[&_[data-slot=progress-indicator]]:bg-safe",
};

const SCORE_COLOR_CLASS: Record<string, string> = {
  danger: "text-danger",
  warning: "text-warning",
  caution: "text-caution",
  safe: "text-safe",
};

export function CategoryRiskBar({
  categoryKey,
  label,
  score,
  trend,
  keyIssues,
  index = 0,
}: CategoryRiskBarProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const severity = getSeverityByScore(score);
  const colorToken = SEVERITY_COLOR_MAP[severity];
  const categoryIcon = CATEGORY_ICON_MAP[categoryKey];
  const trendInfo = TREND_ICON_MAP[trend];

  // Stagger animation: delay based on index
  useEffect(() => {
    const delay = index * 120;
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, delay);
    return () => clearTimeout(timer);
  }, [score, index]);

  return (
    <div
      className="group cursor-default"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-3">
        {/* Category icon */}
        <HugeiconsIcon
          icon={categoryIcon}
          size={16}
          strokeWidth={2}
          className="shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
        />

        {/* Label */}
        <span className="w-12 shrink-0 text-xs font-medium text-foreground">
          {label}
        </span>

        {/* Progress bar with stagger animation */}
        <Progress
          value={animatedScore}
          className={cn(
            "flex-1 [&_[data-slot=progress-indicator]]:transition-all [&_[data-slot=progress-indicator]]:duration-700 [&_[data-slot=progress-indicator]]:ease-out",
            INDICATOR_CLASS[colorToken]
          )}
        />

        {/* Score */}
        <span
          className={cn(
            "w-8 shrink-0 text-right text-xs font-bold tabular-nums",
            SCORE_COLOR_CLASS[colorToken]
          )}
        >
          {score}
        </span>

        {/* Trend icon */}
        <HugeiconsIcon
          icon={trendInfo.icon}
          size={14}
          strokeWidth={2}
          className={cn(
            "shrink-0",
            trend === "rising" && "text-danger",
            trend === "stable" && "text-muted-foreground",
            trend === "falling" && "text-safe"
          )}
          aria-label={trendInfo.label}
        />
      </div>

      {/* Expandable key issues on hover */}
      {keyIssues && keyIssues.length > 0 && (
        <div
          className={cn(
            "grid transition-all duration-300 ease-out",
            isHovered ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}
        >
          <div className="overflow-hidden">
            <p className="pl-[28px] pt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              {keyIssues.join(" / ")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
