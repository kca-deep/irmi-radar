import { NextRequest } from "next/server";
import {
  fetchPetitions,
  fetchLegislationNotices,
  fetchBills,
  fetchLegislationByKeywords,
  fetchBillsByKeywords,
} from "@/lib/api/assembly";
import { successResponse, errorResponse, getSearchParams } from "@/lib/api/response";
import { CATEGORY_SEARCH_KEYWORDS } from "@/lib/constants";
import type { CategoryKey } from "@/lib/types";

export async function GET(request: NextRequest) {
  const params = getSearchParams(request);
  const type = params.get("type");
  const category = params.get("category") as CategoryKey | null;
  const keyword = params.get("keyword");
  const limit = Number(params.get("limit") || "10");

  try {
    if (type === "petitions") {
      const data = await fetchPetitions(limit);
      return successResponse(data);
    }

    if (type === "legislation") {
      if (category && CATEGORY_SEARCH_KEYWORDS[category]) {
        const data = await fetchLegislationByKeywords(
          CATEGORY_SEARCH_KEYWORDS[category],
          limit
        );
        return successResponse(data);
      }
      const data = await fetchLegislationNotices(limit);
      return successResponse(data);
    }

    if (type === "bills") {
      if (category && CATEGORY_SEARCH_KEYWORDS[category]) {
        const data = await fetchBillsByKeywords(
          CATEGORY_SEARCH_KEYWORDS[category],
          limit
        );
        return successResponse(data);
      }
      const data = await fetchBills(keyword || undefined, limit);
      return successResponse(data);
    }

    return errorResponse("type parameter is required (petitions | legislation | bills)");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500);
  }
}
