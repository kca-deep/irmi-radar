"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar03Icon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_ICON_MAP, CATEGORY_BADGE_MAP, SEVERITY_COLOR_MAP } from "@/lib/icon-maps";
import { SEVERITY_LABEL_MAP } from "@/lib/constants";
import { cn } from "@/lib/utils";

import type { NewsArticle } from "@/lib/types";

interface NewsCardProps {
  article: NewsArticle;
  featured?: boolean;
  onClick?: (article: NewsArticle) => void;
}

export function NewsCard({ article, featured = false, onClick }: NewsCardProps) {
  const categoryIcon = CATEGORY_ICON_MAP[article.category];
  const analysis = article.analysis;

  // 날짜 포맷
  const formattedDate = new Date(article.publishedAt).toLocaleDateString(
    "ko-KR",
    {
      month: "short",
      day: "numeric",
    }
  );

  return (
    <article
      onClick={() => onClick?.(article)}
      className={cn(
        "rounded-lg border border-border bg-card shadow-sm cursor-pointer h-full flex flex-col",
        "transition-all duration-200 ease-out",
        "hover:-translate-y-0.5 hover:shadow-md",
        featured ? "p-5" : "p-4"
      )}
    >
      {/* 상단: 카테고리 배지 + 위험도/발행일 */}
      <div className="flex items-center justify-between mb-3">
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
        <div className="flex items-center gap-2">
          {analysis && (
            <span
              className={cn(
                "text-[9px] font-semibold px-1.5 py-0.5 rounded",
                `bg-${SEVERITY_COLOR_MAP[analysis.severity]}/15 text-${SEVERITY_COLOR_MAP[analysis.severity]}`
              )}
            >
              {SEVERITY_LABEL_MAP[analysis.severity]} {analysis.riskScore}
            </span>
          )}
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <HugeiconsIcon icon={Calendar03Icon} size={12} strokeWidth={2} />
            {formattedDate}
          </span>
        </div>
      </div>

      {/* 중단: 제목 + 요약 */}
      <h3
        className={cn(
          "font-semibold leading-relaxed text-foreground mb-2",
          featured ? "text-sm line-clamp-3" : "text-xs line-clamp-2"
        )}
      >
        {article.title}
      </h3>
      <p
        className={cn(
          "text-[11px] leading-relaxed text-muted-foreground mb-3 flex-1",
          featured ? "line-clamp-5" : "line-clamp-2"
        )}
      >
        {article.summary}
      </p>

      {/* 하단: 키워드 태그 */}
      {article.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-auto">
          {article.keywords.slice(0, featured ? 6 : 4).map((keyword) => (
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
    </article>
  );
}
