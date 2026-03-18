/**
 * 위기 신호 탐지 모듈
 * AI 기반: 카테고리별 고위험 기사를 LLM에 전달하여 위기 신호 생성
 */

import { readFileSync } from "fs";
import { join } from "path";
import { callLLM } from "@/lib/api/ai-client";
import { getDb } from "@/lib/db/index";
import { CATEGORIES, SEVERITY_CONFIG } from "@/lib/constants";
import type { CategoryKey, Severity } from "@/lib/types";

// -- 타입 --

export interface DetectedSignal {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  score: number;
  category: CategoryKey;
  categoryLabel: string;
  region: string | null;
  cause: string;
  impact: string;
  actionPoints: string[];
  evidence: string[];
  articleIds: string[];
}

export interface DetectOptions {
  /** 신호 탐지 기간 (일수, 기본 30) */
  windowDays?: number;
  /** 카테고리당 최대 입력 기사 수 (기본 20) */
  maxArticlesPerCategory?: number;
  /** 기존 신호 삭제 후 재생성 (기본 true) */
  rebuild?: boolean;
  /** 분석 대상 카테고리 (미지정 시 전체) */
  categories?: CategoryKey[];
  /** 분석 회차 ID */
  runId?: string;
}

export interface DetectResult {
  signalCount: number;
  signals: DetectedSignal[];
}

// -- 프롬프트 로드 --

let _cachedPrompt: string | null = null;

function loadPrompt(): string {
  if (_cachedPrompt) return _cachedPrompt;
  const promptPath = join(process.cwd(), "lib/analysis/prompts/signal-detection.md");
  _cachedPrompt = readFileSync(promptPath, "utf-8");
  return _cachedPrompt;
}

// -- DB에서 고위험 기사 조회 --

interface HighRiskArticle {
  id: string;
  title: string;
  risk_score: number;
  severity: string;
  key_factors: string | null;
  ai_summary: string | null;
  impact_region: string | null;
}

function getHighRiskArticles(
  category: CategoryKey,
  windowDays: number,
  limit: number
): HighRiskArticle[] {
  const db = getDb(true);

  const latestRow = db
    .prepare(
      `SELECT MAX(a.published_at) as latest
       FROM articles a INNER JOIN analysis an ON a.id = an.article_id`
    )
    .get() as { latest: string | null };
  const baseDate = latestRow?.latest || new Date().toISOString();

  return db
    .prepare(
      `SELECT a.id, a.title, an.risk_score, an.severity, an.key_factors, an.ai_summary, an.impact_region
       FROM articles a
       INNER JOIN analysis an ON a.id = an.article_id
       WHERE a.category = ?
         AND an.severity IN ('critical', 'warning')
         AND a.published_at >= date(?, ? || ' days')
       ORDER BY an.risk_score DESC
       LIMIT ?`
    )
    .all(category, baseDate, `-${windowDays}`, limit) as HighRiskArticle[];
}

// -- AI 기반 신호 생성 --

