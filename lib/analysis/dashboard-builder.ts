/**
 * 대시보드 데이터 빌드 모듈
 * AI 기반: 카테고리 집계 + 위기 신호 → LLM 종합 분석
 */

import { readFileSync } from "fs";
import { join } from "path";
import { callLLM, usageTracker } from "@/lib/api/ai-client";
import { getDb } from "@/lib/db/index";
import {
  saveDashboardSnapshot,
  saveCategoryDetail,
  getSignalStatsByRunId,
  getPreviousCompletedRun,
  getCategoryDetailsByRunId,
} from "@/lib/db/queries";
import { aggregateCategories, type CategoryRiskResult } from "./category-aggregator";
import {
  calculateCategoryScores,
  calculateOverallScore as calcOverall,
} from "./score-calculator";
import { SEVERITY_CONFIG } from "@/lib/constants";
import type { CategoryKey, Severity } from "@/lib/types";

export interface DashboardBuildResult {
  overallScore: number;
  severity: Severity;
  summary: string;
  keyRisks: string[];
  outlook: string;
  signalCount: number;
  criticalCount: number;
  warningCount: number;
}

// -- 프롬프트 로드 --

let _cachedPrompt: string | null = null;

function loadPrompt(): string {
  if (_cachedPrompt) return _cachedPrompt;
  const promptPath = join(process.cwd(), "lib/analysis/prompts/dashboard-summary.md");
  _cachedPrompt = readFileSync(promptPath, "utf-8");
  return _cachedPrompt;
}

// -- AI 종합 분석 --

interface CrisisChainAIResult {
  edges: {
    from: string;
    to: string;
    label: string;
    strength: "strong" | "moderate" | "weak";
  }[];
  chains: {
    id: string;
    name: string;
    description: string;
    path: string[];
    currentlyActive: boolean;
  }[];
}

interface AISummaryResult {
  overallScore: number;
  severity: Severity;
  summary: string;
  keyRisks: string[];
  outlook: string;
  crisisChain: CrisisChainAIResult | null;
  comparisonSummary: string | null;
  notableChanges: string[];
}

