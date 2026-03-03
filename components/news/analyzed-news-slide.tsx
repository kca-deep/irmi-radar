"use client";

import { Badge } from "@/components/ui/badge";
import { SEVERITY_LABEL_MAP, CATEGORY_LABEL_MAP } from "@/lib/constants";
import { SEVERITY_COLOR_MAP } from "@/lib/icon-maps";
import { cn } from "@/lib/utils";

import type { NewsArticle } from "@/lib/types";

interface AnalyzedNewsSlideProps {
  article: NewsArticle;
  onClick?: (article: NewsArticle) => void;
}

const BADGE_CLASS: Record<string, string> = {
  danger: "bg-danger text-danger-foreground",
  warning: "bg-warning text-warning-foreground",
  caution: "bg-caution text-caution-foreground",
  safe: "bg-safe text-safe-foreground",
};

const BORDER_CLASS: Record<string, string> = {
  danger: "border-danger/30",
  warning: "border-warning/30",
  caution: "border-caution/30",
  safe: "border-safe/30",
};

const TEXT_CLASS: Record<string, string> = {
  danger: "text-danger",
  warning: "text-warning",
  caution: "text-caution",
  safe: "text-safe",
};

export function AnalyzedNewsSlide({
  article,
  onClick,
}: AnalyzedNewsSlideProps) {
  const analysis = article.analysis;
  if (!analysis) return null;

  const colorToken = SEVERITY_COLOR_MAP[analysis.severity];

  return (
    <div
      onClick={() => onClick?.(article)}
      className={cn(
        "w-[260px] shrink-0 rounded-lg border px-3 py-2.5 cursor-pointer",
        "bg-card/50 hover:bg-card transition-colors",
        BORDER_CLASS[colorToken]
      )}
    >
      {/* Header: badges + score */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Badge
            variant="secondary"
            className={cn("text-[9px] px-1.5 py-0", BADGE_CLASS[colorToken])}
          >
            {SEVERITY_LABEL_MAP[analysis.severity]}
          </Badge>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
            {CATEGORY_LABEL_MAP[article.category]}
          </Badge>
        </div>
        <span
          className={cn(
            "text-xs font-bold tabular-nums",
            TEXT_CLASS[colorToken]
          )}
        >
          {analysis.riskScore}
        </span>
      </div>

      {/* Title */}
      <p className="mt-1.5 text-[11px] font-medium leading-snug text-foreground line-clamp-1">
        {article.title}
      </p>
    </div>
  );
}
