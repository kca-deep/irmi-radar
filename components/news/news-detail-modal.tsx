"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon,
  News01Icon,
  Link01Icon,
  AiBrain01Icon,
} from "@hugeicons/core-free-icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CATEGORY_ICON_MAP, SEVERITY_COLOR_MAP, CATEGORY_BADGE_MAP } from "@/lib/icon-maps";
import { SEVERITY_LABEL_MAP, CATEGORY_LABEL_MAP } from "@/lib/constants";
import { cn } from "@/lib/utils";

import type { NewsArticle } from "@/lib/types";

/* ── Static class maps (Tailwind purge safe) ── */

const SEV_BG: Record<string, string> = {
  danger: "bg-danger",
  warning: "bg-warning",
  caution: "bg-caution",
  safe: "bg-safe",
};

const SEV_TEXT: Record<string, string> = {
  danger: "text-danger",
  warning: "text-warning",
  caution: "text-caution",
  safe: "text-safe",
};

const SEV_BADGE: Record<string, string> = {
  danger: "bg-danger text-danger-foreground",
  warning: "bg-warning text-warning-foreground",
  caution: "bg-caution text-caution-foreground",
  safe: "bg-safe text-safe-foreground",
};

interface NewsDetailModalProps {
  article: NewsArticle | null;
  open: boolean;
  onClose: () => void;
}

