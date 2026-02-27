import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSummary } from "@/components/dashboard/dashboard-summary";
import { CategoryRiskList } from "@/components/dashboard/category-risk-list";
import { RecentSignals } from "@/components/dashboard/recent-signals";
import { AiBriefingPanel } from "@/components/dashboard/ai-briefing-panel";
import { ForecastPanel } from "@/components/dashboard/forecast-panel";

import type { DashboardData, BriefingData } from "@/lib/types";

interface DashboardPageProps {
  dashboard: DashboardData;
  briefing: BriefingData;
}

export function DashboardPage({ dashboard, briefing }: DashboardPageProps) {
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

        {/* Summary (gauge + stats) - spans 2 cols on lg */}
        <div className="lg:col-span-2">
          <DashboardSummary
            overallScore={dashboard.overallScore}
            stats={dashboard.signalStats}
          />
        </div>

        {/* Category risk list - 1 col */}
        <CategoryRiskList categories={dashboard.categories} />

        {/* Recent signals - spans 2 cols on sm */}
        <div className="sm:col-span-2">
          <RecentSignals signals={dashboard.recentSignals} />
        </div>

        {/* Forecast */}
        <ForecastPanel forecast={briefing.forecast} />
      </div>
    </div>
  );
}
