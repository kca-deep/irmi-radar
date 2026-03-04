"use client";

import { useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AiBrain01Icon, BulbIcon } from "@hugeicons/core-free-icons";
import { TypingMarkdownText } from "@/components/dashboard/typing-markdown-text";
import { AnalyzedNewsCarousel } from "@/components/news/analyzed-news-carousel";
import { parseMarkdown } from "@/lib/parse-markdown";
import { cn } from "@/lib/utils";

import { RiskGauge } from "@/components/dashboard/risk-gauge";

import type { BriefingData, NewsArticle } from "@/lib/types";

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
          className={cn(seg.bold && "font-semibold text-emphasis")}
        >
          {seg.text}
        </span>
      ))}
    </>
  );
}

export function AiBriefingPanel({ briefing, articles, overallScore }: AiBriefingPanelProps) {
  const analyzedArticles = useMemo(() => {
    return articles
      .filter((a) => a.analysis)
      .sort((a, b) => (b.analysis?.riskScore ?? 0) - (a.analysis?.riskScore ?? 0));
  }, [articles]);

  return (
    <div className="space-y-4">
      {/* 민생 브리핑 서브카드 */}
      <div className="rounded-xl border border-briefing-accent/20 bg-briefing-surface p-5">
        <div className="grid grid-cols-1 lg:grid-cols-[8fr_2fr] gap-5">
          {/* 좌측 80%: 브리핑 콘텐츠 */}
          <div className="min-w-0">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HugeiconsIcon
                  icon={AiBrain01Icon}
                  size={16}
                  strokeWidth={2}
                  className="text-briefing-accent"
                />
                <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  오늘의 민생 브리핑
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {formatTime(briefing.generatedAt)} 생성
              </span>
            </div>

            {/* Summary with typing effect + markdown bold */}
            <p className="text-xs leading-relaxed">
              <TypingMarkdownText text={briefing.summary} speed={15} />
            </p>

            {/* AI 분석 뉴스 캐러셀 */}
            {analyzedArticles.length > 0 && (
              <div className="mt-4">
                <AnalyzedNewsCarousel articles={analyzedArticles} />
              </div>
            )}

            {/* Recommendation */}
            <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-4">
              <div className="mb-2 flex items-center gap-1.5">
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
              <p className="text-xs leading-relaxed text-foreground">
                <RichText text={briefing.recommendation} />
              </p>
            </div>
          </div>

          {/* 우측 20%: 종합 리스크 점수 + 범례 */}
          <div className="flex flex-col items-center justify-center lg:border-l lg:border-border/30 lg:pl-5">
            <div className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
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
