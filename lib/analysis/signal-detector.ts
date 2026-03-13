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

  const userPrompt = `카테고리: ${categoryLabel} (${category})
기사 수: ${articles.length}건

최근 고위험 기사 목록:
${articleList}`;

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

// -- 헬퍼 --

function getSeverityFromScore(score: number): Severity {
  for (const config of SEVERITY_CONFIG) {
    if (score >= config.scoreMin && score <= config.scoreMax) return config.key;
  }
  return "safe";
}
