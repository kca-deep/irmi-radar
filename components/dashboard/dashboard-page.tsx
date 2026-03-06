import { DashboardHeader } from "@/components/dashboard/dashboard-header";
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
        {/* AI Briefing + 종합점수 - full width */}
        <div className="sm:col-span-2 lg:col-span-3">
          <AiBriefingPanel
            briefing={briefing}
            articles={articles}
            overallScore={dashboard.overallScore}
          />
        </div>

        {/* 위기 연쇄 현황 + 카테고리별 위험도 - 높이 통일 */}
        <div className="lg:col-span-2 [&>div]:h-full">
          <UnifiedCrisisPanel
            crisisChain={crisisChain}
            signals={dashboard.recentSignals}
            signalStats={dashboard.signalStats}
          />
        </div>

        <div className="[&>div]:h-full">
          <CategoryRiskList categories={dashboard.categories} />
        </div>
      </div>
    </div>
  );
}