export function NewsDetailModal({
  article,
  open,
  onClose,
}: NewsDetailModalProps) {
  if (!article) return null;

  const categoryIcon = CATEGORY_ICON_MAP[article.category];
  const formattedDate = new Date(article.publishedAt).toLocaleDateString(
    "ko-KR",
    { year: "numeric", month: "long", day: "numeric" }
  );

  const analysis = article.analysis;
  const colorToken = analysis
    ? SEVERITY_COLOR_MAP[analysis.severity]
    : undefined;
  const severityLabel = analysis
    ? SEVERITY_LABEL_MAP[analysis.severity]
    : undefined;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {colorToken && (
              <Badge className={cn("text-[10px] font-semibold", SEV_BADGE[colorToken])}>
                {severityLabel}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn(
                "gap-1 text-[10px] font-medium",
                CATEGORY_BADGE_MAP[article.category]
              )}
            >
              <HugeiconsIcon icon={categoryIcon} size={10} strokeWidth={2} />
              {article.categoryLabel}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {article.section}
            </span>
            {article.source && (
              <>
                <span className="text-[10px] text-muted-foreground/40">|</span>
                <span className="text-[10px] text-muted-foreground">
                  {article.source}
                </span>
              </>
            )}
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <HugeiconsIcon icon={Calendar03Icon} size={10} strokeWidth={2} />
              {formattedDate}
            </span>
            {article.region && (
              <>
                <span className="text-[10px] text-muted-foreground/40">|</span>
                <span className="text-[10px] text-muted-foreground">{article.region}</span>
              </>
            )}
            {article.url && (
              <>
                <span className="text-[10px] text-muted-foreground/40">|</span>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-0.5 text-[10px] text-brand hover:underline"
                >
                  <HugeiconsIcon icon={Link01Icon} size={10} strokeWidth={2} />
                  원문 보기
                </a>
              </>
            )}
          </div>
          <DialogTitle className="text-sm font-semibold leading-relaxed pr-6">
            {article.title}
          </DialogTitle>
        </DialogHeader>

        {/* 2-column layout */}
        <div className="grid grid-cols-1 sm:grid-cols-[3fr_2fr] flex-1 min-h-0 border-t border-border">
          {/* Left: Article content */}
          <ScrollArea className="min-h-0 sm:border-r border-border">
            <div className="p-5 space-y-4 bg-background">
              <div className="flex items-center gap-1.5">
                <HugeiconsIcon icon={News01Icon} size={14} strokeWidth={2} className="text-brand" />
                <span className="text-xs font-semibold text-foreground">
                  기사 내용
                </span>
              </div>
              <div className="rounded-lg border border-border bg-card shadow-sm p-4 space-y-3">
                <div className="text-[11px] leading-relaxed text-foreground whitespace-pre-line">
                  {article.content || article.summary}
                </div>

                {/* Keywords */}
                {article.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
                    {article.keywords.map((keyword) => (
                      <Badge
                        key={keyword}
                        variant="secondary"
                        className="text-[9px] px-1.5 py-0.5 font-normal"
                      >
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          {/* Right: AI Analysis */}
          <ScrollArea className="min-h-0 border-t sm:border-t-0 border-border">
            <div className="p-5 space-y-3 bg-background">
              <div className="flex items-center gap-1.5">
                <HugeiconsIcon icon={AiBrain01Icon} size={14} strokeWidth={2} className="text-brand" />
                <span className="text-xs font-semibold text-foreground">
                  AI 분석 결과
                </span>
              </div>

              {analysis && colorToken ? (
                <div className="space-y-2">
                  {/* Risk score card */}
                  <div className="rounded-lg border border-border bg-card shadow-sm p-3 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      위험도
                    </span>
                    <div className="flex items-center gap-2.5">
                      <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", SEV_BG[colorToken])}
                          style={{ width: `${analysis.riskScore}%` }}
                        />
                      </div>
                      <span className={cn("text-sm font-extrabold tabular-nums", SEV_TEXT[colorToken])}>
                        {analysis.riskScore}
                      </span>
                      <Badge className={cn("text-[9px] px-1.5 py-0", SEV_BADGE[colorToken])}>
                        {severityLabel}
                      </Badge>
                    </div>
                  </div>

                  {/* Signal title */}
                  {analysis.signalTitle && (
                    <div className="rounded-lg border border-border bg-card shadow-sm p-3 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-medium text-muted-foreground shrink-0">
                        감지 신호
                      </span>
                      <span className="text-[11px] font-semibold text-foreground text-right">
                        {analysis.signalTitle}
                      </span>
                    </div>
                  )}

                  {/* Key factors */}
                  <div className="rounded-lg border border-border bg-card shadow-sm p-3 space-y-2">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      핵심 리스크 요인
                    </span>
                    <ul className="space-y-1.5">
                      {analysis.keyFactors.map((factor, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-1.5 text-[11px] text-foreground leading-relaxed"
                        >
                          <span className={cn("mt-1 size-1.5 rounded-full shrink-0", SEV_BG[colorToken])} />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Related categories */}
                  {analysis.relatedCategories.length > 0 && (
                    <div className="rounded-lg border border-border bg-card shadow-sm p-3 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-medium text-muted-foreground shrink-0">
                        연관 분야
                      </span>
                      <div className="flex gap-1 flex-wrap justify-end">
                        {analysis.relatedCategories.map((catKey) => (
                          <Badge
                            key={catKey}
                            variant="outline"
                            className={cn(
                              "text-[9px] gap-0.5",
                              CATEGORY_BADGE_MAP[catKey]
                            )}
                          >
                            <HugeiconsIcon
                              icon={CATEGORY_ICON_MAP[catKey]}
                              size={9}
                              strokeWidth={2}
                            />
                            {CATEGORY_LABEL_MAP[catKey]}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Impact region */}
                  {analysis.impactRegion && (
                    <div className="rounded-lg border border-border bg-card shadow-sm p-3 flex items-center justify-between">
                      <span className="text-[10px] font-medium text-muted-foreground">
                        영향 지역
                      </span>
                      <span className="text-[11px] font-medium text-foreground">
                        {analysis.impactRegion}
                      </span>
                    </div>
                  )}

                  {/* AI summary */}
                  <div className="rounded-lg border border-border bg-card shadow-sm p-3 space-y-1.5">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      AI 분석 요약
                    </span>
                    <p className="text-[11px] leading-relaxed text-foreground">
                      {analysis.summary}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-card shadow-sm p-6 text-center">
                  <p className="text-[11px] text-muted-foreground">
                    AI 분석을 실행하면 상세 분석 결과가 표시됩니다
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
