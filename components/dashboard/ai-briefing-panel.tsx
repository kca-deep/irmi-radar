"use client";

import { useState, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AiBrain01Icon, BulbIcon } from "@hugeicons/core-free-icons";
import { SEVERITY_LABEL_MAP } from "@/lib/constants";
import { TypingMarkdownText } from "@/components/dashboard/typing-markdown-text";
import { AnalyzedNewsCarousel } from "@/components/news/analyzed-news-carousel";
import { parseMarkdown } from "@/lib/parse-markdown";
import { cn } from "@/lib/utils";

import { RiskGauge } from "@/components/dashboard/risk-gauge";

import type { BriefingData, NewsArticle, Severity } from "@/lib/types";

interface AiBriefingPanelProps {
  briefing: BriefingData;
  articles: NewsArticle[];
  overallScore: number;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function RichText({ text }: { text: string }) {
  const segments = parseMarkdown(text);
  return (
    <>
      {segments.map((seg, i) => (
        <span
          key={i}
          className={cn(
            seg.bold && "font-semibold text-emphasis",
            seg.highlight && "bg-highlight text-highlight-foreground rounded-sm px-0.5 py-px",
          )}
        >
          {seg.text}
        </span>
      ))}
    </>
  );
}

const SEVERITY_ORDER: Severity[] = ["critical", "warning", "caution", "safe"];

const SEVERITY_BG_MAP: Record<Severity, string> = {
  critical: "bg-danger",
  warning: "bg-warning",
  caution: "bg-caution",
  safe: "bg-safe",
};

export function AiBriefingPanel({ briefing, articles, overallScore }: AiBriefingPanelProps) {
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

  return (
    <div className="space-y-4">
      {/* 민생 브리핑 서브카드 */}
      <div className="rounded-xl border border-border bg-card shadow-sm p-5">
        <div className="grid grid-cols-1 lg:grid-cols-[8fr_2fr] gap-5">
          {/* 좌측 80%: 브리핑 콘텐츠 */}
          <div className="min-w-0">
            {/* Header - 위기연쇄현황 패턴 */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HugeiconsIcon
                  icon={AiBrain01Icon}
                  size={18}
                  strokeWidth={2}
                  className="text-briefing-accent"
                />
                <h3 className="text-sm font-semibold text-foreground">
                  오늘의 민생 브리핑
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-briefing-accent/10 text-briefing-accent font-medium">
                {formatTime(briefing.generatedAt)} 생성
              </span>
            </div>

            {/* Summary with typing effect + markdown bold */}
            <p className="text-xs leading-relaxed">
              <TypingMarkdownText text={briefing.summary} speed={15} />
            </p>

            {/* AI 분석 뉴스: 등급별 뱃지 + 조건부 캐러셀 */}
            {analyzedArticles.length > 0 && (
              <div className="mt-4 space-y-2">
                {/* 등급별 뱃지 */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-medium text-muted-foreground mr-0.5">
                    분석 뉴스
                  </span>
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

                {/* 캐러셀: 초기 전체, 등급 선택 시 필터링 */}
                {filteredArticles.length > 0 && (
                  <AnalyzedNewsCarousel
                    key={selectedSeverity ?? "all"}
                    articles={filteredArticles}
                  />
                )}
              </div>
            )}

            {/* Recommendation */}
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-2.5">
              <div className="flex shrink-0 items-center gap-1.5">
                <HugeiconsIcon
                  icon={BulbIcon}
                  size={14}
                  strokeWidth={2}
                  className="text-warning"
                />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-warning">
                  핵심 제언
                </span>
              </div>
              <p className="min-w-0 text-xs leading-relaxed text-foreground">
                <RichText text={briefing.recommendation} />
              </p>
            </div>
          </div>

          {/* 우측 20%: 종합 리스크 점수 + 범례 */}
          <div className="flex flex-col items-center justify-center rounded-xl bg-brand-surface border border-brand-border lg:p-5">
            <div className="mb-2 text-[10px] font-medium uppercase tracking-widest text-brand-muted">
              종합 점수
            </div>
            <div className="[&_svg]:size-44">
              <RiskGauge score={overallScore} />
            </div>
            {/* 단계별 범례 */}
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-danger" />
                <span className="text-[10px] text-muted-foreground">긴급 80~100</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-warning" />
                <span className="text-[10px] text-muted-foreground">주의 60~79</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-caution" />
                <span className="text-[10px] text-muted-foreground">관찰 40~59</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-safe" />
                <span className="text-[10px] text-muted-foreground">안전 0~39</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
