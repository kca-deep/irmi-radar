import { ScoreTrendChart } from "@/components/dashboard/score-trend-chart";

import type { ScoreHistoryEntry } from "@/lib/types";

interface DashboardSummaryProps {
  scoreHistory: ScoreHistoryEntry[];
}

export function DashboardSummary({
  scoreHistory,
}: DashboardSummaryProps) {
  return (
    <div className="rounded-xl border border-score-accent/20 bg-score-surface p-5">
      <div className="mb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        점수 추이
      </div>
      <ScoreTrendChart history={scoreHistory} />
    </div>
  );
}
