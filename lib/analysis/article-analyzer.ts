/**
 * 개별 기사 AI 분석 모듈
 * OpenAI GPT-4.1 Nano로 기사별 키워드 추출 + 리스크 분석
 */

import { readFileSync } from "fs";
import { join } from "path";
import { callLLM } from "@/lib/api/ai-client";
import { getDb } from "@/lib/db/index";
import { PipelineCancelledError } from "./pipeline";
import { IRMI_KEYWORDS } from "@/lib/db/category-map";
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

// -- 후처리 보정 --

/** 5의 배수 점수를 +-1~2 보정 (프롬프트 규칙 준수 보강) */
function deRoundScore(score: number): number {
  if (score === 0) return 0;
  if (score % 5 !== 0) return score;
  const offset = (score % 10 === 0 ? 1 : -1) * (1 + (score % 7 === 0 ? 1 : 0));
  return Math.max(1, Math.min(99, score + offset));
}

/** 허용 지역 접두사 (17개 시도 + 전국) */
const VALID_REGION_PREFIXES = [
  "서울","부산","대구","인천","광주","대전","울산","세종",
  "경기","강원","충북","충남","전북","전남","경북","경남","제주","전국",
];

/** 해외 지역 등 비정규 impact_region을 null로 정규화 */
function sanitizeRegion(region: string | null): string | null {
  if (!region) return null;
  const trimmed = region.trim();
  if (!trimmed) return null;
  return VALID_REGION_PREFIXES.some((p) => trimmed.startsWith(p)) ? trimmed : null;
}

// -- 비민생 키워드 감지 --

const NEGATIVE_PATTERNS = [
  /마약|투약|필로폰|대마|코카인|흡입/,
  /살인|폭행|성범죄|성폭력|강도|납치/,
  /연예인|아이돌|배우|가수|셀럽|패션 화제/,
  /프로야구|프로축구|프로농구|e스포츠/,
  /시상식|콘서트|팬미팅|영화제/,
];

const ECONOMIC_CRIME_PATTERNS = [
  /보이스피싱|금융사기|투자사기|주가조작/,
  /전세사기|분양사기|부동산사기/,
  /횡령|배임|임금체불|탈세|탈루/,
  /불법대출|사금융|불법추심/,
];

/** 비민생 키워드 포함 여부 (경제범죄는 제외) */
function hasNegativeKeywords(title: string, summary: string): boolean {
  const text = `${title} ${summary}`;
  if (ECONOMIC_CRIME_PATTERNS.some((p) => p.test(text))) return false;
  return NEGATIVE_PATTERNS.some((p) => p.test(text));
}

/** 해당 카테고리의 IRMI 키워드가 텍스트에 포함되는지 확인 */
function hasCategoryKeywords(
  category: CategoryKey,
  title: string,
  summary: string,
  content: string,
): boolean {
  const keywords = IRMI_KEYWORDS[category];
  const text = `${title} ${summary} ${content}`;
  return keywords.some((kw) => text.includes(kw));
}

/** 인사/조직 공시 패턴 */
const HR_PATTERN = /\[인사\]|\[조직\]|임원\s*인사|조직개편|승진|선임|부사장|전무|상무/;

/** 스포츠/연예 패턴 */
const SPORTS_ENT_PATTERN = /프로야구|프로축구|프로배구|프로농구|연예|시상식|음악|영화|드라마|아이돌/;

/** 매물 광고 패턴 */
const AD_PATTERN = /추천매물|MK추천|매물\]|분양광고/;

/** 후처리 점수 보정 (프롬프트 위반 방어) */
function postValidateScore(
  article: ArticleInput,
  rawScore: number,
  categoryMatch: boolean | undefined,
  sentiment: string | undefined,
): number {
  let score = rawScore;

  // 1. AI가 category_match = false를 반환한 경우
  if (categoryMatch === false) {
    score = Math.min(score, 14);
  }

  // 2. 비민생 키워드 감지 (경제범죄 제외)
  if (hasNegativeKeywords(article.title, article.summary)) {
    score = Math.min(score, 18);
  }

  // 3. 높은 점수인데 카테고리 키워드가 전혀 없는 경우
  if (score >= 60) {
    const contentSnippet = article.content?.slice(0, 800) || "";
    if (!hasCategoryKeywords(article.category, article.title, article.summary, contentSnippet)) {
      score = Math.min(score, 38);
    }
  }

  // 4. 긍정적 변화 기사 → safe 범위 강제
  if (sentiment === "positive" && score > 39) {
    score = Math.min(score, 39);
  }

  // 5. 인사/조직 공시 패턴 → 12점 이하
  if (HR_PATTERN.test(article.title)) {
    score = Math.min(score, 12);
  }

  // 6. 스포츠/연예 패턴 → 12점 이하
  const titleAndSummary = `${article.title} ${article.summary}`;
  if (SPORTS_ENT_PATTERN.test(titleAndSummary)) {
    score = Math.min(score, 12);
  }

  // 7. 매물 광고 패턴 → 8점 이하
  if (AD_PATTERN.test(article.title)) {
    score = Math.min(score, 8);
  }

  return score;
}

