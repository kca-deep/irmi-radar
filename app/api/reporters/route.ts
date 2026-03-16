import { successResponse, errorResponse } from "@/lib/api/response";
import { loadReporterData } from "@/lib/irumi/reporters-query";
import type { ReporterData } from "@/lib/irumi/types";

/**
 * GET /api/reporters
 * 기자의 시선 -- 실시간 SQLite 쿼리 기반 기자 분석 데이터
 */
export async function GET() {
  try {
    const data: ReporterData = loadReporterData();
    return successResponse(data);
  } catch (error) {
    console.error("Reporters API error:", error);
    return errorResponse("Failed to load reporter data", 500);
  }
}