async function detectForCategory(
  category: CategoryKey,
  categoryLabel: string,
  articles: HighRiskArticle[]
): Promise<DetectedSignal[]> {
  if (articles.length < 2) return [];

  // 기사 목록 포매팅
  const articleList = articles
    .map((a, i) => {
      const factors = (() => {
        try { return JSON.parse(a.key_factors || "[]").join(", "); }
        catch { return ""; }
      })();
      return `[${i}] ${a.title} | 점수:${a.risk_score} | 지역:${a.impact_region || "전국"} | 요약:${a.ai_summary || ""} | 요인:${factors}`;
    })
    .join("\n");

  // 이전 회차 신호 컨텍스트 추가
  let prevSignalContext = "";
  try {
    const dbRo = getDb(true);
    const prevSignals = dbRo.prepare(
      `SELECT title, severity, score FROM signals
       WHERE category = ? AND run_id != '__legacy__'
       ORDER BY detected_at DESC
       LIMIT 5`
    ).all(category) as { title: string; severity: string; score: number }[];
    if (prevSignals.length > 0) {
      const lines = prevSignals.map((s) => `- [${s.severity}/${s.score}점] ${s.title}`);
      prevSignalContext = `\n\n기존 감지 신호 (이전 분석):\n${lines.join("\n")}\n위 신호와 비교하여 신규/지속/해소 여부를 판단하세요.`;
    }
  } catch { /* skip */ }

  const userPrompt = `카테고리: ${categoryLabel} (${category})
기사 수: ${articles.length}건

최근 고위험 기사 목록:
${articleList}${prevSignalContext}`;

  const raw = await callLLM({
    system: loadPrompt(),
    user: userPrompt,
    maxTokens: 1500,
    temperature: 0.1,
  });

  // JSON 파싱
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(cleaned);

  if (!Array.isArray(parsed.signals)) return [];

  // 결과 매핑
  return parsed.signals.slice(0, 3).map((sig: Record<string, unknown>, idx: number) => {
    const score = Math.max(0, Math.min(100, Number(sig.score) || 0));
    const severity = getSeverityFromScore(score);

    // related_articles 인덱스 → 실제 article ID 매핑
    const relatedIndices = Array.isArray(sig.related_articles)
      ? (sig.related_articles as number[]).filter((i) => i >= 0 && i < articles.length)
      : [];
    const articleIds = relatedIndices.map((i) => articles[i].id);
    const evidence = relatedIndices
      .slice(0, 5)
      .map((i) => articles[i].ai_summary || articles[i].title);

    return {
      id: `sig-${category}-${idx}`,
      title: typeof sig.title === "string" ? sig.title : `${categoryLabel} 위기 신호`,
      description: typeof sig.description === "string" ? sig.description : "",
      severity,
      score,
      category,
      categoryLabel,
      region: typeof sig.region === "string" ? sig.region : null,
      cause: typeof sig.cause === "string" ? sig.cause : "",
      impact: typeof sig.impact === "string" ? sig.impact : "",
      actionPoints: Array.isArray(sig.action_points)
        ? (sig.action_points as string[]).filter((s) => typeof s === "string").slice(0, 3)
        : [],
      evidence,
      articleIds,
    };
  }).filter((sig: DetectedSignal) => sig.articleIds.length >= 2);
}

// -- 메인 함수 --

export async function detectSignals(options: DetectOptions = {}): Promise<DetectResult> {
  const {
    windowDays = 30,
    maxArticlesPerCategory = 20,
    rebuild = true,
    categories,
    runId,
  } = options;

  const db = getDb();

  // 기존 신호 정리 (run_id가 있으면 해당 회차만, 없으면 레거시 방식)
  if (rebuild) {
    if (runId) {
      db.prepare("DELETE FROM signal_articles WHERE run_id = ?").run(runId);
      db.prepare("DELETE FROM signals WHERE run_id = ?").run(runId);
    } else {
      db.prepare("DELETE FROM signal_articles").run();
      db.prepare("DELETE FROM signals").run();
    }
  }

  const allSignals: DetectedSignal[] = [];

  // 카테고리별 AI 분석 (선택된 카테고리만)
  const targetCategories = categories?.length
    ? CATEGORIES.filter((c) => categories.includes(c.key))
    : CATEGORIES;

  for (const cat of targetCategories) {
    const articles = getHighRiskArticles(cat.key, windowDays, maxArticlesPerCategory);
    if (articles.length < 2) continue;

    try {
      const signals = await detectForCategory(cat.key, cat.label, articles);
      allSignals.push(...signals);
    } catch (err) {
      console.error(`Signal detection failed for ${cat.key}:`, err);
    }
  }

  // 복합 신호 탐지 (패턴 기반)
  try {
    const volumeSpikes = detectVolumeSpikes(windowDays);
    const regionalClusters = detectRegionalClusters(windowDays);
    const crossCategory = detectCrossCategorySignals(windowDays);

    // 기존 AI 신호 ID와 중복되지 않는 것만 추가
    const existingIds = new Set(allSignals.map((s) => s.id));
    for (const sig of [...volumeSpikes, ...regionalClusters, ...crossCategory]) {
      if (!existingIds.has(sig.id)) {
        allSignals.push(sig);
      }
    }
    console.log(`[SignalDetector] 복합 신호: volume=${volumeSpikes.length}, regional=${regionalClusters.length}, cross=${crossCategory.length}`);
  } catch (err) {
    console.warn("[SignalDetector] 복합 신호 탐지 실패:", (err as Error).message);
  }

  // DB 저장 (run_id 포함)
  const effectiveRunId = runId ?? "__legacy__";

  const insertSignal = db.prepare(`
    INSERT OR REPLACE INTO signals
      (id, run_id, title, description, severity, score, category, category_label, region, detected_at, evidence, cause, impact, action_points)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?)
  `);
  const insertLink = db.prepare(`
    INSERT OR IGNORE INTO signal_articles (signal_id, run_id, article_id) VALUES (?, ?, ?)
  `);

  const txn = db.transaction(() => {
    for (const sig of allSignals) {
      insertSignal.run(
        sig.id,
        effectiveRunId,
        sig.title,
        sig.description,
        sig.severity,
        sig.score,
        sig.category,
        sig.categoryLabel,
        sig.region,
        JSON.stringify(sig.evidence),
        sig.cause,
        sig.impact,
        JSON.stringify(sig.actionPoints)
      );
      for (const articleId of sig.articleIds) {
        insertLink.run(sig.id, effectiveRunId, articleId);
      }
    }
  });
  txn();

  return { signalCount: allSignals.length, signals: allSignals };
}

