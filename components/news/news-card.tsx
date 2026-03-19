"use client";

import { useState, memo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CATEGORY_ICON_MAP } from "@/lib/icon-maps";
import { SEVERITY_LABEL_MAP } from "@/lib/constants";
import { cn } from "@/lib/utils";

import type { NewsArticle } from "@/lib/types";

interface NewsCardProps {
  article: NewsArticle;
  featured?: boolean;
  onClick?: (article: NewsArticle) => void;
}

const CATEGORY_ICON_BG: Record<string, { bg: string; color: string }> = {
  prices:       { bg: "#FFF8E1", color: "#F0A000" },
  employment:   { bg: "#EDF2FF", color: "#4C6EF5" },
  selfEmployed: { bg: "#F8D7DA", color: "#D94040" },
  finance:      { bg: "#E8F4FE", color: "#1E8BC3" },
  realEstate:   { bg: "#EDF7ED", color: "#3A9E42" },
  other:        { bg: "#F3F4F6", color: "#6B7280" },
};

const RISK_DOT_COLOR: Record<string, string> = {
  critical: "#E24B4A",
  warning:  "#FF6600",
  caution:  "#FFAA00",
  safe:     "#5DAA30",
};

const LINE_CLAMP_4 = { display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties;
const LINE_CLAMP_2 = { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties;

export const NewsCard = memo(function NewsCard({ article, featured = false, onClick }: NewsCardProps) {
  const categoryIcon = CATEGORY_ICON_MAP[article.category];
  const analysis = article.analysis;
  const [imgError, setImgError] = useState(false);
  const thumbnailUrl = !imgError ? article.thumbnailUrl : undefined;
  const catStyle = CATEGORY_ICON_BG[article.category] ?? CATEGORY_ICON_BG.other;

  const formattedDate = new Date(article.publishedAt).toLocaleDateString(
    "ko-KR",
    { month: "short", day: "numeric" }
  );

  const severityKey = analysis?.severity;
  const dotColor = severityKey ? RISK_DOT_COLOR[severityKey] ?? "#AAAAAA" : "#AAAAAA";
  const isUrgent = severityKey === "critical";

  // Figma 형태: 아이콘 배경 사각형 + 카테고리 텍스트
  const categoryBadge = (
    <div className="flex items-center">
      <div
        className="w-[32px] h-[32px] rounded-[9px] flex items-center justify-center shrink-0"
        style={{ backgroundColor: catStyle.bg }}
      >
        <HugeiconsIcon icon={categoryIcon} size={16} color={catStyle.color} strokeWidth={1.5} />
      </div>
      <span className="text-[11px] font-[600] text-[#555555] ml-[7px]">
        {article.categoryLabel}
      </span>
    </div>
  );

  // dot + 등급 텍스트 + 점수
  const riskBadge = severityKey ? (
    <div className="flex items-center gap-[5px]">
      <div className="flex flex-col items-center gap-[2px]">
        <div className="relative flex items-center justify-center w-[7px] h-[7px]">
          {isUrgent && (
            <div
              className="absolute w-[7px] h-[7px] rounded-full bg-[#E24B4A] animate-ping"
              style={{ animationDuration: "1.5s", opacity: 0.6 }}
            />
          )}
          <div
            className="relative z-10 w-[7px] h-[7px] rounded-full"
            style={{ backgroundColor: dotColor }}
          />
        </div>
        <span className="text-[8.5px] font-[600] text-[#AAAAAA]">
          {SEVERITY_LABEL_MAP[severityKey]}
        </span>
      </div>
      {analysis && (
        <span className="text-[13px] font-[800] tabular-nums" style={{ color: dotColor }}>
          {analysis.riskScore}
        </span>
      )}
    </div>
  ) : null;

  const metaRow = (
    <div className="flex items-center justify-between mb-2">
      {categoryBadge}
      {riskBadge}
    </div>
  );

  // Figma 형태 키워드: 배경만 있는 단순 pill
  const keywordTags = article.keywords.length > 0 && (
    <div className="flex flex-wrap gap-[5px] mt-auto">
      {article.keywords.slice(0, featured ? 6 : 4).map((keyword) => (
        <span
          key={keyword}
          className="text-[10px] text-[#888888] bg-[#F5F5F5] px-[7px] py-[3px] rounded-[20px]"
        >
          {keyword}
        </span>
      ))}
    </div>
  );

  // 하단: 날짜(왼쪽) + 상세(오른쪽)
  const bottomRow = (
    <div className="pt-[8px] border-t-[0.5px] border-[#F5F5F5] flex items-center justify-between mt-2">
      <span className="text-[10px] text-[#BBBBBB]">{formattedDate}</span>
      <span className="text-[10px] font-[700] text-[#FF6600]">상세 →</span>
    </div>
  );

  // --- Featured (메인 카드): 좌측 썸네일 + 우측 텍스트 ---
  if (featured) {
    return (
      <article
        onClick={() => onClick?.(article)}
        className={cn(
          "bg-white rounded-[14px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] cursor-pointer h-full",
          "transition-all duration-200 ease-out",
          "hover:-translate-y-[2px] hover:shadow-[0_6px_20px_rgba(0,0,0,0.10)]",
          "overflow-hidden flex flex-row"
        )}
      >
        {thumbnailUrl && (
          <div className="shrink-0 w-1/2 h-78 bg-[#F0F0F0] overflow-hidden">
            <img
              src={thumbnailUrl}
              alt=""
              className="w-full h-full object-cover object-top"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          </div>
        )}

        <div className="p-[16px] flex flex-col flex-1 min-w-0" style={{ gap: "9px" }}>
          {metaRow}

          <h3 className="font-[700] text-[#1A1A1A] leading-[1.5] line-clamp-2 text-[15px]">
            {article.title}
          </h3>
          <p
            className="text-[#888888] leading-[1.6] text-[12px] flex-1"
            style={LINE_CLAMP_4}
          >
            {article.summary}
          </p>

          {keywordTags}
          {bottomRow}
        </div>
      </article>
    );
  }

  // --- Regular (작은 카드): 텍스트 좌측 + 썸네일 우측 ---
  return (
    <article
      onClick={() => onClick?.(article)}
      className={cn(
        "bg-white rounded-[14px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] cursor-pointer h-full flex flex-col",
        "transition-all duration-200 ease-out",
        "hover:-translate-y-[2px] hover:shadow-[0_6px_20px_rgba(0,0,0,0.10)]",
        "p-[16px]"
      )}
    >
      {metaRow}

      <div className={cn("flex gap-3 mb-2 flex-1", thumbnailUrl && "min-h-0")}>
        <div className="flex-1 min-w-0">
          <h3 className="font-[700] text-[#1A1A1A] leading-[1.5] mb-1 text-[13px] line-clamp-2">
            {article.title}
          </h3>
          <p
            className="text-[#888888] leading-[1.6] text-[11px]"
            style={LINE_CLAMP_2}
          >
            {article.summary}
          </p>
        </div>

        {thumbnailUrl && (
          <div className="shrink-0 w-28 aspect-4/3 rounded-md bg-[#F0F0F0] overflow-hidden">
            <img
              src={thumbnailUrl}
              alt=""
              className="w-full h-full object-cover object-top"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          </div>
        )}
      </div>

      {keywordTags}
      {bottomRow}
    </article>
  );
});
