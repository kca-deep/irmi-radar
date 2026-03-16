"use client";

import { useState } from "react";
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
  const [imgError, setImgError] = useState(false);
  const thumbnailUrl = !imgError ? article.thumbnailUrl : undefined;

  // 날짜 포맷
  const formattedDate = new Date(article.publishedAt).toLocaleDateString(
    "ko-KR",
    {
      month: "short",
      day: "numeric",
    }
  );

  // 메타 배지 행 (카테고리 + 위험도/발행일)
  const metaRow = (
    <div className="flex items-center justify-between mb-2">
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
  );

  // 키워드 태그
  const keywordTags = article.keywords.length > 0 && (
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
  );

  // --- Featured (큰 카드): 좌측 이미지 + 우측 텍스트 (mk.co.kr 히어로 스타일) ---
  if (featured) {
    return (
      <article
        onClick={() => onClick?.(article)}
        className={cn(
          "rounded-lg border border-border bg-card shadow-sm cursor-pointer h-full",
          "transition-all duration-200 ease-out",
          "hover:-translate-y-0.5 hover:shadow-md",
          "overflow-hidden",
          thumbnailUrl ? "flex flex-col sm:flex-row" : "flex flex-col"
        )}
      >
        {/* 썸네일 (좌측 절반) */}
        {thumbnailUrl && (
          <div className="relative sm:w-1/2 shrink-0 aspect-video sm:aspect-auto bg-muted overflow-hidden">
            <img
              src={thumbnailUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          </div>
        )}

        <div className="p-5 flex flex-col flex-1 min-w-0">
          {metaRow}

          <h3 className="font-semibold leading-snug text-foreground mb-2 text-base line-clamp-3">
            {article.title}
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground mb-3 flex-1 line-clamp-4">
            {article.summary}
          </p>

          {keywordTags}
        </div>
      </article>
    );
  }

  // --- Regular (작은 카드): 텍스트 좌측 + 썸네일 우측 ---
  return (
    <article
      onClick={() => onClick?.(article)}
      className={cn(
        "rounded-lg border border-border bg-card shadow-sm cursor-pointer h-full flex flex-col",
        "transition-all duration-200 ease-out",
        "hover:-translate-y-0.5 hover:shadow-md",
        "p-4"
      )}
    >
      {metaRow}

      <div className={cn("flex gap-3 mb-2 flex-1", thumbnailUrl && "min-h-0")}>
        {/* 텍스트 영역 */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold leading-relaxed text-foreground mb-1 text-xs line-clamp-2">
            {article.title}
          </h3>
          <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
            {article.summary}
          </p>
        </div>

        {/* 썸네일 (4:3 비율) */}
        {thumbnailUrl && (
          <div className="shrink-0 w-28 aspect-4/3 rounded-md bg-muted overflow-hidden">
            <img
              src={thumbnailUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          </div>
        )}
      </div>

      {keywordTags}
    </article>
  );
}
