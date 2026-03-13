"use client";

import { useState, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { News01Icon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { SEVERITY_LABEL_MAP } from "@/lib/constants";
import { AnalyzedNewsCarousel } from "@/components/news/analyzed-news-carousel";
import { cn } from "@/lib/utils";

import type { NewsArticle, Severity } from "@/lib/types";

interface NewsTickerStripProps {
  articles: NewsArticle[];
}

const SEVERITY_ORDER: Severity[] = ["critical", "warning", "caution", "safe"];

const SEVERITY_BG_MAP: Record<Severity, string> = {
  critical: "bg-danger",
  warning: "bg-warning",
  caution: "bg-caution",
  safe: "bg-safe",
};

export function NewsTickerStrip({ articles }: NewsTickerStripProps) {
  const [selectedSeverity, setSelectedSeverity] = useState<Severity | null>(null);

  const analyzedArticles = useMemo(() => {
    return articles
      .filter((a) => a.analysis)
      .sort((a, b) => (b.analysis?.riskScore ?? 0) - (a.analysis?.riskScore ?? 0));
  }, [articles]);

  const severityCounts = useMemo(() => {
    const counts: Record<Severity, number> = { critical: 0, warning: 0, caution: 0, safe: 0 };
    for (const a of analyzedArticles) {
      if (a.analysis) counts[a.analysis.severity]++;
    }
    return counts;
  }, [analyzedArticles]);

  const filteredArticles = useMemo(() => {
    if (!selectedSeverity) return analyzedArticles;
    return analyzedArticles.filter((a) => a.analysis?.severity === selectedSeverity);
  }, [analyzedArticles, selectedSeverity]);

  if (analyzedArticles.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm px-5 py-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={News01Icon}
            size={18}
            strokeWidth={2}
            className="text-brand"
          />
          <h3 className="text-sm font-semibold text-foreground">
            AI 분석 뉴스
          </h3>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
            {analyzedArticles.length}건
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          {SEVERITY_ORDER.map((sev) => {
            const count = severityCounts[sev];
            if (count === 0) return null;
            const isSelected = selectedSeverity === sev;
            const hasSelection = selectedSeverity !== null;
            return (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(isSelected ? null : sev)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all cursor-pointer",
                  SEVERITY_BG_MAP[sev],
                  "text-white",
                  isSelected && "ring-2 ring-foreground/30 ring-offset-1 ring-offset-background",
                  hasSelection && !isSelected && "opacity-35",
                )}
              >
                {SEVERITY_LABEL_MAP[sev]} {count}
              </button>
            );
          })}
        </div>
      </div>

      {/* Carousel */}
      {filteredArticles.length > 0 && (
        <AnalyzedNewsCarousel
          key={selectedSeverity ?? "all"}
          articles={filteredArticles}
        />
      )}
    </div>
  );
}
