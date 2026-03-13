"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon,
  News01Icon,
  AlertCircleIcon,
  ArrowRight01Icon,
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

import type { NewsArticle, Severity } from "@/lib/types";

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

const SEV_ACCENT_BG: Record<string, string> = {
  danger: "bg-danger/8",
  warning: "bg-warning/8",
  caution: "bg-caution/8",
  safe: "bg-safe/8",
};

const SEV_ACCENT_BORDER: Record<string, string> = {
  danger: "border-danger/25",
  warning: "border-warning/25",
  caution: "border-caution/25",
  safe: "border-safe/25",
};

const SEV_STRIPE: Record<string, string> = {
  danger: "from-danger to-danger/60",
  warning: "from-warning to-warning/60",
  caution: "from-caution to-caution/60",
  safe: "from-safe to-safe/60",
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
        {/* Severity accent stripe */}
        {colorToken && (
          <div className={cn("h-1 w-full bg-gradient-to-r shrink-0 rounded-t-xl", SEV_STRIPE[colorToken])} />
        )}

        {/* Header */}
        <DialogHeader className="px-5 pt-4 pb-3 shrink-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              {colorToken && (
                <Badge className={cn("text-[10px] font-semibold px-2 py-0.5", SEV_BADGE[colorToken])}>
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
            </div>
            {analysis && (
              <span className={cn("text-lg font-extrabold tabular-nums", SEV_TEXT[colorToken!])}>
                {analysis.riskScore}
              </span>
            )}
          </div>
          <DialogTitle className="text-sm font-semibold leading-relaxed pr-6">
            {article.title}
          </DialogTitle>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
            <HugeiconsIcon icon={Calendar03Icon} size={12} strokeWidth={2} />
            {formattedDate}
            {article.region && (
              <>
                <span className="mx-1 text-muted-foreground/40">|</span>
                {article.region}
              </>
            )}
            {article.url && (
              <>
                <span className="mx-1 text-muted-foreground/40">|</span>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-0.5 text-brand hover:underline"
                >
                  <HugeiconsIcon icon={Link01Icon} size={10} strokeWidth={2} />
                  원문 보기
                </a>
              </>
            )}
          </div>
        </DialogHeader>

        {/* 2-column layout */}
        <div className="grid grid-cols-1 sm:grid-cols-[3fr_2fr] flex-1 min-h-0 border-t border-border">
          {/* Left: Article content */}
          <ScrollArea className="min-h-0 sm:border-r border-border">
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-1.5">
                <HugeiconsIcon icon={News01Icon} size={14} strokeWidth={2} className="text-brand" />
                <span className="text-xs font-semibold text-foreground">
                  기사 내용
                </span>
              </div>
              <div className="text-xs leading-relaxed text-foreground whitespace-pre-line">
                {article.content || article.summary}
              </div>

              {/* Keywords */}
              {article.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
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
          </ScrollArea>

          {/* Right: AI Analysis */}
          <ScrollArea className="min-h-0 border-t sm:border-t-0 border-border">
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-1.5">
                <HugeiconsIcon icon={AiBrain01Icon} size={14} strokeWidth={2} className="text-brand" />
                <span className="text-xs font-semibold text-foreground">
                  AI 분석 결과
                </span>
              </div>

              {analysis && colorToken ? (
                <div className="space-y-2">
                  {/* Risk score card */}
                  <div className={cn(
                    "rounded-lg border p-3 flex items-center justify-between",
                    SEV_ACCENT_BG[colorToken],
                    SEV_ACCENT_BORDER[colorToken],
                  )}>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      위험도
                    </span>
                    <div className="flex items-center gap-2.5">
                      <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", SEV_BG[colorToken])}
                          style={{
                            width: `${analysis.riskScore}%`,
                            boxShadow: "inset 0 -1px 2px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.3)",
                          }}
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
                    <div className="rounded-lg bg-muted/40 p-3 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-medium text-muted-foreground shrink-0">
                        감지 신호
                      </span>
                      <span className="text-[11px] font-semibold text-foreground text-right">
                        {analysis.signalTitle}
                      </span>
                    </div>
                  )}

                  {/* Key factors */}
                  <div className="rounded-lg bg-muted/40 p-3 space-y-2">
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
                    <div className="rounded-lg bg-muted/40 p-3 flex items-center justify-between gap-2">
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
                    <div className="rounded-lg bg-muted/40 p-3 flex items-center justify-between">
                      <span className="text-[10px] font-medium text-muted-foreground">
                        영향 지역
                      </span>
                      <span className="text-[11px] font-medium text-foreground">
                        {analysis.impactRegion}
                      </span>
                    </div>
                  )}

                  {/* AI summary */}
                  <div className="rounded-lg bg-muted/40 p-3 space-y-1.5">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      AI 분석 요약
                    </span>
                    <p className="text-[11px] leading-relaxed text-foreground">
                      {analysis.summary}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 p-6 text-center">
                  <p className="text-xs text-muted-foreground">
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
