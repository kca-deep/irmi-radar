"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar03Icon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_ICON_MAP } from "@/lib/icon-maps";
import { cn } from "@/lib/utils";

import type { NewsArticle, CategoryKey } from "@/lib/types";

interface NewsCardProps {
  article: NewsArticle;
}

// 카테고리별 배지 색상
const CATEGORY_BADGE_CLASS: Record<CategoryKey, string> = {
  prices: "bg-chart-1/10 text-chart-1 border-chart-1/30",
  employment: "bg-chart-2/10 text-chart-2 border-chart-2/30",
  selfEmployed: "bg-warning/10 text-warning border-warning/30",
  finance: "bg-chart-3/10 text-chart-3 border-chart-3/30",
  realEstate: "bg-chart-4/10 text-chart-4 border-chart-4/30",
};

export function NewsCard({ article }: NewsCardProps) {
  const categoryIcon = CATEGORY_ICON_MAP[article.category];

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
      className={cn(
        "rounded-lg border border-border/50 bg-card p-4",
        "transition-all duration-200 ease-out",
        "hover:-translate-y-0.5 hover:shadow-md hover:border-border"
      )}
    >
      {/* 상단: 카테고리 배지 + 발행일 */}
      <div className="flex items-center justify-between mb-3">
        <Badge
          variant="outline"
          className={cn(
            "gap-1 text-[10px] font-medium",
            CATEGORY_BADGE_CLASS[article.category]
          )}
        >
          <HugeiconsIcon icon={categoryIcon} size={10} strokeWidth={2} />
          {article.categoryLabel}
        </Badge>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <HugeiconsIcon icon={Calendar03Icon} size={12} strokeWidth={2} />
          {formattedDate}
        </span>
      </div>

      {/* 중단: 제목 + 요약 */}
      <h3 className="text-xs font-semibold leading-relaxed text-foreground line-clamp-2 mb-2">
        {article.title}
      </h3>
      <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2 mb-3">
        {article.summary}
      </p>

      {/* 하단: 키워드 태그 */}
      <div className="flex flex-wrap gap-1.5">
        {article.keywords.slice(0, 4).map((keyword) => (
          <Badge
            key={keyword}
            variant="secondary"
            className="text-[9px] px-1.5 py-0.5 font-normal"
          >
            {keyword}
          </Badge>
        ))}
      </div>
    </article>
  );
}
