import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { HeroKpiTile } from "@/components/dashboard/hero-kpi-tile";
import { CategoryRiskList } from "@/components/dashboard/category-risk-list";
import { BriefingCompact } from "@/components/dashboard/briefing-compact";
import { NewsTickerStrip } from "@/components/dashboard/news-ticker-strip";
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
    <div className="flex flex-col gap-4">
      {/* Header */}
      <DashboardHeader />

      {/* ── Row 1: KPI Bento ── */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-5">
        {/* Hero KPI (종합 게이지 + 위기신호 통계 + 최근 신호) */}
        <div className="lg:col-span-3 [&>div]:h-full">
          <HeroKpiTile
            score={dashboard.overallScore}
            lastUpdated={dashboard.lastUpdated}
            scoreHistory={dashboard.scoreHistory}
            stats={dashboard.signalStats}
            recentSignals={dashboard.recentSignals}
            categoryDist={dashboard.categoryDist}
            signalDelta={dashboard.signalDelta}
          />
        </div>

        {/* Category Risk Bars (5대 카테고리 위험도) */}
        <div className="lg:col-span-2 [&>div]:h-full">
          <CategoryRiskList categories={dashboard.categories} />
        </div>
      </div>

      {/* ── Row 2: AI News Ticker (full width) ── */}
      <NewsTickerStrip articles={articles} />

      {/* ── Row 3: Briefing + Crisis Chain ── */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-5">
        {/* 민생 브리핑 (컴팩트) */}
        <div className="lg:col-span-2 [&>div]:h-full">
          <BriefingCompact briefing={briefing} />
        </div>

        {/* 위기 연쇄 현황 + 신호 사이드바 */}
        <div className="lg:col-span-3 [&>div]:h-full">
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
