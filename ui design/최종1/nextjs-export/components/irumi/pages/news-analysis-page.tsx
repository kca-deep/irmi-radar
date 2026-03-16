"use client";

/**
 * news-analysis-page.tsx
 * 변환 포인트:
 *   - lucide-react → @hugeicons/react (Search01Icon, PlayIcon 등)
 *   - figma:asset → /images/irumi-logo.png
 *   - 하드코딩 데이터 제거 → NewsAnalysisData props
 *   - POST /api/analyze (SSE 스트리밍) 연동 예시 포함
 */

import { useState } from "react";
import Image from "next/image";
import {
  Building01Icon,
  Briefcase01Icon,
  ShoppingCart01Icon,
  BankIcon,
  Store01Icon,
  Search01Icon,
} from "@hugeicons/react";
// ↑ PlayIcon은 @hugeicons/react에서 정확한 이름을 확인하세요. 예: PlayIcon or VideoReplayIcon
import type { NewsAnalysisData, NewsArticle } from "@/lib/irumi/types";

const CATEGORIES = ["전체", "물가", "고용", "자영업", "금융", "부동산"] as const;

const CATEGORY_CONFIG: Record<string, { Icon: React.ElementType; iconBg: string; iconColor: string }> = {
  물가:   { Icon: ShoppingCart01Icon, iconBg: "#FFF8E1", iconColor: "#F0A000" },
  고용:   { Icon: Briefcase01Icon,    iconBg: "#EDF2FF", iconColor: "#4C6EF5" },
  자영업: { Icon: Store01Icon,        iconBg: "#F8D7DA", iconColor: "#D94040" },
  금융:   { Icon: BankIcon,           iconBg: "#E8F4FE", iconColor: "#1E8BC3" },
  부동산: { Icon: Building01Icon,     iconBg: "#EDF7ED", iconColor: "#3A9E42" },
};

const RISK_DOT_COLOR: Record<string, string> = {
  긴급: "var(--irumi-urgent)",
  주의: "var(--irumi-brand)",
  관찰: "var(--irumi-watch)",
  안전: "var(--irumi-safe)",
};

interface NewsAnalysisPageProps {
  data: NewsAnalysisData;
  /**
   * AI 분석 실행 콜백 — POST /api/analyze (SSE) 를 호출합니다.
   * 구현 예시:
   *   const response = await fetch('/api/analyze', { method: 'POST', body: JSON.stringify({ category, keyword }) });
   *   const reader = response.body!.getReader();
   *   // SSE 스트리밍 처리
   */
  onAnalyze?: () => void;
  onReset?: () => void;
}

