import { successResponse, errorResponse } from "@/lib/api/response";
import { loadSignalById } from "@/lib/api/mock-data";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/signals/[id]
 * 개별 신호 상세 조회
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return errorResponse("Signal ID is required", 400);
    }

    const signal = loadSignalById(id);

    if (!signal) {
      return errorResponse(`Signal not found: ${id}`, 404);
    }

    return successResponse(signal);
  } catch (error) {
    console.error("Signal detail API error:", error);
    return errorResponse("Failed to load signal detail", 500);
  }
}