async function generateSummary(
  categories: CategoryRiskResult[],
  signalSummaries: string[],
  confirmedOverallScore: number,
  confirmedSeverityLabel: string,
  prevContext: string = "",
): Promise<AISummaryResult> {
  const severityLabel = (score: number) => {
    if (score >= 80) return "긴급";
    if (score >= 60) return "주의";
    if (score >= 40) return "관찰";
    return "안전";
  };

  const trendLabel = (t: string) => {
    if (t === "rising") return "상승중";
    if (t === "falling") return "하락중";
    return "보합";
  };

  const categoryInfo = categories
    .map((c) => {
      const grade = severityLabel(c.score);
      const trend = trendLabel(c.trend);
      const issues = c.keyIssues.length > 0 ? c.keyIssues.join(" / ") : "없음";
      const summaries = c.topSummaries.length > 0
        ? "\n    고위험 기사 요약:\n" + c.topSummaries.map((s, i) => `    ${i + 1}) ${s}`).join("\n")
        : "";
      return `- ${c.label}(${c.category}): ${c.score}점/${grade} [${trend}], 분석기사 ${c.articleCount}건 (긴급 ${c.criticalCount}, 주의 ${c.warningCount})\n    핵심 수치/이슈: ${issues}${summaries}`;
    })
    .join("\n");

  const signalInfo =
    signalSummaries.length > 0
      ? signalSummaries.map((s, i) => `${i + 1}. ${s}`).join("\n")
      : "감지된 위기 신호 없음";

  const userPrompt = `# 확정된 종합 민생위기지수
${confirmedOverallScore}점(${confirmedSeverityLabel})
- 이 점수는 시스템이 가중평균 공식으로 산출한 확정값입니다.
- summary, key_risks 등에서 종합 점수를 언급할 때 반드시 이 값을 그대로 사용하십시오.
- overall_score 필드에도 이 값을 그대로 반환하십시오.

# 카테고리별 분석 결과 (점수 0~100, 60이상 주의, 80이상 긴급)
${categoryInfo}

# 감지된 위기 신호
${signalInfo}${prevContext}`;

  const raw = await callLLM({
    system: loadPrompt(),
    user: userPrompt,
    maxTokens: 2000,
    temperature: 0.1,
  });

  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(cleaned);

  const score = Math.max(0, Math.min(100, Number(parsed.overall_score) || 0));
  let severity: Severity = "safe";
  for (const config of SEVERITY_CONFIG) {
    if (score >= config.scoreMin && score <= config.scoreMax) {
      severity = config.key;
      break;
    }
  }

  return {
    overallScore: score,
    severity,
    summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 500) : "",
    keyRisks: Array.isArray(parsed.key_risks)
      ? (parsed.key_risks as string[]).filter((s) => typeof s === "string").slice(0, 5)
      : [],
    outlook: typeof parsed.outlook === "string"
      ? parsed.outlook.slice(0, 200)
      : Array.isArray(parsed.outlook)
        ? (parsed.outlook as string[]).filter((s) => typeof s === "string").join(" / ").slice(0, 200)
        : "",
    comparisonSummary: typeof parsed.comparison_summary === "string"
      ? parsed.comparison_summary.slice(0, 500)
      : null,
    notableChanges: Array.isArray(parsed.notable_changes)
      ? (parsed.notable_changes as string[]).filter((s) => typeof s === "string").slice(0, 5)
      : [],
    crisisChain: parsed.crisis_chain
      ? {
          edges: Array.isArray(parsed.crisis_chain.edges)
            ? parsed.crisis_chain.edges.map((e: { from: string; to: string; label: string; strength: string }) => ({
                from: e.from,
                to: e.to,
                label: typeof e.label === "string" ? e.label : "",
                strength: (["strong", "moderate", "weak"].includes(e.strength) ? e.strength : "moderate") as "strong" | "moderate" | "weak",
              }))
            : [],
          chains: Array.isArray(parsed.crisis_chain.chains)
            ? parsed.crisis_chain.chains.map((c: { id: string; name: string; description: string; path: string[]; currentlyActive: boolean }, i: number) => ({
                id: c.id || `chain-${i + 1}`,
                name: typeof c.name === "string" ? c.name : "",
                description: typeof c.description === "string" ? c.description : "",
                path: Array.isArray(c.path) ? c.path : [],
                currentlyActive: !!c.currentlyActive,
              }))
            : [],
        }
      : null,
  };
}

// -- 종합점수 가중평균 공식 (score-calculator.ts로 통합, 레거시 호환용 래퍼) --

function calculateOverallScore(categoryScores: number[]): number {
  return calcOverall(categoryScores);
}

// -- 메인 함수 --

