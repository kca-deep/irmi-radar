"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, News01Icon } from "@hugeicons/core-free-icons";
import { Progress } from "@/components/ui/progress";
import { getSeverityByScore, SEVERITY_LABEL_MAP } from "@/lib/constants";
import { CATEGORY_ICON_MAP, SEVERITY_COLOR_MAP } from "@/lib/icon-maps";
import { cn } from "@/lib/utils";

import type { CategoryKey, Trend } from "@/lib/types";

interface CategoryRiskBarProps {
  categoryKey: CategoryKey;
  label: string;
  score: number;
  trend: Trend;
  keyIssues?: string[];
  articleCount?: number;
  index?: number;
  isOpen?: boolean;
  isLast?: boolean;
  onToggle?: () => void;
  delta?: number | null;
  previousScore?: number | null;
}

// Tailwind purge 대응: 정적 클래스 매핑
const CARD_BG_OPEN_CLASS: Record<string, string> = {
  danger: "bg-danger/5",
  warning: "bg-warning/5",
  caution: "bg-caution/5",
  safe: "bg-safe/5",
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

const COMPARE_BG_CLASS: Record<string, string> = {
  danger: "bg-danger/6",
  warning: "bg-warning/6",
  caution: "bg-caution/6",
  safe: "bg-safe/6",
};

const CAT_ICON_COLOR_CLASS: Record<CategoryKey, string> = {
  prices: "text-cat-prices",
  employment: "text-cat-employment",
  selfEmployed: "text-cat-self-employed",
  finance: "text-cat-finance",
  realEstate: "text-cat-real-estate",
};

export function CategoryRiskBar({
  categoryKey,
  label,
  score,
  trend,
  keyIssues,
  articleCount,
  index = 0,
  isOpen = false,
  isLast = false,
  onToggle,
  delta,
  previousScore,
}: CategoryRiskBarProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  const severity = getSeverityByScore(score);
  const colorToken = SEVERITY_COLOR_MAP[severity];
  const categoryIcon = CATEGORY_ICON_MAP[categoryKey];
  const severityLabel = SEVERITY_LABEL_MAP[severity];

  useEffect(() => {
    const delay = index * 120;
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, delay);
    return () => clearTimeout(timer);
  }, [score, index]);

  // 첫 번째 핵심 이슈를 미리보기로 사용
  const previewIssue = keyIssues && keyIssues.length > 0 ? keyIssues[0] : null;

  return (
    <div
      className={cn(
        "rounded-lg transition-all duration-200",
        isOpen ? CARD_BG_OPEN_CLASS[colorToken] : "",
        !isLast && !isOpen && "border-b border-border/40",
      )}
    >
      {/* 헤더 */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        {/* Category icon — 카테고리 고유 색상 */}
        <HugeiconsIcon
          icon={categoryIcon}
          size={15}
          strokeWidth={2}
          className={cn("shrink-0", CAT_ICON_COLOR_CLASS[categoryKey])}
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

        {/* Article count */}
        {articleCount != null && articleCount > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground tabular-nums">
            <HugeiconsIcon icon={News01Icon} size={10} strokeWidth={2} className="shrink-0 opacity-60" />
            {articleCount}
          </span>
        )}

        {/* Issue preview — 접힌 상태에서만 표시 */}
        {!isOpen && previewIssue && (
          <span className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground/70">
            {previewIssue}
          </span>
        )}

        {/* Spacer (이슈 미리보기가 없을 때) */}
        {(isOpen || !previewIssue) && <span className="flex-1" />}

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
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
        <div className="px-3 pb-3 pt-0">
          {/* Previous score comparison */}
          {previousScore != null && (
            <div className={cn("mb-2 rounded-md px-2.5 py-1.5", COMPARE_BG_CLASS[colorToken])}>
              <div className="mb-1 flex items-center justify-between text-[10px] tabular-nums">
                <span className="text-muted-foreground">전일 {previousScore.toFixed(1)}</span>
                <span className="font-bold text-foreground">금일 {score.toFixed(1)}</span>
              </div>
              <div className="relative h-1.5 overflow-hidden rounded-full bg-border/40">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-muted-foreground/15"
                  style={{ width: `${Math.min(previousScore, 100)}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${Math.min(animatedScore, 100)}%`, backgroundColor: `var(--${colorToken})` }}
                />
              </div>
            </div>
          )}
          {/* Progress bar (shown when no previous score) */}
          {previousScore == null && (
            <div className="mb-2">
              <Progress
                value={animatedScore}
                className={cn(
                  "h-1.5 [&_[data-slot=progress-indicator]]:transition-all [&_[data-slot=progress-indicator]]:duration-700 [&_[data-slot=progress-indicator]]:ease-out",
                  INDICATOR_CLASS[colorToken],
                )}
              />
            </div>
          )}

          {/* Key issues */}
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
    </div>
  );
}
