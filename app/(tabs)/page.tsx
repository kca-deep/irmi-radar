import { DashboardPage } from "@/components/irumi/pages/dashboard-page";
import { loadDashboard, loadArticleDailyStats, loadEmergingIssues } from "@/lib/api/data-source";
import { transformDashboard } from "@/lib/irumi/transform";
import type { DashboardData } from "@/lib/irumi/types";
import type { BriefingData, CategoryKey } from "@/lib/types";

export const revalidate = 60; // 60초 캐싱 (force-dynamic 제거)

const FALLBACK_DATA: DashboardData = {
  compositeIndex: 0,
  indexChange: 0,
  aiSummaryTitle: "분석 데이터 없음",
  aiSummaryBody: "AI 분석을 실행하면 결과가 표시됩니다.",
  aiSummaryTime: "00:00",
  trendData: [],
  heatmapDates: [],
  riskByCategory: [],
  heatmapData: [],
  signals: [],
  emergingIssues: [],
};

/** loadDashboard()._briefing에서 briefing 구성 (중복 DB 쿼리 제거) */
function extractBriefing(dashboard: ReturnType<typeof loadDashboard>): BriefingData {
  const b = dashboard._briefing;
  return {
    generatedAt: dashboard.lastUpdated,
    summary: b?.summary || "",
    highlights: (b?.keyRisks || []).map((risk: string) => ({
      category: "prices" as CategoryKey,
      message: risk,
    })),
    recommendation: b?.outlook || "",
    forecast: { scenarios: [], period: "1m", outlook: b?.outlook || "" },
  };
}

export default function Page() {
  let data: DashboardData;

  try {
    const dashboard = loadDashboard();
    const briefing = extractBriefing(dashboard);
    const articleStats = loadArticleDailyStats(14);
    const emergingIssues = dashboard.runId ? loadEmergingIssues() : [];
    data = transformDashboard(dashboard, briefing, articleStats, emergingIssues);
  } catch {
    data = FALLBACK_DATA;
  }

  return <DashboardPage data={data} />;
}
