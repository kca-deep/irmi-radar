"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { CATEGORIES } from "@/lib/constants";

import type { CategoryKey } from "@/lib/types";

interface NewsFilterBarProps {
  searchQuery: string;
  category: CategoryKey | "all";
  totalCount: number;
  analyzedOnly: boolean;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: CategoryKey | "all") => void;
  onAnalyzedOnlyChange: (value: boolean) => void;
}

export function NewsFilterBar({
  searchQuery,
  category,
  analyzedOnly,
  onSearchChange,
  onCategoryChange,
  onAnalyzedOnlyChange,
}: NewsFilterBarProps) {
  return (
    <div className="h-[44px] bg-card rounded-[10px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] px-[16px] flex items-center gap-[8px] mb-[14px]">
      {/* 검색 */}
      <div className="flex items-center gap-[8px]">
        <HugeiconsIcon icon={Search01Icon} size={14} color="#CCCCCC" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="기사 검색..."
          className="border-none outline-none text-[11px] text-[#333333] placeholder:text-[#CCCCCC] w-[150px] bg-transparent"
        />
      </div>

      <div className="w-[0.5px] h-[18px] bg-[#EEEEEE]" />

      {/* 카테고리 필터 */}
      <div className="flex gap-[2px]">
        <button
          onClick={() => onCategoryChange("all")}
          className={`text-[11px] px-[11px] py-[5px] rounded-[8px] border-none cursor-pointer transition-colors ${
            category === "all"
              ? "bg-[#F5F5F5] text-foreground font-[700]"
              : "bg-transparent text-[#BBBBBB] hover:text-foreground"
          }`}
        >
          전체
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => onCategoryChange(cat.key)}
            className={`text-[11px] px-[11px] py-[5px] rounded-[8px] border-none cursor-pointer transition-colors ${
              category === cat.key
                ? "bg-[#F5F5F5] text-foreground font-[700]"
                : "bg-transparent text-[#BBBBBB] hover:text-foreground"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="w-[0.5px] h-[18px] bg-[#EEEEEE]" />

      {/* 분석 완료만 토글 */}
      <div
        className="flex items-center gap-[6px] cursor-pointer"
        onClick={() => onAnalyzedOnlyChange(!analyzedOnly)}
      >
        <div className={`w-[28px] h-[16px] rounded-[8px] relative transition-colors ${analyzedOnly ? "bg-[#E8521A]" : "bg-[#CCCCCC]"}`}>
          <div className={`absolute top-[2px] w-[12px] h-[12px] rounded-full bg-white transition-all ${analyzedOnly ? "right-[2px]" : "left-[2px]"}`} />
        </div>
        <span className="text-[11px] text-[#888888]">분석 완료만</span>
      </div>
    </div>
  );
}