// ── 복합 신호 탐지 (패턴 기반) ────────────────────────────

/**
 * 기사량 급증(Volume Spike) 신호
 * 최근 3일 기사량이 30일 평균 대비 2배 이상인 카테고리를 탐지
 */
function detectVolumeSpikes(windowDays: number): DetectedSignal[] {
  const db = getDb(true);
  const latestRow = db
    .prepare(`SELECT MAX(published_at) as latest FROM articles`)
    .get() as { latest: string | null };
  const baseDate = latestRow?.latest || new Date().toISOString();

  const rows = db.prepare(
    `SELECT category,
            COUNT(CASE WHEN published_at >= date(?, '-3 days') THEN 1 END) as recent_3d,
            COUNT(*) * 1.0 / ? as daily_avg
     FROM articles
     WHERE published_at >= date(?, '-' || ? || ' days')
     GROUP BY category
     HAVING recent_3d > daily_avg * 2 * 3`
  ).all(baseDate, windowDays, baseDate, windowDays) as {
    category: string; recent_3d: number; daily_avg: number;
  }[];

  const catLabelMap: Record<string, string> = {};
  for (const c of CATEGORIES) catLabelMap[c.key] = c.label;

  return rows.map((r, idx) => {
    const ratio = r.daily_avg > 0 ? Math.round(r.recent_3d / (r.daily_avg * 3) * 100) / 100 : 1;
    const score = Math.min(75, Math.round(50 + ratio * 10));
    return {
      id: `sig-vol-${r.category}-${idx}`,
      title: `[${catLabelMap[r.category] ?? r.category}] 기사량 급증`,
      description: `최근 3일간 기사량이 평균 대비 ${ratio}배 증가. 해당 분야의 관심도가 급격히 높아지고 있습니다.`,
      severity: getSeverityFromScore(score),
      score,
      category: r.category as CategoryKey,
      categoryLabel: catLabelMap[r.category] ?? r.category,
      region: null,
      cause: `기사량 ${r.recent_3d}건 (3일) vs 일평균 ${r.daily_avg.toFixed(1)}건`,
      impact: "사회적 관심 급증으로 실질 민생 영향 가능성",
      actionPoints: ["해당 분야 모니터링 강화", "관련 정책 대응 검토"],
      evidence: [],
      articleIds: [],
    };
  });
}

/**
 * 지역 집중(Regional Cluster) 신호
 * 특정 지역에 고위험 기사가 3건 이상 집중된 경우
 */
function detectRegionalClusters(windowDays: number): DetectedSignal[] {
  const db = getDb(true);
  const latestRow = db
    .prepare(
      `SELECT MAX(a.published_at) as latest
       FROM articles a INNER JOIN analysis an ON a.id = an.article_id`
    )
    .get() as { latest: string | null };
  const baseDate = latestRow?.latest || new Date().toISOString();

  const rows = db.prepare(
    `SELECT an.impact_region as region,
            COUNT(*) as cnt,
            ROUND(AVG(an.risk_score), 1) as avg_score,
            GROUP_CONCAT(DISTINCT a.category) as categories
     FROM articles a
     INNER JOIN analysis an ON a.id = an.article_id
     WHERE an.impact_region IS NOT NULL
       AND an.severity IN ('critical', 'warning')
       AND a.published_at >= date(?, '-' || ? || ' days')
     GROUP BY an.impact_region
     HAVING cnt >= 3
     ORDER BY avg_score DESC`
  ).all(baseDate, windowDays) as {
    region: string; cnt: number; avg_score: number; categories: string;
  }[];

  return rows.slice(0, 3).map((r, idx) => {
    const score = Math.min(85, Math.round(r.avg_score));
    const cats = r.categories.split(",").map((c) => c.trim());
    return {
      id: `sig-reg-${r.region}-${idx}`,
      title: `[${r.region}] 지역 집중 위기`,
      description: `${r.region} 지역에서 고위험 기사 ${r.cnt}건 집중 발생. 평균 위험도 ${r.avg_score}점.`,
      severity: getSeverityFromScore(score),
      score,
      category: (cats[0] || "prices") as CategoryKey,
      categoryLabel: r.region,
      region: r.region,
      cause: `${r.region} 지역 고위험 기사 ${r.cnt}건 (분야: ${cats.join(", ")})`,
      impact: "지역 특화 민생 위기 가능성",
      actionPoints: [
        `${r.region} 지역 맞춤 대응 검토`,
        "지자체 협조 강화",
      ],
      evidence: [],
      articleIds: [],
    };
  });
}

