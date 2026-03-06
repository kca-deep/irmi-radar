import { successResponse, errorResponse, getSearchParams } from "@/lib/api/response";
import { loadNews, loadNewsCount } from "@/lib/api/data-source";
import { NEWS_PAGE_SIZE } from "@/lib/constants";

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
 * 뉴스 기사 목록 조회 (페이지네이션 지원)
 *
 * Query params:
 * - keyword: string (선택) - 제목/요약/키워드 검색
 * - category: CategoryKey (선택)
 * - limit: number (선택, 기본 50)
 * - offset: number (선택, 기본 0)
 */
export async function GET(request: Request) {
  try {
    const params = getSearchParams(request);

    const keyword = params.get("keyword");
    const category = params.get("category") as CategoryKey | null;
    const limit = Math.min(
      parseInt(params.get("limit") || String(NEWS_PAGE_SIZE), 10) || NEWS_PAGE_SIZE,
      200
    );
    const offset = Math.max(
      parseInt(params.get("offset") || "0", 10) || 0,
      0
    );

    // 파라미터 검증
    if (category && !VALID_CATEGORIES.includes(category)) {
      return errorResponse(
        `Invalid category. Use: ${VALID_CATEGORIES.join(", ")}`,
        400
      );
    }

    const filters = {
      keyword: keyword ?? undefined,
      category: category ?? undefined,
    };

    const [news, total] = [
      loadNews({ ...filters, limit, offset }),
      loadNewsCount(filters),
    ];

    return successResponse(news, { total, limit, page: Math.floor(offset / limit) });
  } catch (error) {
    console.error("News API error:", error);
    return errorResponse("Failed to load news", 500);
  }
}
