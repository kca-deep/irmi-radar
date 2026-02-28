import { successResponse, errorResponse, getSearchParams } from "@/lib/api/response";
import { loadPolicies } from "@/lib/api/mock-data";

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
 */
export async function GET(request: Request) {
  try {
    const params = getSearchParams(request);

    const category = params.get("category") as CategoryKey | null;
    const region = params.get("region");
    const signalId = params.get("signalId");

    // 파라미터 검증
    if (category && !VALID_CATEGORIES.includes(category)) {
      return errorResponse(
        `Invalid category. Use: ${VALID_CATEGORIES.join(", ")}`,
        400
      );
    }

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
