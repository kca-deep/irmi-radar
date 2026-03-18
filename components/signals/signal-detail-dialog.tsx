"use client";

import { useState, useEffect, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  News01Icon,
  Calendar03Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { SEVERITY_LABEL_MAP } from "@/lib/constants";
import { SEVERITY_COLOR_MAP, CATEGORY_ICON_MAP, CATEGORY_BADGE_MAP } from "@/lib/icon-maps";
import { cn } from "@/lib/utils";

import { AssemblyRelatedSection } from "@/components/signals/assembly-related-section";
import { GovPolicySection } from "@/components/signals/gov-policy-section";

import type { Signal, NewsArticle } from "@/lib/types";

/* ── Static class maps (Tailwind purge safe) ── */

const SEV_BADGE: Record<string, string> = {
  danger: "bg-danger text-danger-foreground",
  warning: "bg-warning text-warning-foreground",
  caution: "bg-caution text-caution-foreground",
  safe: "bg-safe text-safe-foreground",
};

/* ── Related article card ── */

function RelatedArticleCard({ article }: { article: NewsArticle }) {
  const severity = article.analysis?.severity;
  const riskScore = article.analysis?.riskScore;
  const colorToken = severity ? SEVERITY_COLOR_MAP[severity] : null;

  return (
    <div className={cn(
      "rounded-lg border border-border bg-card shadow-sm p-3 space-y-1.5 h-(--height-signal-card) flex flex-col overflow-hidden",
      "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md",
    )}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2 flex-1">
          {article.title}
        </p>
        {colorToken && riskScore !== undefined && (
          <span className={cn(
            "shrink-0 text-xs font-bold tabular-nums px-1.5 py-0.5 rounded",
            SEV_BADGE[colorToken],
          )}>
            {riskScore}
          </span>
        )}
      </div>
      <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2 flex-1">
        {article.analysis?.summary || article.summary}
      </p>
      <div className="flex items-center justify-between gap-2 mt-auto">
        {article.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 flex-1 min-w-0">
            {article.keywords.slice(0, 3).map((kw) => (
              <span
                key={kw}
                className="text-[11px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground truncate"
              >
                {kw}
              </span>
            ))}
          </div>
        )}
        <span className="text-[11px] text-muted-foreground shrink-0 flex items-center gap-0.5">
          <HugeiconsIcon icon={Calendar03Icon} size={10} strokeWidth={2} />
          {new Date(article.publishedAt).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
        </span>
      </div>
    </div>
  );
}

/* ── Main dialog ── */

interface SignalDetailDialogProps {
  signal: Signal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignalDetailDialog({
  signal,
  open,
  onOpenChange,
}: SignalDetailDialogProps) {
  const [relatedArticles, setRelatedArticles] = useState<NewsArticle[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [newsApi, setNewsApi] = useState<CarouselApi>();
  const [canScrollNewsPrev, setCanScrollNewsPrev] = useState(false);
  const [canScrollNewsNext, setCanScrollNewsNext] = useState(false);

  const fetchRelatedArticles = useCallback(async (signalId: string) => {
    setArticlesLoading(true);
    try {
      const res = await fetch(`/api/signals/${signalId}/articles`);
      if (res.ok) {
        const json = await res.json();
        setRelatedArticles(json.data ?? []);
      } else {
        setRelatedArticles([]);
      }
    } catch {
      setRelatedArticles([]);
    } finally {
      setArticlesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && signal) {
      fetchRelatedArticles(signal.id);
    } else {
      setRelatedArticles([]);
    }
  }, [open, signal, fetchRelatedArticles]);

  useEffect(() => {
    if (!newsApi) return;
    const update = () => {
      setCanScrollNewsPrev(newsApi.canScrollPrev());
      setCanScrollNewsNext(newsApi.canScrollNext());
    };
    update();
    newsApi.on("select", update);
    newsApi.on("reInit", update);
    return () => {
      newsApi.off("select", update);
      newsApi.off("reInit", update);
    };
  }, [newsApi]);

  if (!signal) return null;

  const colorToken = SEVERITY_COLOR_MAP[signal.severity];
  const severityLabel = SEVERITY_LABEL_MAP[signal.severity];
  const categoryIcon = CATEGORY_ICON_MAP[signal.category];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[92vh] !grid-rows-[auto_1fr] p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-4 pb-1.5 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <Badge className={cn("text-xs font-semibold", SEV_BADGE[colorToken])}>
              {severityLabel}
            </Badge>
            <Badge variant="outline" className={cn("gap-1 text-xs", CATEGORY_BADGE_MAP[signal.category])}>
              <HugeiconsIcon icon={categoryIcon} size={10} strokeWidth={2} />
              {signal.categoryLabel}
            </Badge>
            {signal.region && (
              <span className="text-xs text-muted-foreground">
                {signal.region}
              </span>
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <HugeiconsIcon icon={Calendar03Icon} size={10} strokeWidth={2} />
              {signal.detectedAt} 감지
            </span>
          </div>
          <DialogTitle className="text-base font-semibold text-left leading-snug">
            {signal.title}
          </DialogTitle>
          <DialogDescription className="text-left text-[13px] leading-relaxed">
            {signal.description}
          </DialogDescription>

          {/* Evidence / Cause / Impact card */}
          {(signal.evidence.length > 0 || signal.analysis.cause || signal.analysis.impact) && (
            <div className="mt-2 rounded-lg border border-border bg-card shadow-sm px-3 py-2 space-y-1.5">
              {signal.evidence.length > 0 && (
                <div className="flex items-start gap-2 text-[13px] leading-relaxed text-foreground">
                  <Badge variant="secondary" className="shrink-0 text-[11px] px-1.5 py-0 bg-warning/10 text-warning border-warning/20 font-semibold">
                    감지 근거
                  </Badge>
                  <span>{signal.evidence.join(" / ")}</span>
                </div>
              )}
              {signal.analysis.cause && (
                <div className="flex items-start gap-2 text-[13px] leading-relaxed text-foreground">
                  <Badge variant="secondary" className="shrink-0 text-[11px] px-1.5 py-0 bg-caution/10 text-caution border-caution/20 font-semibold">
                    원인 분석
                  </Badge>
                  <span>{signal.analysis.cause}</span>
                </div>
              )}
              {signal.analysis.impact && (
                <div className="flex items-start gap-2 text-[13px] leading-relaxed text-foreground">
                  <Badge variant="secondary" className="shrink-0 text-[11px] px-1.5 py-0 bg-danger/10 text-danger border-danger/20 font-semibold">
                    영향 범위
                  </Badge>
                  <span>{signal.analysis.impact}</span>
                </div>
              )}
            </div>
          )}
        </DialogHeader>

        {/* Body - single column */}
        <div className="min-h-0 overflow-y-auto border-t border-border">
          <div className="p-4 space-y-3 bg-background">
            {/* Related news */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={News01Icon} size={14} strokeWidth={2} className="text-brand" />
                <span className="text-sm font-semibold text-foreground">
                  관련 뉴스 기사
                </span>
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                  {relatedArticles.length}건
                </Badge>
                {relatedArticles.length > 3 && (
                  <div className="flex items-center gap-1 ml-auto">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-6 rounded-full"
                      disabled={!canScrollNewsPrev}
                      onClick={() => newsApi?.scrollPrev()}
                    >
                      <HugeiconsIcon icon={ArrowLeft01Icon} size={12} strokeWidth={2} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-6 rounded-full"
                      disabled={!canScrollNewsNext}
                      onClick={() => newsApi?.scrollNext()}
                    >
                      <HugeiconsIcon icon={ArrowRight01Icon} size={12} strokeWidth={2} />
                    </Button>
                  </div>
                )}
              </div>

              {articlesLoading ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  관련 기사를 불러오는 중...
                </div>
              ) : relatedArticles.length > 0 ? (
                <Carousel opts={{ slidesToScroll: 3, align: "start" }} setApi={setNewsApi} className="w-full">
                  <CarouselContent className="-ml-2">
                    {relatedArticles.map((article) => (
                      <CarouselItem key={article.id} className="pl-2 basis-1/3">
                        <RelatedArticleCard article={article} />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  연결된 뉴스 기사가 없습니다.
                </div>
              )}
            </div>

            {/* Policies + Assembly: 2열 배치 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <GovPolicySection category={signal.category} />
              <AssemblyRelatedSection category={signal.category} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
