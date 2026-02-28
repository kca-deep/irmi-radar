import { successResponse, errorResponse, getSearchParams } from "@/lib/api/response";
import { loadSignals } from "@/lib/api/mock-data";

import type { CategoryKey, Severity } from "@/lib/types";

const VALID_CATEGORIES: CategoryKey[] = [
  "prices",
  "employment",
  "selfEmployed",
  "finance",
  "realEstate",
];

const VALID_SEVERITIES: Severity[] = ["critical", "warning", "caution", "safe"];

/**
 * GET /api/signals
 * 위기 신호 목록 조회
 *
 * Query params:
 * - category: CategoryKey (선택)
 * - region: string (선택)
 * - severity: Severity (선택)
 */
export async function GET(request: Request) {
  try {
    const params = getSearchParams(request);

    const category = params.get("category") as CategoryKey | null;
    const region = params.get("region");
    const severity = params.get("severity") as Severity | null;

    // 파라미터 검증
    if (category && !VALID_CATEGORIES.includes(category)) {
      return errorResponse(
        `Invalid category. Use: ${VALID_CATEGORIES.join(", ")}`,
        400
      );
    }

    if (severity && !VALID_SEVERITIES.includes(severity)) {
      return errorResponse(
        `Invalid severity. Use: ${VALID_SEVERITIES.join(", ")}`,
        400
      );
    }

    const signals = loadSignals({
      category: category ?? undefined,
      region: region ?? undefined,
      severity: severity ?? undefined,
    });

    return successResponse(signals, { total: signals.length });
  } catch (error) {
    console.error("Signals API error:", error);
    return errorResponse("Failed to load signals", 500);
  }
}
