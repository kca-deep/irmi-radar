import { RiskGauge } from "@/components/dashboard/risk-gauge";
import { SignalStats } from "@/components/dashboard/signal-stats";

import type { SignalStats as SignalStatsType } from "@/lib/types";

interface DashboardSummaryProps {
  overallScore: number;
  stats: SignalStatsType;
}

export function DashboardSummary({
  overallScore,
  stats,
}: DashboardSummaryProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Risk gauge */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-card p-6">
        <div className="mb-3 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          종합 점수
        </div>
        <RiskGauge score={overallScore} />
      </div>

      {/* Signal stats */}
      <div className="rounded-xl border border-border/50 bg-card p-5">
        <div className="mb-3 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          신호 현황
        </div>
        <SignalStats stats={stats} />
      </div>
    </div>
  );
}
