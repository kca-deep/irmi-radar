import { getDb } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api/response";

/**
 * DELETE /api/analyze/reset
 * AI 분석 결과 관련 테이블 초기화
 * (articles 원본 데이터는 유지)
 */
export async function DELETE() {
  try {
    const db = getDb();

    const tables = [
      "signal_articles",
      "analysis",
      "signals",
      "regions",
      "dashboard_cache",
      "score_history",
    ];

    db.pragma("foreign_keys = OFF");

    const deleteAll = db.transaction(() => {
      const counts: Record<string, number> = {};
      for (const table of tables) {
        const info = db.prepare(`SELECT COUNT(*) as cnt FROM ${table}`).get() as { cnt: number };
        counts[table] = info.cnt;
        db.prepare(`DELETE FROM ${table}`).run();
      }
      return counts;
    });

    const deletedCounts = deleteAll();

    db.pragma("foreign_keys = ON");

    const totalDeleted = Object.values(deletedCounts).reduce((a, b) => a + b, 0);

    console.log("[Reset] AI 분석 결과 초기화 완료:", deletedCounts);

    return successResponse({
      message: "AI 분석 결과가 초기화되었습니다",
      deletedCounts,
      totalDeleted,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "초기화 중 오류가 발생했습니다";
    console.error("[Reset] 초기화 실패:", message);
    return errorResponse(message, 500);
  }
}
