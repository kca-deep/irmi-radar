import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSummary } from "@/components/dashboard/dashboard-summary";
import { CategoryRiskList } from "@/components/dashboard/category-risk-list";
import { AiBriefingPanel } from "@/components/dashboard/ai-briefing-panel";
import { UnifiedCrisisPanel } from "@/components/dashboard/unified-crisis-panel";

import type { DashboardData, BriefingData, CrisisChainData, NewsArticle } from "@/lib/types";

interface DashboardPageProps {
  dashboard: DashboardData;
  briefing: BriefingData;
  crisisChain: CrisisChainData;
  articles: NewsArticle[];
}

export function DashboardPage({ dashboard, briefing, crisisChain, articles }: DashboardPageProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <DashboardHeader lastUpdated={dashboard.lastUpdated} />

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* AI Briefing - full width */}
        <div className="sm:col-span-2 lg:col-span-3">
          <AiBriefingPanel briefing={briefing} articles={articles} />
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

      </div>
    </div>
  );
}
