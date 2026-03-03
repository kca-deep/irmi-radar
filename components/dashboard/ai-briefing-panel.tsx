"use client";

import { useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AiBrain01Icon, BulbIcon } from "@hugeicons/core-free-icons";
import { TypingMarkdownText } from "@/components/dashboard/typing-markdown-text";
import { AnalyzedNewsCarousel } from "@/components/news/analyzed-news-carousel";
import { parseMarkdown } from "@/lib/parse-markdown";
import { cn } from "@/lib/utils";

import type { BriefingData, NewsArticle } from "@/lib/types";

interface AiBriefingPanelProps {
  briefing: BriefingData;
  articles: NewsArticle[];
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

export function AiBriefingPanel({ briefing, articles }: AiBriefingPanelProps) {
  const analyzedArticles = useMemo(() => {
    return articles
      .filter((a) => a.analysis)
      .sort((a, b) => (b.analysis?.riskScore ?? 0) - (a.analysis?.riskScore ?? 0));
  }, [articles]);

  return (
    <div className="space-y-4">
      {/* 민생 브리핑 서브카드 */}
      <div className="rounded-xl border border-briefing-accent/20 bg-briefing-surface p-5">
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

    </div>
  );
}
