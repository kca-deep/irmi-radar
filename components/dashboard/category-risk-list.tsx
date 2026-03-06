import { HugeiconsIcon } from "@hugeicons/react";
import { AnalyticsUpIcon } from "@hugeicons/core-free-icons";
import { CategoryRiskBar } from "@/components/dashboard/category-risk-bar";
import { CATEGORIES } from "@/lib/constants";

import type { CategoryKey, CategoryRisk } from "@/lib/types";

interface CategoryRiskListProps {
  categories: Record<CategoryKey, CategoryRisk>;
}

export function CategoryRiskList({ categories }: CategoryRiskListProps) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card shadow-sm p-5">
      {/* Header - 위기연쇄현황 패턴 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={AnalyticsUpIcon}
            size={18}
            strokeWidth={2}
            className="text-score-accent"
          />
          <h3 className="text-sm font-semibold text-foreground">
            카테고리별 위험도
          </h3>
        </div>
      </div>

      {/* Category bars - 균등 배치 */}
      <div className="flex flex-1 flex-col justify-between">
        {CATEGORIES.map((cat, index) => {
          const risk = categories[cat.key];
          return (
            <CategoryRiskBar
              key={cat.key}
              categoryKey={cat.key}
              label={cat.label}
              score={risk.score}
              trend={risk.trend}
              keyIssues={risk.keyIssues}
              index={index}
            />
          );
        })}
      </div>
    </div>
  );
}
