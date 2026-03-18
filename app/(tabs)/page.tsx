import { DashboardPage } from "@/components/irumi/pages/dashboard-page";
import { loadDashboard, loadBriefing, loadArticleDailyStats, loadEmergingIssues } from "@/lib/api/data-source";
import { transformDashboard } from "@/lib/irumi/transform";
import type { DashboardData } from "@/lib/irumi/types";

export const dynamic = "force-dynamic";

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

export default function Page() {
  let data: DashboardData;

  try {
    const dashboard = loadDashboard();
    const briefing = loadBriefing();
    const articleStats = loadArticleDailyStats(14);
    // AI 분석 결과가 있을 때만 이머징 이슈 로드
    const emergingIssues = dashboard.runId ? loadEmergingIssues() : [];
    data = transformDashboard(dashboard, briefing, articleStats, emergingIssues);
  } catch {
    data = FALLBACK_DATA;
  }

  return <DashboardPage data={data} />;
}
