import { successResponse, errorResponse, getSearchParams } from "@/lib/api/response";
import { loadBriefing } from "@/lib/api/mock-data";

/**
 * GET /api/briefing
 * AI 브리핑 데이터 조회
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

    // TODO: period에 따른 브리핑 생성 (해커톤 당일 Claude API 연결)
    const briefing = loadBriefing();

    return successResponse(briefing);
  } catch (error) {
    console.error("Briefing API error:", error);
    return errorResponse("Failed to load briefing", 500);
  }
}
