"use client";

import { useState, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnalyticsUpIcon } from "@hugeicons/core-free-icons";
import { CategoryRiskBar } from "@/components/dashboard/category-risk-bar";
import { CATEGORIES } from "@/lib/constants";

import type { CategoryKey, CategoryRisk, DailyDelta } from "@/lib/types";

interface CategoryRiskListProps {
  categories: Record<CategoryKey, CategoryRisk>;
  categoryDeltas?: DailyDelta["categories"] | null;
}

export function CategoryRiskList({ categories, categoryDeltas }: CategoryRiskListProps) {
  // 초기값: 점수가 가장 높은 카테고리를 펼침
  const topCategory = useMemo(() => {
    let maxKey: CategoryKey = CATEGORIES[0].key;
    let maxScore = 0;
    for (const cat of CATEGORIES) {
      const risk = categories[cat.key];
      if (risk && risk.score > maxScore) {
        maxScore = risk.score;
        maxKey = cat.key;
      }
    }
    return maxKey;
  }, [categories]);

  const [openCategory, setOpenCategory] = useState<CategoryKey | null>(topCategory);

  const handleToggle = (key: CategoryKey) => {
    setOpenCategory((prev) => (prev === key ? null : key));
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card shadow-sm p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={AnalyticsUpIcon}
            size={18}
            strokeWidth={2}
            className="text-brand"
          />
          <h3 className="text-sm font-semibold text-foreground">
            카테고리별 위험도
          </h3>
        </div>
      </div>

      {/* Category cards */}
      <div className="flex flex-1 flex-col">
        {CATEGORIES.map((cat, index) => {
          const risk = categories[cat.key] ?? {
            score: 0,
            trend: "stable" as const,
            keyIssues: [],
          };
          return (
            <CategoryRiskBar
              key={cat.key}
              categoryKey={cat.key}
              label={cat.label}
              score={risk.score}
              trend={risk.trend}
              keyIssues={risk.keyIssues}
              articleCount={risk.articleCount}
              index={index}
              isOpen={openCategory === cat.key}
              isLast={index === CATEGORIES.length - 1}
              onToggle={() => handleToggle(cat.key)}
              delta={categoryDeltas?.[cat.key]?.delta}
              previousScore={categoryDeltas?.[cat.key]?.previousScore}
            />
          );
        })}
      </div>
    </div>
  );
}
