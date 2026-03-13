/**
 * 전일대비 비교 모듈
 * 현재 분석 회차와 직전 회차를 비교하여 DailyDelta 생성
 */

import {
  getPreviousCompletedRun,
  getCategoryDetailsByRunId,
  getSignalStatsByRunId,
  type AnalysisRunRow,
} from "@/lib/db/queries";
import { getDb } from "@/lib/db/index";
import { CATEGORIES } from "@/lib/constants";
import type { CategoryKey, Severity, DailyDelta } from "@/lib/types";

function getDirection(delta: number): "up" | "down" | "unchanged" {
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "unchanged";
}

function getSeverityFromScore(score: number): Severity {
  if (score >= 80) return "critical";
  if (score >= 60) return "warning";
  if (score >= 40) return "caution";
  return "safe";
}

interface SignalCompareResult {
  totalDelta: number | null;
  newCount: number;
  resolvedCount: number;
  upgradedCount: number;
  downgradedCount: number;
}

/**
 * 두 회차의 신호를 비교
 * 같은 id의 신호끼리 매칭하여 변화 추적
 */
function compareSignals(currentRunId: string, previousRunId: string): SignalCompareResult {
  const db = getDb(true);

  const currentSignals = db.prepare(
    "SELECT id, title, severity, score, category FROM signals WHERE run_id = ?"
  ).all(currentRunId) as { id: string; title: string; severity: string; score: number; category: string }[];

  const previousSignals = db.prepare(
    "SELECT id, title, severity, score, category FROM signals WHERE run_id = ?"
  ).all(previousRunId) as { id: string; title: string; severity: string; score: number; category: string }[];

  const prevMap = new Map(previousSignals.map((s) => [s.id, s]));
  const currMap = new Map(currentSignals.map((s) => [s.id, s]));

  let newCount = 0;
  let resolvedCount = 0;
  let upgradedCount = 0;
  let downgradedCount = 0;

  // 현재 신호 중 이전에 없던 것 = 신규
  for (const [id, curr] of currMap) {
    const prev = prevMap.get(id);
    if (!prev) {
      newCount++;
    } else {
      if (curr.score > prev.score) upgradedCount++;
      else if (curr.score < prev.score) downgradedCount++;
    }
  }

  // 이전 신호 중 현재에 없는 것 = 해소
  for (const [id] of prevMap) {
    if (!currMap.has(id)) {
      resolvedCount++;
    }
  }

  return {
    totalDelta: currentSignals.length - previousSignals.length,
    newCount,
    resolvedCount,
    upgradedCount,
    downgradedCount,
  };
}

/**
 * 전일대비 비교 수행
 */
export function calculateDailyDelta(
  currentRunId: string,
  currentScore: number,
  currentSeverity: Severity,
  categoryScores: Record<string, number>,
): DailyDelta | null {
  const prevRun = getPreviousCompletedRun(currentRunId);
  if (!prevRun || prevRun.overall_score == null) return null;

  // 종합 점수 비교
  const overallDelta = currentScore - prevRun.overall_score;
  const prevSeverity = (prevRun.overall_severity as Severity) ?? "safe";

  // 카테고리 비교
  const prevCategories = getCategoryDetailsByRunId(prevRun.id);
  const prevCatMap = new Map(prevCategories.map((c) => [c.category, c]));

  const categoryDeltas: DailyDelta["categories"] = {} as DailyDelta["categories"];
  for (const cat of CATEGORIES) {
    const currentCatScore = categoryScores[cat.key] ?? 0;
    const prevCat = prevCatMap.get(cat.key);
    const prevScore = prevCat?.score ?? null;
    const delta = prevScore != null ? currentCatScore - prevScore : null;

    categoryDeltas[cat.key] = {
      delta,
      direction: delta != null ? getDirection(delta) : "unchanged",
      previousScore: prevScore,
    };
  }

  // 신호 비교
  const signalDelta = compareSignals(currentRunId, prevRun.id);

  return {
    previousDate: prevRun.run_date,
    previousRunId: prevRun.id,
    overall: {
      delta: overallDelta,
      direction: getDirection(overallDelta),
      severityChanged: currentSeverity !== prevSeverity,
      previousSeverity: prevSeverity,
    },
    categories: categoryDeltas,
    signals: signalDelta,
    aiSummary: null, // AI 요약은 dashboard-builder에서 채움
  };
}
