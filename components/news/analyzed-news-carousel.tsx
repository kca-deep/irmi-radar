"use client";

import { useState, useRef, useCallback } from "react";
import type { MouseEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  Cancel01Icon,
  Location01Icon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { SEVERITY_LABEL_MAP, CATEGORY_LABEL_MAP } from "@/lib/constants";
import { SEVERITY_COLOR_MAP } from "@/lib/icon-maps";
import { AnalyzedNewsSlide } from "./analyzed-news-slide";
import { cn } from "@/lib/utils";

import type { NewsArticle } from "@/lib/types";

interface AnalyzedNewsCarouselProps {
  articles: NewsArticle[];
  onArticleClick?: (article: NewsArticle) => void;
}

const BADGE_CLASS: Record<string, string> = {
  danger: "bg-danger text-danger-foreground",
  warning: "bg-warning text-warning-foreground",
  caution: "bg-caution text-caution-foreground",
  safe: "bg-safe text-safe-foreground",
};

const SEVERITY_CSS_VAR: Record<string, string> = {
  danger: "var(--danger)",
  warning: "var(--warning)",
  caution: "var(--caution)",
  safe: "var(--safe)",
};

function TickerSet({
  articles,
  selectedId,
  onArticleClick,
  keyPrefix = "",
}: {
  articles: NewsArticle[];
  selectedId?: string;
  onArticleClick?: (article: NewsArticle, e: MouseEvent<HTMLDivElement>) => void;
  keyPrefix?: string;
}) {
  return (
    <div className="flex shrink-0 gap-3 pr-3">
      {articles.map((article) => (
        <AnalyzedNewsSlide
          key={`${keyPrefix}${article.id}`}
          article={article}
          selected={article.id === selectedId}
          onClick={onArticleClick}
        />
      ))}
    </div>
  );
}

function ArticleTooltip({
  article,
  onClose,
}: {
  article: NewsArticle;
  onClose: () => void;
}) {
  const analysis = article.analysis;
  if (!analysis) return null;

  const colorToken = SEVERITY_COLOR_MAP[analysis.severity];

  return (
    <div className="animate-in fade-in slide-in-from-top-2 duration-200 max-w-md rounded-lg border border-border bg-card shadow-lg p-3 space-y-2">
      {/* Header: badges + close */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Badge
            variant="secondary"
            className={cn("text-[10px] px-1.5 py-0", BADGE_CLASS[colorToken])}
          >
            {SEVERITY_LABEL_MAP[analysis.severity]}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {CATEGORY_LABEL_MAP[article.category]}
          </Badge>
          {analysis.impactRegion && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <HugeiconsIcon icon={Location01Icon} size={10} strokeWidth={2} />
              {analysis.impactRegion}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">
            {new Date(article.publishedAt).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="shrink-0 rounded-md p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
        </button>
      </div>

      {/* Title */}
      <p className="text-xs font-semibold leading-relaxed text-foreground">
        {article.title}
      </p>

      {/* Summary */}
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {analysis.summary}
      </p>

      {/* Key factors */}
      {analysis.keyFactors.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {analysis.keyFactors.map((factor) => (
            <span
              key={factor}
              className="rounded-full bg-muted px-2 py-0.5 text-[9px] text-muted-foreground"
            >
              {factor}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function AnalyzedNewsCarousel({
  articles,
  onArticleClick,
}: AnalyzedNewsCarouselProps) {
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(
    null
  );
  const [arrowLeft, setArrowLeft] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const tickerRef = useRef<HTMLDivElement>(null);

  const handleArticleClick = useCallback(
    (article: NewsArticle, e: MouseEvent<HTMLDivElement>) => {
      const isDeselect = selectedArticle?.id === article.id;
      setSelectedArticle(isDeselect ? null : article);

      if (!isDeselect && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const cardEl = e.currentTarget;
        const cardRect = cardEl.getBoundingClientRect();
        // Arrow points to center of the card, relative to the container
        const cardCenter = cardRect.left + cardRect.width / 2 - containerRect.left;
        setArrowLeft(cardCenter);
      }

      onArticleClick?.(article);
    },
    [onArticleClick, selectedArticle]
  );

  const handleClose = useCallback(() => {
    setSelectedArticle(null);
  }, []);

  if (articles.length === 0) return null;

  const duration = articles.length * 4;
  const isPaused = selectedArticle !== null;
  const colorToken = selectedArticle?.analysis
    ? SEVERITY_COLOR_MAP[selectedArticle.analysis.severity]
    : "warning";

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

      {/* Ticker + Tooltip wrapper */}
      <div className="relative" ref={containerRef}>
        <div className="overflow-hidden">
          <div
            ref={tickerRef}
            className="flex hover:[animation-play-state:paused]"
            style={{
              animation: `ticker ${duration}s linear infinite`,
              animationPlayState: isPaused ? "paused" : "running",
            }}
          >
            <TickerSet
              articles={articles}
              selectedId={selectedArticle?.id}
              onArticleClick={handleArticleClick}
            />
            <TickerSet
              articles={articles}
              selectedId={selectedArticle?.id}
              onArticleClick={handleArticleClick}
              keyPrefix="dup-"
            />
          </div>
        </div>

        {/* Floating tooltip with arrow */}
        {selectedArticle && (() => {
          const TOOLTIP_W = 420;
          const cw = containerRef.current?.clientWidth ?? 0;
          const ideal = arrowLeft - TOOLTIP_W / 2;
          const tLeft = cw > 0 ? Math.max(0, Math.min(ideal, cw - TOOLTIP_W)) : 0;
          const arrowInTooltip = arrowLeft - tLeft;

          return (
            <div
              className="absolute top-full z-30 pt-3"
              style={{ left: tLeft }}
            >
              {/* Arrow */}
              <div
                className="absolute top-0 size-0 border-x-[8px] border-b-[10px] border-t-0 border-x-transparent"
                style={{
                  left: arrowInTooltip - 8,
                  borderBottomColor: SEVERITY_CSS_VAR[colorToken],
                }}
              />
              <ArticleTooltip
                article={selectedArticle}
                onClose={handleClose}
              />
            </div>
          );
        })()}
      </div>
    </div>
  );
}
