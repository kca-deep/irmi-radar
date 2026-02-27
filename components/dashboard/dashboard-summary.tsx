import { RiskGauge } from "@/components/dashboard/risk-gauge";
import { ScoreTrendChart } from "@/components/dashboard/score-trend-chart";

import type { ScoreHistoryEntry } from "@/lib/types";

interface DashboardSummaryProps {
  overallScore: number;
  scoreHistory: ScoreHistoryEntry[];
}

export function DashboardSummary({
  overallScore,
  scoreHistory,
}: DashboardSummaryProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
        {/* Gauge - hero size */}
        <div className="flex shrink-0 flex-col items-center">
          <div className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            종합 점수
          </div>
          <RiskGauge score={overallScore} />
        </div>

        {/* Divider */}
        <div className="hidden h-40 w-px bg-border/50 sm:block" />
        <div className="h-px w-full bg-border/50 sm:hidden" />

        {/* Score trend chart */}
        <div className="w-full flex-1">
          <div className="mb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            점수 추이
          </div>
          <ScoreTrendChart history={scoreHistory} />
        </div>
      </div>
    </div>
  );
}
