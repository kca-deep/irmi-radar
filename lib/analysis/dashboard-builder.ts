/**
 * 대시보드 데이터 빌드 모듈
 * AI 기반: 카테고리 집계 + 위기 신호 → LLM 종합 분석
 */

import { readFileSync } from "fs";
import { join } from "path";
import { callLLM, usageTracker } from "@/lib/api/ai-client";
import { getDb } from "@/lib/db/index";
import { aggregateCategories, type CategoryRiskResult } from "./category-aggregator";
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
}

async function generateSummary(
  categories: CategoryRiskResult[],
  signalSummaries: string[]
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

  const userPrompt = `# 카테고리별 분석 결과 (점수 0~100, 60이상 주의, 80이상 긴급)
${categoryInfo}

# 감지된 위기 신호
${signalInfo}`;

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

// -- 종합점수 가중평균 공식 --

function calculateOverallScore(categoryScores: number[]): number {
  if (categoryScores.length === 0) return 0;
  const sorted = [...categoryScores].sort((a, b) => b - a);
  const max = sorted[0];
  const top2Avg = sorted.length >= 2 ? (sorted[0] + sorted[1]) / 2 : sorted[0];
  const avg = categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length;
  // 최고 카테고리 35% + 상위 2개 평균 35% + 전체 평균 30%
  return Math.round(max * 0.35 + top2Avg * 0.35 + avg * 0.30);
}

// -- 메인 함수 --

export async function buildDashboard(
  options: { categories?: CategoryKey[] } = {}
): Promise<DashboardBuildResult> {
  const db = getDb();

  // 1. 카테고리 집계 (SQL 기반 유지) - 선택된 카테고리만
  const categories = aggregateCategories(options.categories);

  // 2. 신호 통계
  const signalStats = db
    .prepare(
      `SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_count,
        COUNT(CASE WHEN severity = 'warning' THEN 1 END) as warning_count
      FROM signals`
    )
    .get() as { total: number; critical_count: number; warning_count: number };

  // 3. 신호 요약 (AI 입력용)
  const signalRows = db
    .prepare(`SELECT title, description, severity, score FROM signals ORDER BY score DESC`)
    .all() as { title: string; description: string; severity: string; score: number }[];

  const signalSummaries = signalRows.map(
    (s) => `[${s.severity}/${s.score}점] ${s.title}: ${s.description}`
  );

  // 4. AI 종합 분석
  const aiResult = await generateSummary(categories, signalSummaries);

  // 4-1. 종합점수: AI 자유재량 대신 카테고리 점수 기반 가중평균 공식 적용
  const overallScore = calculateOverallScore(categories.map((c) => c.score));
  let overallSeverity: Severity = "safe";
  for (const config of SEVERITY_CONFIG) {
    if (overallScore >= config.scoreMin && overallScore <= config.scoreMax) {
      overallSeverity = config.key;
      break;
    }
  }

  // 5. 대시보드 캐시 저장
  const cacheData = {
    overallScore,
    severity: overallSeverity,
    summary: aiResult.summary,
    keyRisks: aiResult.keyRisks,
    outlook: aiResult.outlook,
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
    },
    updatedAt: new Date().toISOString(),
  };

  db.prepare(
    `INSERT OR REPLACE INTO dashboard_cache (key, value, updated_at)
     VALUES ('dashboard', ?, datetime('now'))`
  ).run(JSON.stringify(cacheData));

  // 6. Crisis Chain 캐시 저장
  if (aiResult.crisisChain) {
    const categoryMap: Record<string, { label: string; score: number }> = {};
    for (const c of categories) {
      categoryMap[c.category] = { label: c.label, score: c.score };
    }

    const crisisChainData = {
      nodes: categories.map((c) => ({
        id: c.category,
        label: c.label,
        score: c.score,
      })),
      edges: aiResult.crisisChain.edges,
      chains: aiResult.crisisChain.chains,
    };

    db.prepare(
      `INSERT OR REPLACE INTO dashboard_cache (key, value, updated_at)
       VALUES ('crisis_chain', ?, datetime('now'))`
    ).run(JSON.stringify(crisisChainData));
  }

  // 7. Score History 저장 (일별 UPSERT)
  const today = new Date().toISOString().slice(0, 10);
  const categoryScores: Record<string, number> = {};
  for (const c of categories) {
    categoryScores[c.category] = c.score;
  }

  db.prepare(
    `INSERT OR REPLACE INTO score_history
       (date, overall_score, prices, employment, self_employed, finance, real_estate)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    today,
    overallScore,
    categoryScores["prices"] ?? 0,
    categoryScores["employment"] ?? 0,
    categoryScores["selfEmployed"] ?? 0,
    categoryScores["finance"] ?? 0,
    categoryScores["realEstate"] ?? 0,
  );

  // 8. API 사용량 캐시 저장
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
    db.prepare(
      `INSERT OR REPLACE INTO dashboard_cache (key, value, updated_at)
       VALUES ('api_usage', ?, datetime('now'))`
    ).run(JSON.stringify(usageData));
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
