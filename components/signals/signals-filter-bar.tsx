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

function getCategoryLabel(value: CategoryKey | "all"): string {
  if (value === "all") return "전체";
  return CATEGORY_LABEL_MAP[value] || value;
}

function getSeverityLabel(value: Severity | "all"): string {
  if (value === "all") return "전체";
  return SEVERITY_LABEL_MAP[value] || value;
}

function getRegionLabel(value: string): string {
  if (value === "all") return "전체";
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
    <div className="flex flex-wrap items-center gap-2">
      <HugeiconsIcon
        icon={FilterIcon}
        size={14}
        strokeWidth={2}
        className="text-muted-foreground"
      />

      <Select
        value={category}
        onValueChange={(v) => {
          if (v !== null) onCategoryChange(v as CategoryKey | "all");
        }}
      >
        <SelectTrigger className="w-[110px] h-7 text-xs">
          <SelectValue placeholder="카테고리">
            {getCategoryLabel(category)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체</SelectItem>
          {CATEGORIES.map((cat) => (
            <SelectItem key={cat.key} value={cat.key}>
              {cat.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={region}
        onValueChange={(v) => {
          if (v !== null) onRegionChange(v);
        }}
      >
        <SelectTrigger className="w-[90px] h-7 text-xs">
          <SelectValue placeholder="지역">{getRegionLabel(region)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체</SelectItem>
          {REGIONS.map((r) => (
            <SelectItem key={r.id} value={r.name}>
              {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={severity}
        onValueChange={(v) => {
          if (v !== null) onSeverityChange(v as Severity | "all");
        }}
      >
        <SelectTrigger className="w-[90px] h-7 text-xs">
          <SelectValue placeholder="등급">
            {getSeverityLabel(severity)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체</SelectItem>
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
