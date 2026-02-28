import { successResponse, errorResponse, getSearchParams } from "@/lib/api/response";
import { loadNews } from "@/lib/api/mock-data";

import type { CategoryKey } from "@/lib/types";

const VALID_CATEGORIES: CategoryKey[] = [
  "prices",
  "employment",
  "selfEmployed",
  "finance",
  "realEstate",
];

/**
 * GET /api/news
 * 뉴스 기사 목록 조회
 *
 * Query params:
 * - keyword: string (선택) - 제목/요약/키워드 검색
 * - category: CategoryKey (선택)
 */
export async function GET(request: Request) {
  try {
    const params = getSearchParams(request);

    const keyword = params.get("keyword");
    const category = params.get("category") as CategoryKey | null;

    // 파라미터 검증
    if (category && !VALID_CATEGORIES.includes(category)) {
      return errorResponse(
        `Invalid category. Use: ${VALID_CATEGORIES.join(", ")}`,
        400
      );
    }

    const news = loadNews({
      keyword: keyword ?? undefined,
      category: category ?? undefined,
    });

    return successResponse(news, { total: news.length });
  } catch (error) {
    console.error("News API error:", error);
    return errorResponse("Failed to load news", 500);
  }
}
