import { getDb } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api/response";

/**
 * DELETE /api/analyze/reset
 * AI 분석 결과 관련 테이블 초기화
 * (articles 원본 데이터는 유지)
 * (score_history의 baseline 데이터는 보존 - 지수추이 그래프용)
 */
export async function DELETE() {
  try {
    const db = getDb();

    // 전체 삭제 대상 테이블 (baseline 데이터 없는 테이블)
    const fullDeleteTables = [
      "signal_articles",
      "signals",
      "dashboard_snapshots",
      "category_details",
      "dashboard_cache",
      "analysis_runs",
    ];

    // baseline 보존 대상 테이블 (run_id = 'baseline' 행 유지)
    const baselinePreserveTables = [
      "analysis",
      "score_history",
      "regions",
    ];

    db.pragma("foreign_keys = OFF");

    const deleteAll = db.transaction(() => {
      const counts: Record<string, number> = {};

      // 일반 테이블: 전체 삭제
      for (const table of fullDeleteTables) {
        const info = db.prepare(`SELECT COUNT(*) as cnt FROM ${table}`).get() as { cnt: number };
        counts[table] = info.cnt;
        db.prepare(`DELETE FROM ${table}`).run();
      }

      // baseline 보존 테이블: run_id != 'baseline'만 삭제
      for (const table of baselinePreserveTables) {
        const info = db.prepare(
          `SELECT COUNT(*) as cnt FROM ${table} WHERE run_id != 'baseline' OR run_id IS NULL`
        ).get() as { cnt: number };
        counts[table] = info.cnt;
        db.prepare(
          `DELETE FROM ${table} WHERE run_id != 'baseline' OR run_id IS NULL`
        ).run();
      }

      return counts;
    });

    const deletedCounts = deleteAll();

    db.pragma("foreign_keys = ON");

    const totalDeleted = Object.values(deletedCounts).reduce((a, b) => a + b, 0);
    const baselineKept = {
      score_history: (db.prepare(
        "SELECT COUNT(*) as cnt FROM score_history WHERE run_id = 'baseline'"
      ).get() as { cnt: number }).cnt,
      analysis: (db.prepare(
        "SELECT COUNT(*) as cnt FROM analysis WHERE run_id = 'baseline'"
      ).get() as { cnt: number }).cnt,
    };

    console.log("[Reset] AI 분석 결과 초기화 완료:", deletedCounts);
    console.log(`[Reset] baseline 보존 - score_history: ${baselineKept.score_history}건, analysis: ${baselineKept.analysis}건`);

    return successResponse({
      message: "AI 분석 결과가 초기화되었습니다",
      deletedCounts,
      totalDeleted,
      baselineKept,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "초기화 중 오류가 발생했습니다";
    console.error("[Reset] 초기화 실패:", message);
    return errorResponse(message, 500);
  }
}
