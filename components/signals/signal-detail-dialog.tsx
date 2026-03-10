"use client";

import { useState, useEffect, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  Target01Icon,
  News01Icon,
  Calendar03Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SEVERITY_LABEL_MAP } from "@/lib/constants";
import { SEVERITY_COLOR_MAP, CATEGORY_ICON_MAP } from "@/lib/icon-maps";
import { cn } from "@/lib/utils";

import { AssemblyRelatedSection } from "@/components/signals/assembly-related-section";
import { GovPolicySection } from "@/components/signals/gov-policy-section";

import type { Signal, NewsArticle } from "@/lib/types";

function RelatedArticleCard({ article }: { article: NewsArticle }) {
  const severity = article.analysis?.severity;
  const riskScore = article.analysis?.riskScore;
  const severityColor = severity ? SEVERITY_COLOR_MAP[severity] : null;

  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        {severityColor && riskScore !== undefined && (
          <Badge
            className={cn(
              "text-[10px] font-medium px-1.5 py-0",
              severityColor === "danger" && "bg-danger text-danger-foreground",
              severityColor === "warning" && "bg-warning text-warning-foreground",
              severityColor === "caution" && "bg-caution text-caution-foreground",
              severityColor === "safe" && "bg-safe text-safe-foreground"
            )}
          >
            {riskScore}점
          </Badge>
        )}
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <HugeiconsIcon icon={Calendar03Icon} size={10} strokeWidth={2} />
          {article.publishedAt}
        </span>
      </div>
      <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">
        {article.title}
      </p>
      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
        {article.analysis?.summary || article.summary}
      </p>
      {article.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {article.keywords.slice(0, 3).map((kw) => (
            <span
              key={kw}
              className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
            >
              {kw}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

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

  if (!signal) return null;

  const severityColor = SEVERITY_COLOR_MAP[signal.severity];
  const severityLabel = SEVERITY_LABEL_MAP[signal.severity];
  const categoryIcon = CATEGORY_ICON_MAP[signal.category];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-6xl max-h-[85vh] p-0 flex flex-col overflow-hidden">
        {/* 헤더 */}
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge
              className={cn(
                "text-xs font-medium",
                severityColor === "danger" && "bg-danger text-danger-foreground",
                severityColor === "warning" && "bg-warning text-warning-foreground",
                severityColor === "caution" && "bg-caution text-caution-foreground",
                severityColor === "safe" && "bg-safe text-safe-foreground"
              )}
            >
              {severityLabel}
            </Badge>
            <Badge variant="secondary" className="gap-1 text-xs">
              <HugeiconsIcon icon={categoryIcon} size={12} strokeWidth={2} />
              {signal.categoryLabel}
            </Badge>
            {signal.region && (
              <Badge variant="outline" className="text-xs">
                {signal.region}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] gap-1">
              <HugeiconsIcon icon={Calendar03Icon} size={10} strokeWidth={2} />
              {signal.detectedAt} 감지
            </Badge>
          </div>
          <DialogTitle className="text-lg font-semibold text-left">
            {signal.title}
          </DialogTitle>
          <DialogDescription className="text-left">
            {signal.description}
          </DialogDescription>

          {/* 감지 근거 + 원인 분석 + 영향 범위 통합 카드 */}
          {(signal.evidence.length > 0 || signal.analysis.cause || signal.analysis.impact) && (
            <div className="mt-2 rounded-lg border border-border/50 bg-muted/20 px-4 py-2.5 space-y-1">
              {signal.evidence.length > 0 && (
                <p className="text-xs leading-relaxed text-foreground">
                  <span className="font-semibold text-warning mr-1.5">감지 근거</span>
                  {signal.evidence.join(" / ")}
                </p>
              )}
              {signal.analysis.cause && (
                <p className="text-xs leading-relaxed text-foreground">
                  <span className="font-semibold text-warning mr-1.5">원인 분석</span>
                  {signal.analysis.cause}
                </p>
              )}
              {signal.analysis.impact && (
                <p className="text-xs leading-relaxed text-foreground">
                  <span className="font-semibold text-danger mr-1.5">영향 범위</span>
                  {signal.analysis.impact}
                </p>
              )}
            </div>
          )}
        </DialogHeader>

        {/* 좌우 2컬럼 본문 */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-0 border-t border-border/30 flex-1 min-h-0 overflow-hidden">
          {/* 좌측: 위기 분석 + 관련 뉴스 */}
          <ScrollArea className="h-full">
            <div className="px-6 pt-2 pb-4 space-y-3">
              {/* 관련 뉴스 기사 */}
              <div>
                <h4 className="flex items-center gap-2 font-semibold text-xs text-muted-foreground mb-2">
                  <HugeiconsIcon
                    icon={News01Icon}
                    size={14}
                    strokeWidth={2}
                    className="text-primary"
                  />
                  관련 뉴스 기사
                  <Badge variant="secondary" className="text-[10px] ml-1">
                    {relatedArticles.length}건
                  </Badge>
                </h4>

                {articlesLoading ? (
                  <div className="text-center py-4 text-xs text-muted-foreground">
                    관련 기사를 불러오는 중...
                  </div>
                ) : relatedArticles.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    {relatedArticles.map((article) => (
                      <RelatedArticleCard key={article.id} article={article} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-muted-foreground">
                    연결된 뉴스 기사가 없습니다.
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          {/* 우측: 관련 지원정책 + 국회 동향 */}
          <div className="border-t lg:border-t-0 lg:border-l border-border/30 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="px-6 pt-2 pb-4 space-y-4">
                {/* 관련 지원 정책 (보조금24) */}
                <GovPolicySection category={signal.category} />

                {/* 관련 국회 동향 */}
                <AssemblyRelatedSection category={signal.category} />
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
