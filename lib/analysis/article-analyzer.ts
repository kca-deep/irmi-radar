/**
 * 개별 기사 AI 분석 모듈
 * OpenAI GPT-4.1 Nano로 기사별 키워드 추출 + 리스크 분석
 */

import { readFileSync } from "fs";
import { join } from "path";
import { callLLM } from "@/lib/api/ai-client";
import { getDb } from "@/lib/db/index";
import { PipelineCancelledError } from "./pipeline";
import type { CategoryKey, Severity } from "@/lib/types";

// -- 타입 --

export interface ArticleInput {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: CategoryKey;
  categoryLabel: string;
}

export interface ArticleAnalysisResult {
  keywords: string[];
  riskScore: number;
  severity: Severity;
  keyFactors: string[];
  impactRegion: string | null;
  summary: string;
}

export interface AnalyzeOptions {
  limit?: number;
  concurrency?: number;
  batchSize?: number;
  category?: CategoryKey;
  dateFrom?: string;
  dateTo?: string;
  dryRun?: boolean;
  signal?: AbortSignal;
  onProgress?: (processed: number, total: number, failed: number) => void;
  onArticleComplete?: (id: string, success: boolean) => void;
}

export interface AnalyzeResult {
  total: number;
  analyzed: number;
  failed: number;
  elapsedMs: number;
}

// -- 시스템 프롬프트 (외부 .md 파일에서 로드) --

let _cachedPrompt: string | null = null;

function loadSystemPrompt(): string {
  if (_cachedPrompt) return _cachedPrompt;
  const promptPath = join(process.cwd(), "lib/analysis/prompts/article-analysis.md");
  _cachedPrompt = readFileSync(promptPath, "utf-8");
  return _cachedPrompt;
}

// -- 단건 분석 --

async function analyzeOne(article: ArticleInput): Promise<ArticleAnalysisResult> {
  const contentSnippet = article.content
    ? `\n본문(발췌): ${article.content.slice(0, 500)}`
    : "";

  const userPrompt = `카테고리: ${article.categoryLabel} (${article.category})
제목: ${article.title}
요약: ${article.summary}${contentSnippet}`;

  const raw = await callLLM({
    system: loadSystemPrompt(),
    user: userPrompt,
    maxTokens: 500,
    temperature: 0.1,
  });

  // JSON 파싱 (코드펜스 제거)
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(cleaned);

  // 유효성 검증 + 정규화
  const riskScore = Math.max(0, Math.min(100, Number(parsed.risk_score) || 0));
  let severity: Severity = "safe";
  if (riskScore >= 80) severity = "critical";
  else if (riskScore >= 60) severity = "warning";
  else if (riskScore >= 40) severity = "caution";

  return {
    keywords: Array.isArray(parsed.keywords)
      ? parsed.keywords.filter((k: unknown) => typeof k === "string").slice(0, 10)
      : [],
    riskScore,
    severity,
    keyFactors: Array.isArray(parsed.key_factors)
      ? parsed.key_factors.filter((k: unknown) => typeof k === "string").slice(0, 5)
      : [],
    impactRegion: typeof parsed.impact_region === "string" ? parsed.impact_region : null,
    summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 150) : "",
  };
}

// -- 재시도 래퍼 --

