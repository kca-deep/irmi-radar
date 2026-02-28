import { successResponse, errorResponse, getSearchParams } from "@/lib/api/response";
import { loadDashboard, loadBriefing, loadCrisisChain } from "@/lib/api/mock-data";

import type { DashboardData, BriefingData, CrisisChainData } from "@/lib/types";

export interface DashboardApiResponse {
  dashboard: DashboardData;
  briefing: BriefingData;
  crisisChain: CrisisChainData;
}

/**
 * GET /api/dashboard
 * 대시보드 종합 데이터 조회
 *
 * Query params:
 * - period: "1w" | "1m" | "3m" (기본값: "1w")
 */
export async function GET(request: Request) {
  try {
    const params = getSearchParams(request);
    const period = params.get("period") || "1w";

    // 유효한 period 값 검증
    if (!["1w", "1m", "3m"].includes(period)) {
      return errorResponse("Invalid period parameter. Use: 1w, 1m, 3m", 400);
    }

    // TODO: period에 따른 데이터 필터링 (해커톤 당일 구현)
    const dashboard = loadDashboard();
    const briefing = loadBriefing();
    const crisisChain = loadCrisisChain();

    const data: DashboardApiResponse = {
      dashboard,
      briefing,
      crisisChain,
    };

    return successResponse(data);
  } catch (error) {
    console.error("Dashboard API error:", error);
    return errorResponse("Failed to load dashboard data", 500);
  }
}
