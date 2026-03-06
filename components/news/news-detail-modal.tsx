"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon,
  News01Icon,
  AlertCircleIcon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CATEGORY_ICON_MAP, SEVERITY_COLOR_MAP, CATEGORY_BADGE_MAP } from "@/lib/icon-maps";
import { SEVERITY_LABEL_MAP, CATEGORY_LABEL_MAP } from "@/lib/constants";
import { cn } from "@/lib/utils";

import type { NewsArticle } from "@/lib/types";

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
  const severityColor = analysis
    ? SEVERITY_COLOR_MAP[analysis.severity]
    : undefined;
  const severityLabel = analysis
    ? SEVERITY_LABEL_MAP[analysis.severity]
    : undefined;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
        {/* 헤더 */}
        <DialogHeader className="p-4 pb-3">
          <div className="flex items-center gap-2 mb-2">
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
          </div>
        </DialogHeader>

        <Separator />

        {/* 2단 레이아웃: 좌측 본문 | 우측 AI 분석 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 flex-1 min-h-0">
          {/* 좌측: 기사 원문 */}
          <ScrollArea className="min-h-0 sm:border-r border-border/30">
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                <HugeiconsIcon
                  icon={News01Icon}
                  size={12}
                  strokeWidth={2}
                />
                기사 내용
              </div>
              <div className="text-xs leading-relaxed text-foreground whitespace-pre-line">
                {article.content || article.summary}
              </div>

              {/* 키워드 */}
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
            </div>
          </ScrollArea>

          {/* 우측: AI 분석 결과 */}
          <ScrollArea className="min-h-0 border-t sm:border-t-0 border-border/30">
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                <HugeiconsIcon
                  icon={AlertCircleIcon}
                  size={12}
                  strokeWidth={2}
                />
                AI 분석 결과
              </div>

              {analysis ? (
                <div className="rounded-lg border border-border/30 bg-background divide-y divide-border/20">
                  {/* 위험도 */}
                  <div className="flex items-center justify-between p-3">
                    <span className="text-[10px] text-muted-foreground">
                      위험도
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            `bg-${severityColor}`
                          )}
                          style={{ width: `${analysis.riskScore}%` }}
                        />
                      </div>
                      <span
                        className={cn(
                          "text-xs font-bold tabular-nums",
                          `text-${severityColor}`
                        )}
                      >
                        {analysis.riskScore}
                      </span>
                      <span
                        className={cn(
                          "text-[9px] font-medium px-1.5 py-0.5 rounded",
                          `bg-${severityColor}/15 text-${severityColor}`
                        )}
                      >
                        {severityLabel}
                      </span>
                    </div>
                  </div>

                  {/* 감지 신호 */}
                  {analysis.signalTitle && (
                    <div className="flex items-center justify-between p-3">
                      <span className="text-[10px] text-muted-foreground">
                        감지 신호
                      </span>
                      <span className="text-xs font-medium text-foreground">
                        {analysis.signalTitle}
                      </span>
                    </div>
                  )}

                  {/* 핵심 요인 */}
                  <div className="p-3 space-y-1.5">
                    <span className="text-[10px] text-muted-foreground">
                      핵심 리스크 요인
                    </span>
                    <ul className="space-y-1">
                      {analysis.keyFactors.map((factor, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-1.5 text-[11px] text-foreground"
                        >
                          <HugeiconsIcon
                            icon={ArrowRight01Icon}
                            size={10}
                            strokeWidth={2}
                            className="text-muted-foreground mt-0.5 shrink-0"
                          />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 연관 분야 */}
                  {analysis.relatedCategories.length > 0 && (
                    <div className="flex items-center justify-between p-3">
                      <span className="text-[10px] text-muted-foreground">
                        연관 분야
                      </span>
                      <div className="flex gap-1">
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

                  {/* 영향 지역 */}
                  {analysis.impactRegion && (
                    <div className="flex items-center justify-between p-3">
                      <span className="text-[10px] text-muted-foreground">
                        영향 지역
                      </span>
                      <span className="text-xs text-foreground">
                        {analysis.impactRegion}
                      </span>
                    </div>
                  )}

                  {/* AI 요약 */}
                  <div className="p-3 space-y-1">
                    <span className="text-[10px] text-muted-foreground">
                      AI 분석 요약
                    </span>
                    <p className="text-[11px] leading-relaxed text-foreground">
                      {analysis.summary}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-border/30 bg-muted/30 p-6 text-center">
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