export function NewsAnalysisPage({ data, onAnalyze, onReset }: NewsAnalysisPageProps) {
  const [activeCategory, setActiveCategory] = useState("전체");
  const [keyword, setKeyword] = useState("");
  const [isAnalyzedOnly, setIsAnalyzedOnly] = useState(true);

  const filteredArticles = data.articles.filter((card) => {
    const matchCat     = activeCategory === "전체" || card.category === activeCategory;
    const matchKeyword = keyword === "" ||
      card.title.includes(keyword) ||
      card.keywords.some((k) => k.includes(keyword));
    return matchCat && matchKeyword;
  });

  return (
    <div className="pb-10">
      {/* 페이지 액션 헤더 */}
      <div className="flex items-center justify-between mt-[12px] mb-[12px]">
        <div className="text-[var(--irumi-text-3)] text-[14px]">
          뉴스 기사를 AI로 분석하고 위험도를 확인하세요
        </div>
        <div className="flex items-center gap-[8px]">
          <button
            onClick={onReset}
            className="bg-card border-none rounded-[8px] shadow-[0_1px_6px_rgba(0,0,0,0.08)] px-[14px] py-[7px] text-[var(--irumi-text-3)] cursor-pointer hover:bg-gray-50 transition-colors text-[14px]"
          >
            분석 초기화
          </button>
          <button
            onClick={onAnalyze}
            className="flex items-center gap-[5px] bg-irumi-brand border-none rounded-[8px] px-[16px] py-[7px] text-white font-[700] cursor-pointer hover:bg-irumi-brand-hover transition-colors text-[14px]"
          >
            {/* @hugeicons/react의 PlayIcon 또는 유사 아이콘으로 교체 */}
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            AI 분석 시작하기
          </button>
        </div>
      </div>

      {/* 분석 결과 요약 스트립 */}
      <div className="rounded-[10px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] flex items-center gap-[24px] mb-[12px] relative overflow-hidden px-[20px] py-[6px] bg-[#fff8f2c9]">
        <div className="flex items-baseline gap-[5px]">
          <span className="text-[13px] text-[var(--irumi-text-3)]">분석 완료</span>
          <span className="font-[700] text-[var(--irumi-text-1)] text-[16px]">{data.stats.total}건</span>
        </div>
        <div className="w-[0.5px] h-[18px] bg-[#66666666]" />
        {[
          { label: "긴급", count: data.stats.urgent,  color: "bg-irumi-urgent" },
          { label: "주의", count: data.stats.caution, color: "bg-irumi-brand"  },
          { label: "관찰", count: data.stats.watch,   color: "bg-irumi-watch"  },
        ].map(({ label, count, color }, i) => (
          <div key={label} className="flex items-center gap-[6px]">
            {i > 0 && <div className="w-[0.5px] h-[18px] bg-[#66666633]" />}
            <div className={`w-[7px] h-[7px] rounded-full ${color} shrink-0`} />
            <div className="flex items-baseline gap-[5px]">
              <span className="text-[13px] text-[var(--irumi-text-3)]">{label}</span>
              <span className="font-[700] text-[#5e5a5a] text-[16px]">{count}건</span>
            </div>
          </div>
        ))}
        <div className="ml-auto shrink-0 w-[36px] h-[36px] pointer-events-none select-none">
          <Image src="/images/irumi-logo.png" alt="" width={36} height={36} className="object-contain" style={{ filter: "grayscale(1) brightness(0.75)", opacity: 0.12 }} />
        </div>
      </div>

      {/* 검색/필터 바 */}
      <div className="h-[44px] bg-card rounded-[10px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] px-[16px] flex items-center gap-[8px] mb-[14px]">
        <div className="flex items-center gap-[8px]">
          <Search01Icon size={14} color="#CCCCCC" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="기사 검색..."
            className="border-none outline-none text-[11px] text-[var(--irumi-text-1)] placeholder:text-[#CCCCCC] w-[150px] bg-transparent"
          />
        </div>
        <div className="w-[0.5px] h-[18px] bg-irumi-line" />
        <div className="flex gap-[2px]">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-[11px] px-[11px] py-[5px] rounded-[8px] border-none cursor-pointer transition-colors ${
                activeCategory === cat
                  ? "bg-[#F5F5F5] text-[var(--irumi-text-1)] font-[700]"
                  : "bg-transparent text-[#BBBBBB] hover:text-[var(--irumi-text-1)]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="w-[0.5px] h-[18px] bg-irumi-line" />
        <div
          className="flex items-center gap-[6px] cursor-pointer"
          onClick={() => setIsAnalyzedOnly(!isAnalyzedOnly)}
        >
          <div className={`w-[28px] h-[16px] rounded-[8px] relative transition-colors ${isAnalyzedOnly ? "bg-irumi-caution" : "bg-[#CCCCCC]"}`}>
            <div className={`absolute top-[2px] w-[12px] h-[12px] rounded-full bg-white transition-all ${isAnalyzedOnly ? "right-[2px]" : "left-[2px]"}`} />
          </div>
          <span className="text-[11px] text-[var(--irumi-text-3)]">분석 완료만</span>
        </div>
      </div>

      {/* 기사 카드 그리드 */}
      <div className="grid grid-cols-3 gap-[10px]">
        {filteredArticles.map((card) => {
          const cat       = CATEGORY_CONFIG[card.category] ?? CATEGORY_CONFIG["금융"];
          const CatIcon   = cat.Icon;
          const isUrgent  = card.risk === "긴급";
          const dotColor  = RISK_DOT_COLOR[card.risk] ?? "#AAAAAA";

          return (
            <div
              key={card.id}
              className="bg-card rounded-[14px] shadow-[var(--irumi-shadow-card)] p-[16px] flex flex-col h-[250px] cursor-pointer hover:shadow-[var(--irumi-shadow-card-lg)] hover:-translate-y-[2px] transition-all duration-200"
              style={{ gap: "9px" }}
            >
              {/* 카테고리 + 위험도 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-[32px] h-[32px] rounded-[9px] flex items-center justify-center shrink-0" style={{ backgroundColor: cat.iconBg }}>
                    <CatIcon size={16} color={cat.iconColor} strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-[600] text-[var(--irumi-text-2)] ml-[7px]">{card.category}</span>
                </div>
                <div className="flex flex-col items-center gap-[2px]">
                  <div className="relative flex items-center justify-center w-[7px] h-[7px]">
                    {isUrgent && <div className="absolute w-[7px] h-[7px] rounded-full bg-irumi-urgent animate-ping" style={{ animationDuration: "1.5s", opacity: 0.6 }} />}
                    <div className="relative z-10 w-[7px] h-[7px] rounded-full" style={{ backgroundColor: dotColor }} />
                  </div>
                  <span className="text-[8.5px] font-[600] text-[var(--irumi-text-3)]">{card.risk}</span>
                </div>
              </div>

              {/* 제목 */}
              <h3 className="font-[700] text-[var(--irumi-text-1)] leading-[1.5] line-clamp-2 text-[15px]">{card.title}</h3>

              {/* 본문 */}
              <p className="text-[var(--irumi-text-3)] leading-[1.6] text-[12px]"
                style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}
              >
                {card.body}
              </p>

              {/* 키워드 태그 */}
              <div className="mt-auto flex gap-[5px] flex-wrap">
                {card.keywords.map((kw) => (
                  <span key={kw} className="text-[10px] text-[var(--irumi-text-3)] bg-[#F5F5F5] px-[9px] py-[3px] rounded-[20px]">
                    {kw}
                  </span>
                ))}
              </div>

              {/* 하단 */}
              <div className="pt-[8px] border-t-[0.5px] border-irumi-line flex items-center justify-between">
                <span className="text-[10px] text-[#BBBBBB]">{card.date}</span>
                <span className="text-[10px] font-[700] text-irumi-brand">상세 →</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 더보기 */}
      {data.stats.remaining > 0 && (
        <div className="mt-[12px] flex justify-center">
          <button className="flex flex-col items-center justify-center text-[#CCCCCC] hover:text-irumi-brand transition-colors group border-none bg-transparent cursor-pointer">
            <span className="text-[10px] font-[600] mb-[2px]">{data.stats.remaining}건 남음</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-[20px] h-[20px] group-hover:translate-y-[2px] transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
          </button>
        </div>
      )}

      <div className="mt-[16px]">
        <p className="text-[11px] text-[#CCCCCC]">데이터 출처: 한국은행, 통계청, 매일경제 및 이르미 자체 AI 분석 모델</p>
      </div>
    </div>
  );
}
