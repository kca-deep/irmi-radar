"use client";

import { useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  Target01Icon,
  News01Icon,
  Calendar03Icon,
  CheckmarkCircle02Icon,
  LegalDocument01Icon,
  Building02Icon,
  Call02Icon,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { buttonVariants } from "@/components/ui/button";
import { SEVERITY_LABEL_MAP, CATEGORY_LABEL_MAP } from "@/lib/constants";
import { SEVERITY_COLOR_MAP, CATEGORY_ICON_MAP } from "@/lib/icon-maps";
import { cn } from "@/lib/utils";

import type { Signal, Policy, NewsArticle } from "@/lib/types";

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

function CompactPolicyCard({ policy }: { policy: Policy }) {
  const categoryLabel =
    policy.targetCategories.length > 0
      ? CATEGORY_LABEL_MAP[policy.targetCategories[0]]
      : null;

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <h5 className="font-semibold text-xs text-foreground line-clamp-1">
          {policy.title}
        </h5>
        {categoryLabel && (
          <Badge variant="outline" className="text-[10px] shrink-0">
            {categoryLabel}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <HugeiconsIcon icon={Building02Icon} size={10} strokeWidth={2} />
        {policy.provider}
      </div>
      <p className="text-[11px] text-foreground line-clamp-1">{policy.benefit}</p>
      <div className="flex items-center gap-2">
        <a
          href={`tel:${policy.contact}`}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "h-6 text-[10px] gap-1 px-2"
          )}
        >
          <HugeiconsIcon icon={Call02Icon} size={10} strokeWidth={2} />
          {policy.contact}
        </a>
        <a
          href={policy.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "h-6 text-[10px] gap-1 px-2"
          )}
        >
          자세히
          <HugeiconsIcon icon={ArrowRight01Icon} size={10} strokeWidth={2} />
        </a>
      </div>
    </div>
  );
}

interface SignalDetailDialogProps {
  signal: Signal | null;
  policies: Policy[];
  articles: NewsArticle[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignalDetailDialog({
  signal,
  policies,
  articles,
  open,
  onOpenChange,
}: SignalDetailDialogProps) {
  if (!signal) return null;

  const severityColor = SEVERITY_COLOR_MAP[signal.severity];
  const severityLabel = SEVERITY_LABEL_MAP[signal.severity];
  const categoryIcon = CATEGORY_ICON_MAP[signal.category];

  const relatedArticles = useMemo(() => {
    if (!signal.relatedArticleIds || signal.relatedArticleIds.length === 0) {
      return [];
    }
    const idSet = new Set(signal.relatedArticleIds);
    return articles.filter((a) => idSet.has(a.id));
  }, [signal.relatedArticleIds, articles]);

  const matchedPolicies = useMemo(() => {
    return policies.filter(
      (p) =>
        p.relatedSignals.includes(signal.id) ||
        p.targetCategories.includes(signal.category)
    );
  }, [policies, signal.id, signal.category]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-6xl max-h-[85vh] p-0">
        {/* 헤더 */}
        <DialogHeader className="px-6 pt-6 pb-4">
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
        </DialogHeader>

        {/* 좌우 2컬럼 본문 */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-0 border-t border-border/30">
          {/* 좌측: 위기 분석 (스크롤 없이 표시) */}
          <div className="px-6 py-4 space-y-3">
            {/* 감지 근거 - 인라인 칩 */}
            <div>
              <h4 className="flex items-center gap-2 font-semibold text-xs text-muted-foreground mb-2">
                <HugeiconsIcon icon={News01Icon} size={14} strokeWidth={2} />
                감지 근거
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {signal.evidence.map((item, index) => (
                  <span
                    key={index}
                    className="text-[11px] leading-snug px-2 py-1 rounded-md border border-border/50 bg-muted/40 text-foreground"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* 원인 분석 + 영향 범위 - 2컬럼 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                <h4 className="flex items-center gap-1.5 font-semibold text-xs mb-1.5">
                  <HugeiconsIcon
                    icon={AlertCircleIcon}
                    size={13}
                    strokeWidth={2}
                    className="text-warning"
                  />
                  원인 분석
                </h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {signal.analysis.cause}
                </p>
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                <h4 className="flex items-center gap-1.5 font-semibold text-xs mb-1.5">
                  <HugeiconsIcon
                    icon={Target01Icon}
                    size={13}
                    strokeWidth={2}
                    className="text-danger"
                  />
                  영향 범위
                </h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {signal.analysis.impact}
                </p>
              </div>
            </div>

            {/* 대응 가이드 - actionPoints만 */}
            <div>
              <h4 className="flex items-center gap-2 font-semibold text-xs text-muted-foreground mb-2">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  size={14}
                  strokeWidth={2}
                  className="text-primary"
                />
                대응 가이드
              </h4>
              <ol className="space-y-1">
                {signal.analysis.actionPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-2 text-[11px]">
                    <span className="shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-medium">
                      {index + 1}
                    </span>
                    <span className="text-muted-foreground">{point}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* 우측: 관련 자료 (뉴스 + 정책) */}
          <div className="border-t lg:border-t-0 lg:border-l border-border/30">
            <ScrollArea className="max-h-[60vh]">
              <div className="px-6 py-4 space-y-4">
                {/* 관련 뉴스 기사 */}
                <h4 className="flex items-center gap-2 font-semibold text-xs text-muted-foreground">
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

                {relatedArticles.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {relatedArticles.map((article) => (
                      <RelatedArticleCard key={article.id} article={article} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    연결된 뉴스 기사가 없습니다.
                  </div>
                )}

                {/* 관련 지원 정책 */}
                {matchedPolicies.length > 0 && (
                  <div>
                    <h4 className="flex items-center gap-2 font-semibold text-xs text-muted-foreground mb-3">
                      <HugeiconsIcon
                        icon={LegalDocument01Icon}
                        size={14}
                        strokeWidth={2}
                        className="text-primary"
                      />
                      관련 지원 정책
                      <Badge variant="secondary" className="text-[10px] ml-1">
                        {matchedPolicies.length}건
                      </Badge>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {matchedPolicies.map((policy) => (
                        <CompactPolicyCard key={policy.id} policy={policy} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
