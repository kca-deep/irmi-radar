/**
 * app/irumi/page.tsx -- 대시보드 메인 (Server Component)
 *
 * 기존 데이터 소스(loadDashboard, loadBriefing)에서 데이터를 가져와
 * irumi DashboardData 형태로 변환하여 전달합니다.
 */

import { DashboardPage } from "@/components/irumi/pages/dashboard-page";
import { loadDashboard, loadBriefing } from "@/lib/api/data-source";
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

export default function DashboardRoute() {
  let data: DashboardData;

  try {
    const dashboard = loadDashboard();
    const briefing = loadBriefing();
    data = transformDashboard(dashboard, briefing);
  } catch {
    data = FALLBACK_DATA;
  }

  return <DashboardPage data={data} />;
}
