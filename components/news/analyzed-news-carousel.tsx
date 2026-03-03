"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { AnalyzedNewsSlide } from "./analyzed-news-slide";

import type { NewsArticle } from "@/lib/types";

interface AnalyzedNewsCarouselProps {
  articles: NewsArticle[];
  onArticleClick?: (article: NewsArticle) => void;
}

function TickerSet({
  articles,
  onArticleClick,
  keyPrefix = "",
}: {
  articles: NewsArticle[];
  onArticleClick?: (article: NewsArticle) => void;
  keyPrefix?: string;
}) {
  return (
    <div className="flex shrink-0 gap-3 pr-3">
      {articles.map((article) => (
        <AnalyzedNewsSlide
          key={`${keyPrefix}${article.id}`}
          article={article}
          onClick={onArticleClick}
        />
      ))}
    </div>
  );
}

export function AnalyzedNewsCarousel({
  articles,
  onArticleClick,
}: AnalyzedNewsCarouselProps) {
  if (articles.length === 0) return null;

  const duration = articles.length * 4;

  return (
    <div className="space-y-3">
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-2">
        <HugeiconsIcon
          icon={AlertCircleIcon}
          size={16}
          strokeWidth={2}
          className="text-primary"
        />
        <span className="text-xs font-semibold text-foreground">
          AI 분석 결과
        </span>
        <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5">
          {articles.length}건
        </Badge>
      </div>

      {/* Ticker */}
      <div className="overflow-hidden">
        <div
          className="flex hover:[animation-play-state:paused]"
          style={{
            animation: `ticker ${duration}s linear infinite`,
          }}
        >
          <TickerSet articles={articles} onArticleClick={onArticleClick} />
          <TickerSet
            articles={articles}
            onArticleClick={onArticleClick}
            keyPrefix="dup-"
          />
        </div>
      </div>
    </div>
  );
}
