import { DashboardPage } from "@/components/irumi/pages/dashboard-page";
import { loadDashboard, loadBriefing } from "@/lib/api/data-source";
import { transformDashboard } from "@/lib/irumi/transform";
import type { DashboardData } from "@/lib/irumi/types";

export const dynamic = "force-dynamic";

const FALLBACK_DATA: DashboardData = {
  compositeIndex: 52,
  indexChange: -2,
  aiSummaryTitle: "데이터를 불러오는 중입니다.",
  aiSummaryBody: "잠시 후 다시 시도해 주세요.",
  aiSummaryTime: "00:00",
  trendData: [
    { day: "D-6", value: 50 },
    { day: "D-5", value: 51 },
    { day: "D-4", value: 53 },
    { day: "D-3", value: 52 },
    { day: "D-2", value: 54 },
    { day: "D-1", value: 53 },
    { day: "오늘", value: 52 },
  ],
  heatmapDates: ["D-6", "D-5", "D-4", "D-3", "D-2", "D-1", "오늘"],
  riskByCategory: [
    { name: "물가", value: 55, diff: "+2", color: "#FFAA00" },
    { name: "고용", value: 48, diff: "0", color: "#FFAA00" },
    { name: "자영업", value: 62, diff: "+3", color: "#FF6600" },
    { name: "금융", value: 45, diff: "-1", color: "#FFAA00" },
    { name: "부동산", value: 50, diff: "+1", color: "#FFAA00" },
  ],
  heatmapData: [
    { label: "물가", cells: [2, 2, 3, 2, 2, 3, 2], today: 2 },
    { label: "고용", cells: [1, 2, 2, 1, 2, 2, 2], today: 2 },
    { label: "자영업", cells: [3, 3, 3, 3, 3, 3, 3], today: 3 },
    { label: "금융", cells: [2, 1, 2, 2, 1, 2, 2], today: 2 },
    { label: "부동산", cells: [2, 2, 2, 2, 2, 2, 2], today: 2 },
  ],
  signals: [],
  emergingIssues: [],
};

export default function Page() {
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
