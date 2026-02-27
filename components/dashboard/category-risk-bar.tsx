"use client";

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
}: CategoryRiskBarProps) {
  const severity = getSeverityByScore(score);
  const colorToken = SEVERITY_COLOR_MAP[severity];
  const categoryIcon = CATEGORY_ICON_MAP[categoryKey];
  const trendInfo = TREND_ICON_MAP[trend];

  return (
    <div className="flex items-center gap-3">
      {/* Category icon */}
      <HugeiconsIcon
        icon={categoryIcon}
        size={16}
        strokeWidth={2}
        className="shrink-0 text-muted-foreground"
      />

      {/* Label */}
      <span className="w-12 shrink-0 text-xs font-medium text-foreground">
        {label}
      </span>

      {/* Progress bar */}
      <Progress
        value={score}
        className={cn("flex-1", INDICATOR_CLASS[colorToken])}
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
  );
}
