import { successResponse, errorResponse, getSearchParams } from "@/lib/api/response";
import { fetchPoliciesByCategory, fetchPopularGovServices, govServiceToPolicy } from "@/lib/api/gov-service";
import { loadPolicies } from "@/lib/api/data-source";

import type { CategoryKey } from "@/lib/types";

const VALID_CATEGORIES: CategoryKey[] = [
  "prices",
  "employment",
  "selfEmployed",
  "finance",
  "realEstate",
];

/**
 * GET /api/policies
 * 지원 정책 목록 조회
 *
 * Query params:
 * - category: CategoryKey (선택)
 * - region: string (선택)
 * - signalId: string (선택) - 관련 신호 ID
 * - limit: number (선택, 기본 5)
 */
export async function GET(request: Request) {
  try {
    const params = getSearchParams(request);
    const category = params.get("category") as CategoryKey | null;
    const region = params.get("region");
    const signalId = params.get("signalId");
    const limit = Number(params.get("limit") ?? 5);

    if (category && !VALID_CATEGORIES.includes(category)) {
      return errorResponse(
        `Invalid category. Use: ${VALID_CATEGORIES.join(", ")}`,
        400
      );
    }

    // 보조금24 API 키 존재 시 실제 API 호출
    const hasApiKey = !!process.env.DATA_GO_KR_API_KEY;

    if (hasApiKey) {
      try {
        if (category) {
          const policies = await fetchPoliciesByCategory(category, limit);
          return successResponse(policies, { total: policies.length });
        }
        // 카테고리 없으면 인기순 조회
        const services = await fetchPopularGovServices(limit);
        const policies = services.map((svc) => govServiceToPolicy(svc));
        return successResponse(policies, { total: policies.length });
      } catch {
        // API 실패 시 mock fallback
        console.warn("Gov API failed, falling back to mock data");
      }
    }

    // Mock fallback
    const policies = loadPolicies({
      category: category ?? undefined,
      region: region ?? undefined,
      signalId: signalId ?? undefined,
    });

    return successResponse(policies, { total: policies.length });
  } catch (error) {
    console.error("Policies API error:", error);
    return errorResponse("Failed to load policies", 500);
  }
}