export async function analyzeWithRetry(
  article: ArticleInput,
  maxRetries = 2
): Promise<ArticleAnalysisResult> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await analyzeOne(article);
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries) {
        // Rate limit (429) → 더 긴 대기
        const isRateLimit = lastError.message?.includes("429");
        const delay = isRateLimit
          ? 5000 * (attempt + 1)
          : 1000 * (attempt + 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// -- DB 저장 --

export function saveAnalysis(articleId: string, result: ArticleAnalysisResult): void {
  const db = getDb();
  const insertAnalysis = db.prepare(`
    INSERT OR REPLACE INTO analysis (article_id, risk_score, severity, key_factors, impact_region, ai_summary, analyzed_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  const updateKeywords = db.prepare(`
    UPDATE articles SET keywords = ? WHERE id = ?
  `);

  const txn = db.transaction(() => {
    insertAnalysis.run(
      articleId,
      result.riskScore,
      result.severity,
      JSON.stringify(result.keyFactors),
      result.impactRegion,
      result.summary
    );
    if (result.keywords.length > 0) {
      updateKeywords.run(JSON.stringify(result.keywords), articleId);
    }
  });
  txn();
}

// -- 미분석 기사 조회 --

export function getUnanalyzedArticles(
  limit: number,
  category?: CategoryKey,
  dateFrom?: string,
  dateTo?: string
): ArticleInput[] {
  const db = getDb();
  const conditions = ["a.id NOT IN (SELECT article_id FROM analysis)"];
  const bindings: (string | number)[] = [];

  if (category) {
    conditions.push("a.category = ?");
    bindings.push(category);
  }

  if (dateFrom) {
    conditions.push("a.published_at >= ?");
    bindings.push(dateFrom);
  }

  if (dateTo) {
    conditions.push("a.published_at <= ?");
    bindings.push(dateTo);
  }

  const sql = `
    SELECT a.id, a.title, a.summary, a.content, a.category, a.category_label
    FROM articles a
    WHERE ${conditions.join(" AND ")}
    ORDER BY a.published_at DESC
    LIMIT ?
  `;
  bindings.push(limit);

  const rows = db.prepare(sql).all(...bindings) as {
    id: string;
    title: string;
    summary: string | null;
    content: string | null;
    category: string;
    category_label: string | null;
  }[];

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    summary: r.summary || "",
    content: r.content || "",
    category: r.category as CategoryKey,
    categoryLabel: r.category_label || "",
  }));
}

// -- 기분석 기사 조회 (재분석용) --

export function getAnalyzedArticles(
  limit: number,
  category?: CategoryKey
): ArticleInput[] {
  const db = getDb();
  const conditions = ["a.id IN (SELECT article_id FROM analysis)"];
  const bindings: (string | number)[] = [];

  if (category) {
    conditions.push("a.category = ?");
    bindings.push(category);
  }

  const sql = `
    SELECT a.id, a.title, a.summary, a.content, a.category, a.category_label
    FROM articles a
    WHERE ${conditions.join(" AND ")}
    ORDER BY a.published_at DESC
    LIMIT ?
  `;
  bindings.push(limit);

  const rows = db.prepare(sql).all(...bindings) as {
    id: string;
    title: string;
    summary: string | null;
    content: string | null;
    category: string;
    category_label: string | null;
  }[];

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    summary: r.summary || "",
    content: r.content || "",
    category: r.category as CategoryKey,
    categoryLabel: r.category_label || "",
  }));
}

// -- 동시성 제어 배치 처리 --

export async function runConcurrent<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
  signal?: AbortSignal
): Promise<(R | Error)[]> {
  const results: (R | Error)[] = new Array(items.length);
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      if (signal?.aborted) {
        throw new PipelineCancelledError();
      }
      const i = idx++;
      try {
        results[i] = await fn(items[i]);
      } catch (err) {
        results[i] = err as Error;
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

// -- 메인 분석 함수 --

export async function analyzeArticles(
  options: AnalyzeOptions = {}
): Promise<AnalyzeResult> {
  const {
    limit = Infinity,
    concurrency = 10,
    batchSize = 200,
    category,
    dateFrom,
    dateTo,
    dryRun = false,
    signal,
    onProgress,
    onArticleComplete,
  } = options;

  const start = Date.now();

  // 미분석 기사 조회
  const fetchLimit = limit === Infinity ? 999999 : limit;
  const articles = getUnanalyzedArticles(fetchLimit, category, dateFrom, dateTo);

  if (dryRun) {
    return {
      total: articles.length,
      analyzed: 0,
      failed: 0,
      elapsedMs: Date.now() - start,
    };
  }

  let analyzed = 0;
  let failed = 0;

  // 배치 단위로 처리
  for (let offset = 0; offset < articles.length; offset += batchSize) {
    if (signal?.aborted) {
      console.log("[Analyzer] 취소 감지 - 배치 처리 중단");
      break;
    }

    const batch = articles.slice(offset, offset + batchSize);

    const results = await runConcurrent(
      batch,
      (article) => analyzeWithRetry(article),
      concurrency,
      signal
    );

    // 결과 저장
    for (let i = 0; i < batch.length; i++) {
      const result = results[i];
      const article = batch[i];

      if (result instanceof Error) {
        failed++;
        onArticleComplete?.(article.id, false);
      } else {
        saveAnalysis(article.id, result);
        analyzed++;
        onArticleComplete?.(article.id, true);
      }
    }

    onProgress?.(analyzed + failed, articles.length, failed);
  }

  return {
    total: articles.length,
    analyzed,
    failed,
    elapsedMs: Date.now() - start,
  };
}