// -- 단건 분석 --

/** 같은 카테고리의 최근 분석 컨텍스트 조회 (최대 3건) */
function getRecentContext(category: CategoryKey): string {
  try {
    const db = getDb(true);
    const rows = db.prepare(
      `SELECT a.title, an.risk_score, an.ai_summary
       FROM articles a
       INNER JOIN analysis an ON a.id = an.article_id
       WHERE a.category = ? AND an.ai_summary IS NOT NULL
       ORDER BY an.analyzed_at DESC
       LIMIT 3`
    ).all(category) as { title: string; risk_score: number; ai_summary: string }[];
    if (rows.length === 0) return "";
    const lines = rows.map((r) => `- [${r.risk_score}점] ${r.title}: ${r.ai_summary}`);
    return `\n\n[참고: 같은 분야 최근 분석]\n${lines.join("\n")}`;
  } catch {
    return "";
  }
}

async function analyzeOne(article: ArticleInput): Promise<ArticleAnalysisResult> {
  const contentSnippet = article.content
    ? `\n본문(발췌): ${article.content.slice(0, 800)}`
    : "";

  // 컨텍스트 보강: 같은 카테고리 최근 분석 결과 추가
  const recentContext = getRecentContext(article.category);

  const userPrompt = `카테고리: ${article.categoryLabel} (${article.category})
제목: ${article.title}
요약: ${article.summary}${contentSnippet}${recentContext}`;

  const raw = await callLLM({
    system: loadSystemPrompt(),
    user: userPrompt,
    maxTokens: 500,
    temperature: 0.1,
  });

  // JSON 파싱 (코드펜스 제거)
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(cleaned);

  // 유효성 검증 + 정규화 + 후처리 보정
  const rawScore = Math.max(0, Math.min(100, Number(parsed.risk_score) || 0));
  if (isNaN(rawScore)) {
    throw new Error(`Invalid risk_score from LLM: ${parsed.risk_score}`);
  }
  const categoryMatch = typeof parsed.category_match === "boolean" ? parsed.category_match : undefined;
  const sentiment = typeof parsed.sentiment === "string" ? parsed.sentiment : undefined;
  const validatedScore = postValidateScore(article, rawScore, categoryMatch, sentiment);
  const riskScore = deRoundScore(validatedScore);
  let severity: Severity = "safe";
  if (riskScore >= 80) severity = "critical";
  else if (riskScore >= 60) severity = "warning";
  else if (riskScore >= 40) severity = "caution";

  const rawRegion = typeof parsed.impact_region === "string" ? parsed.impact_region : null;

  // 후검증: 필수 필드 품질 검증
  const keyFactors = Array.isArray(parsed.key_factors)
    ? parsed.key_factors.filter((k: unknown) => typeof k === "string" && (k as string).length > 0).slice(0, 5)
    : [];
  const summary = typeof parsed.summary === "string" ? parsed.summary.slice(0, 150) : "";

  // 고위험(60+) 기사인데 핵심 요인/요약이 없으면 LLM 응답 품질 미달 → 재시도 유도
  if (riskScore >= 60 && keyFactors.length === 0 && !summary) {
    throw new Error(`High-risk article (score=${riskScore}) missing key_factors and summary`);
  }

  return {
    keywords: Array.isArray(parsed.keywords)
      ? parsed.keywords.filter((k: unknown) => typeof k === "string").slice(0, 10)
      : [],
    riskScore,
    severity,
    keyFactors,
    impactRegion: sanitizeRegion(rawRegion),
    summary,
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
