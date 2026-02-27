"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { FilterIcon } from "@hugeicons/core-free-icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CATEGORIES,
  REGIONS,
  SEVERITY_CONFIG,
  CATEGORY_LABEL_MAP,
  SEVERITY_LABEL_MAP,
} from "@/lib/constants";

import type { CategoryKey, Severity } from "@/lib/types";

interface SignalsFilterBarProps {
  category: CategoryKey | "all";
  region: string;
  severity: Severity | "all";
  onCategoryChange: (value: CategoryKey | "all") => void;
  onRegionChange: (value: string) => void;
  onSeverityChange: (value: Severity | "all") => void;
}

// 카테고리 라벨 가져오기
function getCategoryLabel(value: CategoryKey | "all"): string {
  if (value === "all") return "전체 카테고리";
  return CATEGORY_LABEL_MAP[value] || value;
}

// 등급 라벨 가져오기
function getSeverityLabel(value: Severity | "all"): string {
  if (value === "all") return "전체 등급";
  return SEVERITY_LABEL_MAP[value] || value;
}

// 지역 라벨 가져오기
function getRegionLabel(value: string): string {
  if (value === "all") return "전체 지역";
  return value;
}

export function SignalsFilterBar({
  category,
  region,
  severity,
  onCategoryChange,
  onRegionChange,
  onSeverityChange,
}: SignalsFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-border/50 bg-card">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <HugeiconsIcon icon={FilterIcon} size={16} strokeWidth={2} />
        <span className="font-medium">필터</span>
      </div>

      {/* 카테고리 필터 */}
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

      {/* 지역 필터 */}
      <Select
        value={region}
        onValueChange={(v) => {
          if (v !== null) onRegionChange(v);
        }}
      >
        <SelectTrigger className="w-[120px] h-9">
          <SelectValue placeholder="지역">{getRegionLabel(region)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 지역</SelectItem>
          {REGIONS.map((r) => (
            <SelectItem key={r.id} value={r.name}>
              {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 등급 필터 */}
      <Select
        value={severity}
        onValueChange={(v) => {
          if (v !== null) onSeverityChange(v as Severity | "all");
        }}
      >
        <SelectTrigger className="w-[120px] h-9">
          <SelectValue placeholder="등급">
            {getSeverityLabel(severity)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 등급</SelectItem>
          {SEVERITY_CONFIG.map((sev) => (
            <SelectItem key={sev.key} value={sev.key}>
              {sev.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
