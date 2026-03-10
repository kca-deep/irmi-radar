"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Progress } from "@/components/ui/progress";
import { getSeverityByScore, SEVERITY_LABEL_MAP } from "@/lib/constants";
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
  isOpen?: boolean;
  isLast?: boolean;
  onToggle?: () => void;
}

// Tailwind purge 대응: 정적 클래스 매핑
const CARD_BG_OPEN_CLASS: Record<string, string> = {
  danger: "bg-muted/50",
  warning: "bg-muted/50",
  caution: "bg-muted/50",
  safe: "bg-muted/50",
};

const BADGE_BG_CLASS: Record<string, string> = {
  danger: "bg-danger/20 text-danger",
  warning: "bg-warning/20 text-warning",
  caution: "bg-caution/20 text-caution",
  safe: "bg-safe/20 text-safe",
};

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

const BULLET_CLASS: Record<string, string> = {
  danger: "bg-danger",
  warning: "bg-warning",
  caution: "bg-caution",
  safe: "bg-safe",
};

export function CategoryRiskBar({
  categoryKey,
  label,
  score,
  trend,
  keyIssues,
  index = 0,
  isOpen = false,
  isLast = false,
  onToggle,
}: CategoryRiskBarProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  const severity = getSeverityByScore(score);
  const colorToken = SEVERITY_COLOR_MAP[severity];
  const categoryIcon = CATEGORY_ICON_MAP[categoryKey];
  const trendInfo = TREND_ICON_MAP[trend];
  const severityLabel = SEVERITY_LABEL_MAP[severity];

  useEffect(() => {
    const delay = index * 120;
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, delay);
    return () => clearTimeout(timer);
  }, [score, index]);

  return (
    <div
      className={cn(
        "rounded-lg transition-all duration-200",
        isOpen ? CARD_BG_OPEN_CLASS[colorToken] : "",
        !isLast && !isOpen && "border-b border-border/40",
      )}
    >
      {/* 접힌 헤더 (항상 표시) */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
      >
        {/* Category icon */}
        <HugeiconsIcon
          icon={categoryIcon}
          size={15}
          strokeWidth={2}
          className="shrink-0 text-muted-foreground"
        />

        {/* Label */}
        <span className="w-10 shrink-0 text-xs font-medium text-foreground">
          {label}
        </span>

        {/* Score */}
        <span
          className={cn(
            "text-sm font-bold tabular-nums",
            SCORE_COLOR_CLASS[colorToken],
          )}
        >
          {score}
        </span>

        {/* Severity badge */}
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
            BADGE_BG_CLASS[colorToken],
          )}
        >
          {severityLabel}
        </span>

        {/* Trend icon */}
        <HugeiconsIcon
          icon={trendInfo.icon}
          size={13}
          strokeWidth={2}
          className={cn(
            "shrink-0",
            trend === "rising" && "text-danger",
            trend === "stable" && "text-muted-foreground",
            trend === "falling" && "text-safe",
          )}
          aria-label={trendInfo.label}
        />

        {/* Spacer */}
        <span className="flex-1" />

        {/* Chevron */}
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          size={14}
          strokeWidth={2}
          className={cn(
            "shrink-0 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {/* 펼친 상세 영역 */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="px-3 pb-3 pt-0">
          {/* Progress bar */}
          <div className="mb-2">
            <Progress
              value={animatedScore}
              className={cn(
                "h-1.5 [&_[data-slot=progress-indicator]]:transition-all [&_[data-slot=progress-indicator]]:duration-700 [&_[data-slot=progress-indicator]]:ease-out",
                INDICATOR_CLASS[colorToken],
              )}
            />
          </div>

          {/* Key issues - 수치 위주 3줄 요약 */}
          {keyIssues && keyIssues.length > 0 && (
            <div className="space-y-0.5">
              {keyIssues.slice(0, 3).map((issue, i) => (
                <p
                  key={i}
                  className="truncate text-[11px] leading-snug text-muted-foreground"
                >
                  <span className={cn("inline-block size-1 rounded-full mr-1.5 align-middle", BULLET_CLASS[colorToken])} />
                  {issue}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
