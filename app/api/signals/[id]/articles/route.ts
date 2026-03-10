import { successResponse, errorResponse } from "@/lib/api/response";
import { loadSignalArticles } from "@/lib/api/data-source";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/signals/[id]/articles
 * 신호에 연결된 관련 뉴스 기사 조회
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return errorResponse("Signal ID is required", 400);
    }

    const articles = loadSignalArticles(id);
    return successResponse(articles);
  } catch (error) {
    console.error("Signal articles API error:", error);
    return errorResponse("Failed to load signal articles", 500);
  }
}
