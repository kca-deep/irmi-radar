import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSummary } from "@/components/dashboard/dashboard-summary";
import { CategoryRiskList } from "@/components/dashboard/category-risk-list";
import { AiBriefingPanel } from "@/components/dashboard/ai-briefing-panel";
import { ForecastPanel } from "@/components/dashboard/forecast-panel";
import { UnifiedCrisisPanel } from "@/components/dashboard/unified-crisis-panel";

import type { DashboardData, BriefingData, CrisisChainData } from "@/lib/types";

interface DashboardPageProps {
  dashboard: DashboardData;
  briefing: BriefingData;
  crisisChain: CrisisChainData;
}

export function DashboardPage({ dashboard, briefing, crisisChain }: DashboardPageProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <DashboardHeader lastUpdated={dashboard.lastUpdated} />

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* AI Briefing - full width */}
        <div className="sm:col-span-2 lg:col-span-3">
          <AiBriefingPanel briefing={briefing} />
        </div>

        {/* Summary (gauge + trend chart) - spans 2 cols on lg */}
        <div className="lg:col-span-2">
          <DashboardSummary
            overallScore={dashboard.overallScore}
            scoreHistory={dashboard.scoreHistory}
          />
        </div>

        {/* Category risk list - 1 col */}
        <CategoryRiskList categories={dashboard.categories} />

        {/* Unified Crisis Panel (Chain Map + Signals) - full width */}
        <div className="sm:col-span-2 lg:col-span-3">
          <UnifiedCrisisPanel
            crisisChain={crisisChain}
            signals={dashboard.recentSignals}
            signalStats={dashboard.signalStats}
          />
        </div>

        {/* Forecast - full width */}
        <div className="sm:col-span-2 lg:col-span-3">
          <ForecastPanel forecast={briefing.forecast} />
        </div>
      </div>
    </div>
  );
}
