import { CategoryRiskBar } from "@/components/dashboard/category-risk-bar";
import { CATEGORIES } from "@/lib/constants";

import type { CategoryKey, CategoryRisk } from "@/lib/types";

interface CategoryRiskListProps {
  categories: Record<CategoryKey, CategoryRisk>;
}

export function CategoryRiskList({ categories }: CategoryRiskListProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5">
      <div className="mb-3 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        카테고리별 위험도
      </div>
      <div className="flex flex-col gap-3">
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
