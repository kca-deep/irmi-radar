"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";
import { CATEGORIES } from "@/lib/constants";
import { CATEGORY_ICON_MAP } from "@/lib/icon-maps";
import { cn } from "@/lib/utils";

import type { CategoryKey } from "@/lib/types";

interface NewsFilterBarProps {
  searchQuery: string;
  category: CategoryKey | "all";
  totalCount: number;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: CategoryKey | "all") => void;
}

export function NewsFilterBar({
  searchQuery,
  category,
  totalCount,
  onSearchChange,
  onCategoryChange,
}: NewsFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 검색 */}
      <div className="relative min-w-[180px] max-w-[260px]">
        <HugeiconsIcon
          icon={Search01Icon}
          size={14}
          strokeWidth={2}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="text"
          placeholder="검색..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-7 pl-8 text-xs"
        />
      </div>

      {/* 구분선 */}
      <div className="h-4 w-px bg-border/50 shrink-0" />

      {/* 카테고리 칩 */}
      <div className="flex flex-wrap items-center gap-1">
        <button
          onClick={() => onCategoryChange("all")}
          className={cn(
            "px-2 py-0.5 rounded-md text-xs font-medium transition-colors",
            "border border-border/50",
            category === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          전체
        </button>
        {CATEGORIES.map((cat) => {
          const icon = CATEGORY_ICON_MAP[cat.key];
          return (
            <button
              key={cat.key}
              onClick={() => onCategoryChange(cat.key)}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-colors",
                "border border-border/50",
                category === cat.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <HugeiconsIcon icon={icon} size={12} strokeWidth={2} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* 결과 수 */}
      <span className="ml-auto text-[11px] text-muted-foreground shrink-0">
        {totalCount.toLocaleString()}건
      </span>
    </div>
  );
}