/**
 * 교차 카테고리(Cross-Category) 신호
 * 서로 다른 카테고리에서 동일 키워드가 반복 등장 (연쇄 위기 조기 감지)
 */
function detectCrossCategorySignals(windowDays: number): DetectedSignal[] {
  const db = getDb(true);
  const latestRow = db
    .prepare(
      `SELECT MAX(a.published_at) as latest
       FROM articles a INNER JOIN analysis an ON a.id = an.article_id`
    )
    .get() as { latest: string | null };
  const baseDate = latestRow?.latest || new Date().toISOString();

  // 카테고리별 핵심 요인 추출
  const rows = db.prepare(
    `SELECT a.category, an.key_factors
     FROM articles a
     INNER JOIN analysis an ON a.id = an.article_id
     WHERE an.key_factors IS NOT NULL AND an.key_factors != '[]'
       AND an.severity IN ('critical', 'warning')
       AND a.published_at >= date(?, '-' || ? || ' days')`
  ).all(baseDate, windowDays) as { category: string; key_factors: string }[];

  // 키워드 → 카테고리 집합 매핑
  const keywordCats = new Map<string, Set<string>>();
  for (const row of rows) {
    try {
      const factors = JSON.parse(row.key_factors) as string[];
      for (const f of factors) {
        const normalized = f.trim().slice(0, 30);
        if (normalized.length < 3) continue;
        if (!keywordCats.has(normalized)) keywordCats.set(normalized, new Set());
        keywordCats.get(normalized)!.add(row.category);
      }
    } catch { /* skip */ }
  }

  // 2개 이상 카테고리에 걸친 키워드 → 신호
  const crossKeywords: { keyword: string; categories: string[] }[] = [];
  for (const [kw, cats] of keywordCats) {
    if (cats.size >= 2) {
      crossKeywords.push({ keyword: kw, categories: [...cats] });
    }
  }

  if (crossKeywords.length === 0) return [];

  // 상위 3개만 신호로 생성
  const catLabelMap: Record<string, string> = {};
  for (const c of CATEGORIES) catLabelMap[c.key] = c.label;

  return crossKeywords.slice(0, 3).map((ck, idx) => {
    const catLabels = ck.categories.map((c) => catLabelMap[c] || c).join(", ");
    const score = Math.min(80, 55 + ck.categories.length * 10);
    return {
      id: `sig-cross-${idx}`,
      title: `교차 분야 위기: ${ck.keyword}`,
      description: `"${ck.keyword}" 이슈가 ${catLabels} 등 ${ck.categories.length}개 분야에 동시 영향. 연쇄 위기 가능성 모니터링 필요.`,
      severity: getSeverityFromScore(score),
      score,
      category: ck.categories[0] as CategoryKey,
      categoryLabel: catLabels,
      region: null,
      cause: `${ck.categories.length}개 분야 공통 이슈: ${ck.keyword}`,
      impact: "분야 간 연쇄 영향 가능성",
      actionPoints: ["범분야 통합 대응 검토", "연쇄 위기 시나리오 점검"],
      evidence: [],
      articleIds: [],
    };
  });
}

// -- 헬퍼 --

function getSeverityFromScore(score: number): Severity {
  for (const config of SEVERITY_CONFIG) {
    if (score >= config.scoreMin && score <= config.scoreMax) return config.key;
  }
  return "safe";
}
