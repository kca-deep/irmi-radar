"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, FilterIcon } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, CATEGORY_LABEL_MAP } from "@/lib/constants";

import type { CategoryKey } from "@/lib/types";

interface NewsFilterBarProps {
  searchQuery: string;
  category: CategoryKey | "all";
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: CategoryKey | "all") => void;
}

function getCategoryLabel(value: CategoryKey | "all"): string {
  if (value === "all") return "전체 카테고리";
  return CATEGORY_LABEL_MAP[value] || value;
}

export function NewsFilterBar({
  searchQuery,
  category,
  onSearchChange,
  onCategoryChange,
}: NewsFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-border/50 bg-card">
      {/* 검색 */}
      <div className="relative flex-1 min-w-[200px]">
        <HugeiconsIcon
          icon={Search01Icon}
          size={16}
          strokeWidth={2}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="text"
          placeholder="뉴스 검색..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 pl-9 text-sm"
        />
      </div>

      {/* 카테고리 필터 */}
      <div className="flex items-center gap-2">
        <HugeiconsIcon
          icon={FilterIcon}
          size={16}
          strokeWidth={2}
          className="text-muted-foreground"
        />
        <Select
          value={category}
          onValueChange={(v) => {
            if (v !== null) onCategoryChange(v as CategoryKey | "all");
          }}
        >
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="카테고리">
              {getCategoryLabel(category)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 카테고리</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.key} value={cat.key}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