export async function buildDashboard(
  options: { categories?: CategoryKey[]; runId?: string } = {}
): Promise<DashboardBuildResult> {
  const db = getDb();
  const runId = options.runId;

  // 1. 카테고리 집계 (SQL 기반 유지) - 선택된 카테고리만
  const categories = aggregateCategories(options.categories);

  // 1.5. 통합 점수 보정 (volume + engagement 요인 반영)
  try {
    const factors = calculateCategoryScores(options.categories);
    const factorMap = new Map(factors.map((f) => [f.category, f]));
    for (const cat of categories) {
      const f = factorMap.get(cat.category);
      if (f && f.articleCount > 0) {
        // 기존 rawScore를 통합 점수로 보정 (큰 변동 방지를 위해 블렌딩)
        const blended = Math.round(cat.score * 0.7 + f.combinedScore * 0.3);
        cat.score = Math.max(0, Math.min(100, blended));
      }
    }
    console.log("[Dashboard] 통합 점수 보정 적용 완료");
  } catch (err) {
    console.warn("[Dashboard] 통합 점수 보정 실패 (raw score 유지):", (err as Error).message);
  }

  // 2. 신호 통계 (run_id 기반)
  let signalStats: { total: number; critical_count: number; warning_count: number; caution_count: number };
  if (runId) {
    const stats = getSignalStatsByRunId(runId);
    signalStats = { total: stats.total, critical_count: stats.critical_count, warning_count: stats.warning_count, caution_count: stats.caution_count };
  } else {
    signalStats = db
      .prepare(
        `SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_count,
          COUNT(CASE WHEN severity = 'warning' THEN 1 END) as warning_count,
          COUNT(CASE WHEN severity = 'caution' THEN 1 END) as caution_count
        FROM signals`
      )
      .get() as { total: number; critical_count: number; warning_count: number; caution_count: number };
  }

  // 3. 신호 요약 (AI 입력용)
  const signalQuery = runId
    ? `SELECT title, description, severity, score FROM signals WHERE run_id = ? ORDER BY score DESC`
    : `SELECT title, description, severity, score FROM signals ORDER BY score DESC`;
  const signalRows = runId
    ? db.prepare(signalQuery).all(runId) as { title: string; description: string; severity: string; score: number }[]
    : db.prepare(signalQuery).all() as { title: string; description: string; severity: string; score: number }[];

  const signalSummaries = signalRows.map(
    (s) => `[${s.severity}/${s.score}점] ${s.title}: ${s.description}`
  );

  // 4. 종합점수: 카테고리 점수 기반 가중평균 공식으로 먼저 확정
  const overallScore = calculateOverallScore(categories.map((c) => c.score));
  let overallSeverity: Severity = "safe";
  for (const config of SEVERITY_CONFIG) {
    if (overallScore >= config.scoreMin && overallScore <= config.scoreMax) {
      overallSeverity = config.key;
      break;
    }
  }

  const severityLabelMap: Record<Severity, string> = {
    critical: "긴급", warning: "주의", caution: "관찰", safe: "안전",
  };

  // 4.5. 전일대비 컨텍스트 준비 (run_id가 있을 때만)
  let prevContext = "";
  if (runId) {
    const prevRun = getPreviousCompletedRun(runId);
    if (prevRun && prevRun.overall_score != null) {
      const prevSevLabel = severityLabelMap[(prevRun.overall_severity as Severity) ?? "safe"];
      const prevCats = getCategoryDetailsByRunId(prevRun.id);
      const prevCatInfo = prevCats.map((c) => `${c.category}: ${c.score}점`).join(", ");

      prevContext = `

## 이전 분석 결과 (비교 기준: ${prevRun.run_date})
- 종합: ${prevRun.overall_score}점 (${prevSevLabel})
- 카테고리: ${prevCatInfo}

## 추가 출력
- comparison_summary: 이전 대비 핵심 변화를 2-3문장으로 요약하세요
- notable_changes: 주목할 변화 목록 (등급 변경, 급등/급락 카테고리, 신규 위기신호)`;
    }
  }

  // 5. AI 종합 분석 (확정된 종합점수를 함께 전달 + 전일대비 컨텍스트)
  const aiResult = await generateSummary(
    categories,
    signalSummaries,
    overallScore,
    severityLabelMap[overallSeverity],
    prevContext,
  );

  // 6. 대시보드 캐시 저장 (레거시 호환 + 스냅샷 이중 저장)
  const cacheData = {
    overallScore,
    severity: overallSeverity,
    summary: aiResult.summary,
    keyRisks: aiResult.keyRisks,
    outlook: aiResult.outlook,
    comparisonSummary: aiResult.comparisonSummary ?? null,
    notableChanges: aiResult.notableChanges ?? [],
    categories: categories.map((c) => ({
      category: c.category,
      label: c.label,
      score: c.score,
      trend: c.trend,
      keyIssues: c.keyIssues,
      articleCount: c.articleCount,
      criticalCount: c.criticalCount,
      warningCount: c.warningCount,
    })),
    signals: {
      total: signalStats.total,
      critical: signalStats.critical_count,
      warning: signalStats.warning_count,
      caution: signalStats.caution_count,
    },
    updatedAt: new Date().toISOString(),
  };

  const cacheJson = JSON.stringify(cacheData);

  // 레거시 캐시 (하위 호환)
  db.prepare(
    `INSERT OR REPLACE INTO dashboard_cache (key, value, updated_at)
     VALUES ('dashboard', ?, datetime('now'))`
  ).run(cacheJson);

  // 스냅샷 저장 (run_id가 있을 때)
  if (runId) {
    saveDashboardSnapshot(runId, "dashboard", cacheJson);
  }

  // 7. Crisis Chain 캐시 저장
  if (aiResult.crisisChain) {
    const crisisChainData = {
      nodes: categories.map((c) => ({
        id: c.category,
        label: c.label,
        score: c.score,
      })),
      edges: aiResult.crisisChain.edges,
      chains: aiResult.crisisChain.chains,
    };

    const chainJson = JSON.stringify(crisisChainData);

    db.prepare(
      `INSERT OR REPLACE INTO dashboard_cache (key, value, updated_at)
       VALUES ('crisis_chain', ?, datetime('now'))`
    ).run(chainJson);

    if (runId) {
      saveDashboardSnapshot(runId, "crisis_chain", chainJson);
    }
  }

  // 8. Category Details 저장 (run_id가 있을 때)
  if (runId) {
    for (const c of categories) {
      saveCategoryDetail(runId, {
        category: c.category,
        score: c.score,
        trend: c.trend,
        articleCount: c.articleCount,
        criticalCount: c.criticalCount,
        warningCount: c.warningCount,
        keyIssues: c.keyIssues,
      });
    }
  }

  // 9. Score History 저장 (일별 UPSERT)
  // 분석 회차의 run_date 사용 (없으면 오늘 날짜)
  let scoreDate = new Date().toISOString().slice(0, 10);
  if (runId) {
    try {
      const runRow = db.prepare("SELECT run_date FROM analysis_runs WHERE id = ?").get(runId) as { run_date: string } | undefined;
      if (runRow?.run_date) scoreDate = runRow.run_date;
    } catch { /* 조회 실패 시 오늘 날짜 사용 */ }
  }

  const categoryScores: Record<string, number> = {};
  for (const c of categories) {
    categoryScores[c.category] = c.score;
  }

  try {
    db.prepare(
      `INSERT OR REPLACE INTO score_history
         (date, overall_score, prices, employment, self_employed, finance, real_estate, run_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      scoreDate,
      overallScore,
      categoryScores["prices"] ?? 0,
      categoryScores["employment"] ?? 0,
      categoryScores["selfEmployed"] ?? 0,
      categoryScores["finance"] ?? 0,
      categoryScores["realEstate"] ?? 0,
      runId ?? null,
    );
    console.log(`[Dashboard] score_history 저장 완료: ${scoreDate} = ${overallScore}점`);
  } catch (err) {
    console.error(`[Dashboard] score_history 저장 실패 (${scoreDate}):`, (err as Error).message);
  }

  // 10. API 사용량 캐시 저장
  const usage = usageTracker.getSummary();
  if (usage.totalCalls > 0) {
    const lastCall = usage.calls[usage.calls.length - 1];
    const usageData = {
      totalCalls: usage.totalCalls,
      totalInputTokens: usage.totalInputTokens,
      totalOutputTokens: usage.totalOutputTokens,
      totalTokens: usage.totalTokens,
      totalCost: usage.totalCost,
      provider: lastCall?.provider ?? "",
      model: lastCall?.model ?? "",
    };

    const usageJson = JSON.stringify(usageData);
    db.prepare(
      `INSERT OR REPLACE INTO dashboard_cache (key, value, updated_at)
       VALUES ('api_usage', ?, datetime('now'))`
    ).run(usageJson);

    if (runId) {
      saveDashboardSnapshot(runId, "api_usage", usageJson);
    }
  }

  return {
    overallScore,
    severity: overallSeverity,
    summary: aiResult.summary,
    keyRisks: aiResult.keyRisks,
    outlook: aiResult.outlook,
    signalCount: signalStats.total,
    criticalCount: signalStats.critical_count,
    warningCount: signalStats.warning_count,
  };
}
