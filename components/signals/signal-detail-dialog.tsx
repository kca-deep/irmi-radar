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

/* ── Static class maps (Tailwind purge safe) ── */

const SEV_BADGE: Record<string, string> = {
  danger: "bg-danger text-danger-foreground",
  warning: "bg-warning text-warning-foreground",
  caution: "bg-caution text-caution-foreground",
  safe: "bg-safe text-safe-foreground",
};

const SEV_STRIPE: Record<string, string> = {
  danger: "from-danger to-danger/60",
  warning: "from-warning to-warning/60",
  caution: "from-caution to-caution/60",
  safe: "from-safe to-safe/60",
};

const SEV_TINT: Record<string, string> = {
  danger: "bg-danger/5 hover:bg-danger/10",
  warning: "bg-warning/5 hover:bg-warning/10",
  caution: "bg-caution/5 hover:bg-caution/10",
  safe: "bg-safe/5 hover:bg-safe/10",
};

const SEV_DOT: Record<string, string> = {
  danger: "bg-danger",
  warning: "bg-warning",
  caution: "bg-caution",
  safe: "bg-safe",
};

/* ── Related article card ── */

function RelatedArticleCard({ article }: { article: NewsArticle }) {
  const severity = article.analysis?.severity;
  const riskScore = article.analysis?.riskScore;
  const colorToken = severity ? SEVERITY_COLOR_MAP[severity] : null;

  return (
    <div className={cn(
      "rounded-lg border border-border p-3 space-y-2 transition-colors",
      colorToken ? SEV_TINT[colorToken] : "bg-muted/20 hover:bg-muted/40",
    )}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-foreground leading-snug line-clamp-2 flex-1">
          {article.title}
        </p>
        {colorToken && riskScore !== undefined && (
          <span className={cn(
            "shrink-0 text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded",
            SEV_BADGE[colorToken],
          )}>
            {riskScore}
          </span>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
        {article.analysis?.summary || article.summary}
      </p>
      <div className="flex items-center justify-between gap-2">
        {article.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 flex-1 min-w-0">
            {article.keywords.slice(0, 3).map((kw) => (
              <span
                key={kw}
                className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground truncate"
              >
                {kw}
              </span>
            ))}
          </div>
        )}
        <span className="text-[9px] text-muted-foreground shrink-0 flex items-center gap-0.5">
          <HugeiconsIcon icon={Calendar03Icon} size={9} strokeWidth={2} />
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

  const colorToken = SEVERITY_COLOR_MAP[signal.severity];
  const severityLabel = SEVERITY_LABEL_MAP[signal.severity];
  const categoryIcon = CATEGORY_ICON_MAP[signal.category];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-6xl max-h-[85vh] p-0 flex flex-col overflow-hidden">
        {/* Severity accent stripe */}
        <div className={cn("h-1 w-full bg-gradient-to-r shrink-0 rounded-t-xl", SEV_STRIPE[colorToken])} />

        {/* Header */}
        <DialogHeader className="px-5 pt-4 pb-2 shrink-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge className={cn("text-xs font-semibold px-2 py-0.5", SEV_BADGE[colorToken])}>
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
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <HugeiconsIcon icon={Calendar03Icon} size={10} strokeWidth={2} />
              {signal.detectedAt} 감지
            </span>
          </div>
          <DialogTitle className="text-base font-semibold text-left leading-snug">
            {signal.title}
          </DialogTitle>
          <DialogDescription className="text-left text-xs leading-relaxed">
            {signal.description}
          </DialogDescription>

          {/* Evidence / Cause / Impact card */}
          {(signal.evidence.length > 0 || signal.analysis.cause || signal.analysis.impact) && (
            <div className="mt-3 rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-2">
              {signal.evidence.length > 0 && (
                <div className="flex items-start gap-2 text-xs leading-relaxed text-foreground">
                  <Badge variant="secondary" className="shrink-0 text-[9px] px-1.5 py-0 bg-warning/10 text-warning border-warning/20 font-semibold">
                    감지 근거
                  </Badge>
                  <span>{signal.evidence.join(" / ")}</span>
                </div>
              )}
              {signal.analysis.cause && (
                <div className="flex items-start gap-2 text-xs leading-relaxed text-foreground">
                  <Badge variant="secondary" className="shrink-0 text-[9px] px-1.5 py-0 bg-caution/10 text-caution border-caution/20 font-semibold">
                    원인 분석
                  </Badge>
                  <span>{signal.analysis.cause}</span>
                </div>
              )}
              {signal.analysis.impact && (
                <div className="flex items-start gap-2 text-xs leading-relaxed text-foreground">
                  <Badge variant="secondary" className="shrink-0 text-[9px] px-1.5 py-0 bg-danger/10 text-danger border-danger/20 font-semibold">
                    영향 범위
                  </Badge>
                  <span>{signal.analysis.impact}</span>
                </div>
              )}
            </div>
          )}
        </DialogHeader>

        {/* 2-column body */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-0 border-t border-border flex-1 min-h-0 overflow-hidden">
          {/* Left: Related news */}
          <ScrollArea className="h-full">
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={News01Icon} size={16} strokeWidth={2} className="text-brand" />
                <span className="text-xs font-semibold text-foreground">
                  관련 뉴스 기사
                </span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                  {relatedArticles.length}건
                </Badge>
              </div>

              {articlesLoading ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  관련 기사를 불러오는 중...
                </div>
              ) : relatedArticles.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {relatedArticles.map((article) => (
                    <RelatedArticleCard key={article.id} article={article} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  연결된 뉴스 기사가 없습니다.
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Right: Policies + Assembly */}
          <div className="border-t lg:border-t-0 lg:border-l border-border overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-5 space-y-4">
                <GovPolicySection category={signal.category} />
                <AssemblyRelatedSection category={signal.category} />
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
