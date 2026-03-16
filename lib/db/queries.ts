/**
 * 프로덕션 쿼리 함수 모음
 * 서버 컴포넌트 / API Route에서 호출
 */
import type { CategoryKey, Severity } from "@/lib/types";
import { getDb } from "./index";

// ────────────────────────────────────
// 기사 조회
// ────────────────────────────────────

type ArticleSortKey = "publishedAt" | "riskScore";

interface ArticleListParams {
  category?: CategoryKey;
  severity?: Severity;
  region?: string;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
  analyzedOnly?: boolean;
  sort?: ArticleSortKey;
  limit?: number;
  offset?: number;
}

/** 기사 목록 (복합 필터 + 페이지네이션) */
export function getArticles(params: ArticleListParams = {}) {
  const db = getDb(true);
  const conditions: string[] = [];
  const bindings: (string | number)[] = [];

  if (params.category) {
    conditions.push("a.category = ?");
    bindings.push(params.category);
  }
  if (params.region) {
    conditions.push("a.region = ?");
    bindings.push(params.region);
  }
  if (params.dateFrom) {
    conditions.push("a.published_at >= ?");
    bindings.push(params.dateFrom);
  }
  if (params.dateTo) {
    conditions.push("a.published_at <= ?");
    bindings.push(params.dateTo);
  }
  if (params.severity) {
    conditions.push("an.severity = ?");
    bindings.push(params.severity);
  }
  if (params.analyzedOnly) {
    conditions.push("an.article_id IS NOT NULL");
  }

  const joinType = params.analyzedOnly ? "INNER JOIN" : "LEFT JOIN";
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;

  const orderClause = params.sort === "riskScore"
    ? "ORDER BY COALESCE(an.risk_score, -1) DESC, a.published_at DESC"
    : "ORDER BY a.published_at DESC";

  // 키워드 검색이 있으면 FTS 사용
  if (params.keyword) {
    const ftsQuery = params.keyword
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => `"${w}"`)
      .join(" OR ");

    const sql = `
      SELECT a.*, an.risk_score, an.severity AS analysis_severity, an.ai_summary, an.key_factors, an.impact_region
      FROM articles a
      ${joinType} analysis an ON a.id = an.article_id
      WHERE a.rowid IN (
        SELECT rowid FROM articles_fts WHERE articles_fts MATCH ?
      )
      ${conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : ""}
      ${orderClause}
      LIMIT ? OFFSET ?
    `;
    return db.prepare(sql).all(ftsQuery, ...bindings, limit, offset);
  }

  const sql = `
    SELECT a.*, an.risk_score, an.severity AS analysis_severity, an.ai_summary, an.key_factors, an.impact_region
    FROM articles a
    ${joinType} analysis an ON a.id = an.article_id
    ${where}
    ${orderClause}
    LIMIT ? OFFSET ?
  `;
  return db.prepare(sql).all(...bindings, limit, offset);
}

/** 기사 총 건수 (필터 적용) */
export function getArticleCount(params: Omit<ArticleListParams, "limit" | "offset"> = {}) {
  const db = getDb(true);
  const conditions: string[] = [];
  const bindings: (string | number)[] = [];

  if (params.category) {
    conditions.push("a.category = ?");
    bindings.push(params.category);
  }
  if (params.region) {
    conditions.push("a.region = ?");
    bindings.push(params.region);
  }
  if (params.dateFrom) {
    conditions.push("a.published_at >= ?");
    bindings.push(params.dateFrom);
  }
  if (params.dateTo) {
    conditions.push("a.published_at <= ?");
    bindings.push(params.dateTo);
  }
  if (params.analyzedOnly) {
    conditions.push("an.article_id IS NOT NULL");
  }

  const joinType = params.analyzedOnly ? "INNER JOIN" : "LEFT JOIN";
  const joinClause = params.analyzedOnly
    ? `${joinType} analysis an ON a.id = an.article_id`
    : "";
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `SELECT COUNT(*) as count FROM articles a ${joinClause} ${where}`;
  const row = db.prepare(sql).get(...bindings) as { count: number };
  return row.count;
}

/** 기사 단건 조회 (본문 포함) */
export function getArticleById(id: string) {
  const db = getDb(true);
  return db
    .prepare(
      `SELECT a.*, an.risk_score, an.severity AS analysis_severity,
              an.key_factors, an.ai_summary, an.impact_region
       FROM articles a
       LEFT JOIN analysis an ON a.id = an.article_id
       WHERE a.id = ?`
    )
    .get(id);
}

// ────────────────────────────────────
// 카테고리별 통계
// ────────────────────────────────────

/** 카테고리별 기사 수 */
export function getArticleCountByCategory() {
  const db = getDb(true);
  return db
    .prepare(
      `SELECT category, COUNT(*) as count
       FROM articles
       GROUP BY category`
    )
    .all() as { category: string; count: number }[];
}

/** 카테고리별 평균 리스크 점수 */
export function getCategoryRiskScores() {
  const db = getDb(true);
  return db
    .prepare(
      `SELECT a.category,
              AVG(an.risk_score) as avg_score,
              COUNT(CASE WHEN an.severity = 'critical' THEN 1 END) as critical_count,
              COUNT(CASE WHEN an.severity = 'warning' THEN 1 END) as warning_count
       FROM articles a
       JOIN analysis an ON a.id = an.article_id
       GROUP BY a.category`
    )
    .all();
}

/** 카테고리별 등급 분포 (미니 차트용) */
export function getCategorySeverityDistribution() {
  const db = getDb(true);
  return db
    .prepare(
      `SELECT a.category,
              COUNT(CASE WHEN an.severity = 'critical' THEN 1 END) as critical,
              COUNT(CASE WHEN an.severity = 'warning' THEN 1 END) as warning,
              COUNT(CASE WHEN an.severity = 'caution' THEN 1 END) as caution,
              COUNT(CASE WHEN an.severity = 'safe' THEN 1 END) as safe,
              COUNT(*) as total
       FROM articles a
       JOIN analysis an ON a.id = an.article_id
       GROUP BY a.category
       ORDER BY COUNT(CASE WHEN an.severity = 'critical' THEN 1 END) DESC,
                COUNT(CASE WHEN an.severity = 'warning' THEN 1 END) DESC`
    )
    .all() as {
      category: string;
      critical: number;
      warning: number;
      caution: number;
      safe: number;
      total: number;
    }[];
}

/** 신호 일별 카운트 (전일대비용, 최근 2회차) */
export function getSignalCountByDate() {
  const db = getDb(true);
  // 최근 2개 완료 회차의 신호 수 비교
  const runs = getRecentCompletedRuns(2);
  if (runs.length === 0) return [];

  return runs.map((run) => {
    const row = db.prepare(
      "SELECT COUNT(*) as count FROM signals WHERE run_id = ?"
    ).get(run.id) as { count: number };
    return { date: run.run_date, count: row.count };
  });
}

// ────────────────────────────────────
// 분석 회차 (analysis_runs)
// ────────────────────────────────────

/** 분석 회차 생성 → run_id 반환 */
export function createAnalysisRun(config?: Record<string, unknown>): string {
  const db = getDb();
  const now = new Date();
  const id = now.toISOString().replace(/[-:T]/g, "").slice(0, 15);
  const runDate = now.toISOString().slice(0, 10);

  db.prepare(
    `INSERT INTO analysis_runs (id, run_date, started_at, status, config)
     VALUES (?, ?, ?, 'running', ?)`
  ).run(id, runDate, now.toISOString(), config ? JSON.stringify(config) : null);

  return id;
}

/** 분석 회차 완료 */
export function completeAnalysisRun(runId: string, data: {
  overallScore: number;
  overallSeverity: string;
  summary?: string;
  prices?: number;
  employment?: number;
  selfEmployed?: number;
  finance?: number;
  realEstate?: number;
  articlesTotal?: number;
  articlesAnalyzed?: number;
  tokenUsage?: Record<string, unknown>;
}): void {
  const db = getDb();
  db.prepare(
    `UPDATE analysis_runs SET
       status = 'completed',
       completed_at = datetime('now'),
       overall_score = ?,
       overall_severity = ?,
       summary = ?,
       prices = ?,
       employment = ?,
       self_employed = ?,
       finance = ?,
       real_estate = ?,
       articles_total = ?,
       articles_analyzed = ?,
       token_usage = ?
     WHERE id = ?`
  ).run(
    data.overallScore,
    data.overallSeverity,
    data.summary ?? null,
    data.prices ?? 0,
    data.employment ?? 0,
    data.selfEmployed ?? 0,
    data.finance ?? 0,
    data.realEstate ?? 0,
    data.articlesTotal ?? 0,
    data.articlesAnalyzed ?? 0,
    data.tokenUsage ? JSON.stringify(data.tokenUsage) : null,
    runId,
  );
}

/** 분석 회차 실패 처리 */
export function failAnalysisRun(runId: string): void {
  const db = getDb();
  db.prepare(
    "UPDATE analysis_runs SET status = 'failed', completed_at = datetime('now') WHERE id = ?"
  ).run(runId);
}

/** 최신 완료된 분석 회차 */
export function getLatestCompletedRun() {
  const db = getDb(true);
  return db.prepare(
    `SELECT * FROM analysis_runs
     WHERE status = 'completed'
     ORDER BY completed_at DESC LIMIT 1`
  ).get() as AnalysisRunRow | undefined;
}

/** 특정 회차 직전의 완료된 분석 회차 */
export function getPreviousCompletedRun(currentRunId: string) {
  const db = getDb(true);

  // compare 단계에서 호출 시 현재 run은 아직 completed_at이 null이므로,
  // id 제외 방식으로 최신 completed run을 찾는다.
  return db.prepare(
    `SELECT * FROM analysis_runs
     WHERE status = 'completed' AND id != ?
     ORDER BY completed_at DESC LIMIT 1`
  ).get(currentRunId) as AnalysisRunRow | undefined;
}

/** 최근 N개 완료된 분석 회차 */
export function getRecentCompletedRuns(limit = 10) {
  const db = getDb(true);
  return db.prepare(
    `SELECT * FROM analysis_runs
     WHERE status = 'completed'
     ORDER BY completed_at DESC LIMIT ?`
  ).all(limit) as AnalysisRunRow[];
}

export interface AnalysisRunRow {
  id: string;
  run_date: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  overall_score: number | null;
  overall_severity: string | null;
  summary: string | null;
  prices: number;
  employment: number;
  self_employed: number;
  finance: number;
  real_estate: number;
  articles_total: number;
  articles_analyzed: number;
  token_usage: string | null;
  config: string | null;
}

// ────────────────────────────────────
// 대시보드 스냅샷
// ────────────────────────────────────

/** 스냅샷 저장 */
export function saveDashboardSnapshot(runId: string, cacheKey: string, data: string): void {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO dashboard_snapshots (run_id, cache_key, data)
     VALUES (?, ?, ?)`
  ).run(runId, cacheKey, data);
}

/** 특정 회차의 스냅샷 조회 */
export function getDashboardSnapshot(runId: string, cacheKey: string): string | null {
  const db = getDb(true);
  const row = db.prepare(
    "SELECT data FROM dashboard_snapshots WHERE run_id = ? AND cache_key = ?"
  ).get(runId, cacheKey) as { data: string } | undefined;
  return row?.data ?? null;
}

/** 최신 완료 회차의 스냅샷 조회 */
export function getLatestDashboardSnapshot(cacheKey: string): { runId: string; data: string } | null {
  const db = getDb(true);
  const row = db.prepare(
    `SELECT ds.run_id, ds.data
     FROM dashboard_snapshots ds
     JOIN analysis_runs ar ON ds.run_id = ar.id
     WHERE ds.cache_key = ? AND ar.status = 'completed'
     ORDER BY ar.completed_at DESC LIMIT 1`
  ).get(cacheKey) as { run_id: string; data: string } | undefined;

  if (!row) return null;
  return { runId: row.run_id, data: row.data };
}

// ────────────────────────────────────
// 카테고리 상세 이력
// ────────────────────────────────────

/** 카테고리 상세 저장 */
export function saveCategoryDetail(runId: string, detail: {
  category: string;
  score: number;
  trend: string;
  articleCount: number;
  criticalCount: number;
  warningCount: number;
  keyIssues: string[];
  topKeywords?: string[];
}): void {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO category_details
       (run_id, category, score, trend, article_count, critical_count, warning_count, key_issues, top_keywords)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    runId,
    detail.category,
    detail.score,
    detail.trend,
    detail.articleCount,
    detail.criticalCount,
    detail.warningCount,
    JSON.stringify(detail.keyIssues),
    detail.topKeywords ? JSON.stringify(detail.topKeywords) : null,
  );
}

/** 특정 회차의 카테고리 상세 조회 */
export function getCategoryDetailsByRunId(runId: string) {
  const db = getDb(true);
  return db.prepare(
    "SELECT * FROM category_details WHERE run_id = ? ORDER BY score DESC"
  ).all(runId) as CategoryDetailRow[];
}

export interface CategoryDetailRow {
  run_id: string;
  category: string;
  score: number;
  trend: string;
  article_count: number;
  critical_count: number;
  warning_count: number;
  key_issues: string | null;
  top_keywords: string | null;
}

// ────────────────────────────────────
// 신호 조회 (run_id 기반)
// ────────────────────────────────────

interface SignalListParams {
  category?: CategoryKey;
  severity?: Severity;
  region?: string;
  runId?: string;
  limit?: number;
  offset?: number;
}

/** 신호 목록 (필터 + 페이지네이션) - 미지정 시 최신 회차 */
export function getSignals(params: SignalListParams = {}) {
  const db = getDb(true);
  const conditions: string[] = [];
  const bindings: (string | number)[] = [];

  // run_id 필터: 지정되면 해당 회차, 아니면 최신 완료 회차
  if (params.runId) {
    conditions.push("s.run_id = ?");
    bindings.push(params.runId);
  } else {
    const latestRun = getLatestCompletedRun();
    if (latestRun) {
      conditions.push("s.run_id = ?");
      bindings.push(latestRun.id);
    }
  }

  if (params.category) {
    conditions.push("s.category = ?");
    bindings.push(params.category);
  }
  if (params.severity) {
    conditions.push("s.severity = ?");
    bindings.push(params.severity);
  }
  if (params.region) {
    conditions.push("s.region = ?");
    bindings.push(params.region);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;

  const sql = `
    SELECT s.*,
           (SELECT COUNT(*) FROM signal_articles sa WHERE sa.signal_id = s.id AND sa.run_id = s.run_id) as related_article_count
    FROM signals s
    ${where}
    ORDER BY s.score DESC, s.detected_at DESC
    LIMIT ? OFFSET ?
  `;
  return db.prepare(sql).all(...bindings, limit, offset);
}

/** 특정 회차의 신호 통계 */
export function getSignalStatsByRunId(runId: string) {
  const db = getDb(true);
  return db.prepare(
    `SELECT
       COUNT(*) as total,
       COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_count,
       COUNT(CASE WHEN severity = 'warning' THEN 1 END) as warning_count,
       COUNT(CASE WHEN severity = 'caution' THEN 1 END) as caution_count
     FROM signals WHERE run_id = ?`
  ).get(runId) as { total: number; critical_count: number; warning_count: number; caution_count: number };
}

/** 신호에 연결된 기사 목록 */
export function getSignalArticles(signalId: string, runId?: string) {
  const db = getDb(true);

  // runId가 없으면 최신 회차에서 찾기
  const effectiveRunId = runId || (() => {
    const latest = getLatestCompletedRun();
    return latest?.id ?? "__legacy__";
  })();

  return db
    .prepare(
      `SELECT a.*, an.risk_score, an.severity AS analysis_severity, an.ai_summary, an.key_factors, an.impact_region
       FROM articles a
       JOIN signal_articles sa ON a.id = sa.article_id
       LEFT JOIN analysis an ON a.id = an.article_id
       WHERE sa.signal_id = ? AND sa.run_id = ?
       ORDER BY a.published_at DESC`
    )
    .all(signalId, effectiveRunId);
}

// ────────────────────────────────────
// 대시보드 캐시
// ────────────────────────────────────

/** 캐시 조회 */
export function getDashboardCache(key: string): string | null {
  const db = getDb(true);
  const row = db
    .prepare("SELECT value FROM dashboard_cache WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

/** 캐시 저장 */
export function setDashboardCache(key: string, value: string): void {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO dashboard_cache (key, value, updated_at)
     VALUES (?, ?, datetime('now'))`
  ).run(key, value);
}

// ────────────────────────────────────
// 지원 정책
// ────────────────────────────────────

interface PolicyListParams {
  category?: CategoryKey;
  region?: string;
  signalId?: string;
  limit?: number;
  offset?: number;
}

/** 정책 목록 (필터 + 페이지네이션) */
export function getPolicies(params: PolicyListParams = {}) {
  const db = getDb(true);
  const conditions: string[] = [];
  const bindings: (string | number)[] = [];

  if (params.category) {
    conditions.push("target_categories LIKE ?");
    bindings.push(`%"${params.category}"%`);
  }
  if (params.region) {
    conditions.push("(target_regions LIKE ? OR target_regions LIKE '%\"전국\"%')");
    bindings.push(`%"${params.region}"%`);
  }
  if (params.signalId) {
    conditions.push("related_signals LIKE ?");
    bindings.push(`%"${params.signalId}"%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;

  const sql = `SELECT * FROM policies ${where} LIMIT ? OFFSET ?`;
  return db.prepare(sql).all(...bindings, limit, offset);
}

// ────────────────────────────────────
// 지역별 현황
// ────────────────────────────────────

/** 전체 지역 목록 (점수순) - 최신 완료 회차 기준 */
export function getRegions(runId?: string) {
  const db = getDb(true);

  const effectiveRunId = runId || (() => {
    const latest = getLatestCompletedRun();
    return latest?.id ?? "__legacy__";
  })();

  return db.prepare(
    "SELECT * FROM regions WHERE run_id = ? ORDER BY score DESC"
  ).all(effectiveRunId);
}

/** 지역 단건 조회 */
export function getRegionById(id: string, runId?: string) {
  const db = getDb(true);

  const effectiveRunId = runId || (() => {
    const latest = getLatestCompletedRun();
    return latest?.id ?? "__legacy__";
  })();

  return db.prepare(
    "SELECT * FROM regions WHERE id = ? AND run_id = ?"
  ).get(id, effectiveRunId);
}

// ────────────────────────────────────
// 보조금24 공공서비스
// ────────────────────────────────────

/** 공공서비스 목록 (키워드 검색) */
export function getGovServices(params: { keyword?: string; limit?: number } = {}) {
  const db = getDb(true);
  const limit = params.limit ?? 20;

  if (params.keyword) {
    return db
      .prepare(
        `SELECT * FROM gov_services
         WHERE service_name LIKE ? OR service_purpose LIKE ? OR service_field LIKE ?
         ORDER BY view_count DESC LIMIT ?`
      )
      .all(`%${params.keyword}%`, `%${params.keyword}%`, `%${params.keyword}%`, limit);
  }

  return db.prepare("SELECT * FROM gov_services ORDER BY view_count DESC LIMIT ?").all(limit);
}

// ────────────────────────────────────
// 국회 API
// ────────────────────────────────────

/** 청원 계류현황 */
export function getAssemblyPetitions(limit = 20) {
  const db = getDb(true);
  return db.prepare("SELECT * FROM assembly_petitions ORDER BY propose_dt DESC LIMIT ?").all(limit);
}

/** 진행중 입법예고 */
export function getAssemblyLegislations(limit = 20) {
  const db = getDb(true);
  return db.prepare("SELECT * FROM assembly_legislations ORDER BY deadline_dt DESC LIMIT ?").all(limit);
}

/** 의안 접수목록 (키워드 검색) */
export function getAssemblyBills(params: { keyword?: string; limit?: number } = {}) {
  const db = getDb(true);
  const limit = params.limit ?? 20;

  if (params.keyword) {
    return db
      .prepare("SELECT * FROM assembly_bills WHERE name LIKE ? ORDER BY propose_dt DESC LIMIT ?")
      .all(`%${params.keyword}%`, limit);
  }

  return db.prepare("SELECT * FROM assembly_bills ORDER BY propose_dt DESC LIMIT ?").all(limit);
}

// ────────────────────────────────────
// 점수 히스토리
// ────────────────────────────────────

interface ScoreHistoryRow {
  date: string;
  overall_score: number;
  prices: number;
  employment: number;
  self_employed: number;
  finance: number;
  real_estate: number;
}

/** 점수 히스토리 조회 (최근 N일, 데이터 최신일 기준) */
export function getScoreHistory(days?: number): ScoreHistoryRow[] {
  const db = getDb(true);
  if (days) {
    // date('now') 대신 실제 데이터 최신일 기준으로 조회
    return db
      .prepare(
        `SELECT * FROM score_history
         WHERE date >= date((SELECT MAX(date) FROM score_history), '-' || ? || ' days')
         ORDER BY date ASC`
      )
      .all(days) as ScoreHistoryRow[];
  }
  return db.prepare("SELECT * FROM score_history ORDER BY date ASC").all() as ScoreHistoryRow[];
}

/** 점수 히스토리 저장 (날짜별 UPSERT) */
export function insertScoreHistory(entry: {
  date: string;
  overallScore: number;
  prices: number;
  employment: number;
  selfEmployed: number;
  finance: number;
  realEstate: number;
  runId?: string;
}): void {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO score_history
       (date, overall_score, prices, employment, self_employed, finance, real_estate, run_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    entry.date,
    entry.overallScore,
    entry.prices,
    entry.employment,
    entry.selfEmployed,
    entry.finance,
    entry.realEstate,
    entry.runId ?? null,
  );
}

// ────────────────────────────────────
// 기사 댓글
// ────────────────────────────────────

/** 기사별 댓글 목록 (최신순) */
export function getArticleComments(articleId: string, limit = 50) {
  const db = getDb(true);
  return db
    .prepare(
      `SELECT * FROM article_comments
       WHERE article_id = ?
       ORDER BY created_at ASC
       LIMIT ?`
    )
    .all(articleId, limit) as ArticleCommentRow[];
}

/** 기사별 댓글 수 */
export function getArticleCommentCount(articleId: string): number {
  const db = getDb(true);
  const row = db
    .prepare("SELECT COUNT(*) as count FROM article_comments WHERE article_id = ?")
    .get(articleId) as { count: number };
  return row.count;
}

/** 댓글 많은 기사 TOP N */
export function getTopCommentedArticles(limit = 10) {
  const db = getDb(true);
  return db
    .prepare(
      `SELECT a.id, a.title, a.category, a.published_at, a.reply_count, a.like_count
       FROM articles a
       WHERE a.reply_count > 0
       ORDER BY a.reply_count DESC
       LIMIT ?`
    )
    .all(limit);
}

export interface ArticleCommentRow {
  comment_id: number;
  article_id: string;
  parent_id: number;
  author: string | null;
  content: string | null;
  like_count: number;
  hate_count: number;
  created_at: string | null;
}

// ────────────────────────────────────
// 전체 통계
// ────────────────────────────────────

/** DB 전체 통계 (디버깅/헬스체크용) */
export function getDbStats() {
  const db = getDb(true);
  const articleCount = (
    db.prepare("SELECT COUNT(*) as c FROM articles").get() as { c: number }
  ).c;
  const analysisCount = (
    db.prepare("SELECT COUNT(*) as c FROM analysis").get() as { c: number }
  ).c;
  const signalCount = (
    db.prepare("SELECT COUNT(*) as c FROM signals").get() as { c: number }
  ).c;
  const dateRange = db
    .prepare(
      "SELECT MIN(published_at) as earliest, MAX(published_at) as latest FROM articles"
    )
    .get() as { earliest: string; latest: string };

  return {
    articleCount,
    analysisCount,
    signalCount,
    dateRange,
  };
}

/** 분석 완료 기사의 severity별 통계 */
export function getAnalysisSeverityStats() {
  const db = getDb(true);
  return db.prepare(
    `SELECT
       COUNT(*) as total,
       COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical,
       COUNT(CASE WHEN severity = 'warning' THEN 1 END) as warning,
       COUNT(CASE WHEN severity = 'caution' THEN 1 END) as caution,
       COUNT(CASE WHEN severity = 'safe' THEN 1 END) as safe
     FROM analysis`
  ).get() as { total: number; critical: number; warning: number; caution: number; safe: number };
}

// ────────────────────────────────────
// 기사 기반 대시보드 지표 (분석 테이블 없을 때)
// ────────────────────────────────────

const IRMI_CATEGORIES = "('prices','employment','selfEmployed','finance','realEstate')";

/** 기사 날짜 범위 */
export function getArticleDateRange() {
  const db = getDb(true);
  return db
    .prepare(
      `SELECT MIN(published_at) as earliest, MAX(published_at) as latest
       FROM articles WHERE category IN ${IRMI_CATEGORIES}`
    )
    .get() as { earliest: string; latest: string };
}

/** 카테고리별 일별 기사 수 */
export function getDailyArticleCountsByCategory(dateFrom: string, dateTo: string) {
  const db = getDb(true);
  return db
    .prepare(
      `SELECT DATE(published_at) as date, category, COUNT(*) as count
       FROM articles
       WHERE category IN ${IRMI_CATEGORIES}
         AND published_at >= ? AND published_at < ?
       GROUP BY DATE(published_at), category
       ORDER BY date ASC`
    )
    .all(dateFrom, dateTo) as { date: string; category: string; count: number }[];
}

/** 카테고리별 기준 통계 (평균 일일 기사수) */
export function getCategoryBaselineStats(dateFrom: string, dateTo: string) {
  const db = getDb(true);
  return db
    .prepare(
      `SELECT category,
              COUNT(*) * 1.0 / MAX(1, JULIANDAY(?) - JULIANDAY(?)) as avg_daily,
              COUNT(*) as total
       FROM articles
       WHERE category IN ${IRMI_CATEGORIES}
         AND published_at >= ? AND published_at < ?
       GROUP BY category`
    )
    .all(dateTo, dateFrom, dateFrom, dateTo) as { category: string; avg_daily: number; total: number }[];
}

/** 댓글/반응 기반 상위 기사 (신호 대체) */
export function getTopEngagementArticles(dateFrom: string, dateTo: string, limit = 10) {
  const db = getDb(true);
  return db
    .prepare(
      `SELECT id, title, category, category_label, published_at,
              reply_count, like_count, keywords, summary,
              (COALESCE(reply_count, 0) + COALESCE(like_count, 0)) as engagement
       FROM articles
       WHERE category IN ${IRMI_CATEGORIES}
         AND published_at >= ? AND published_at < ?
         AND (COALESCE(reply_count, 0) + COALESCE(like_count, 0)) > 0
       ORDER BY engagement DESC
       LIMIT ?`
    )
    .all(dateFrom, dateTo, limit) as {
      id: string; title: string; category: string; category_label: string | null;
      published_at: string; reply_count: number; like_count: number;
      keywords: string | null; summary: string | null; engagement: number;
    }[];
}

/** 최근 고참여 기사의 키워드 추출 */
export function getTopKeywordsRecent(dateFrom: string, dateTo: string, limit = 200) {
  const db = getDb(true);
  const rows = db
    .prepare(
      `SELECT keywords
       FROM articles
       WHERE category IN ${IRMI_CATEGORIES}
         AND published_at >= ? AND published_at < ?
         AND keywords IS NOT NULL AND keywords != '[]'
       ORDER BY (COALESCE(reply_count, 0) + COALESCE(like_count, 0)) DESC
       LIMIT ?`
    )
    .all(dateFrom, dateTo, limit) as { keywords: string }[];

  const freq = new Map<string, number>();
  for (const row of rows) {
    try {
      const kws: string[] = JSON.parse(row.keywords);
      for (const kw of kws) {
        if (kw && kw.length >= 2) {
          freq.set(kw, (freq.get(kw) ?? 0) + 1);
        }
      }
    } catch { /* skip */ }
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([keyword, count]) => ({ keyword, count }));
}

/** 카테고리별 댓글 참여도 */
export function getCommentVolumeByCategory(dateFrom: string, dateTo: string) {
  const db = getDb(true);
  return db
    .prepare(
      `SELECT a.category,
              SUM(a.reply_count) as comment_count,
              AVG(a.reply_count) as avg_comments
       FROM articles a
       WHERE a.category IN ${IRMI_CATEGORIES}
         AND a.published_at >= ? AND a.published_at < ?
         AND a.reply_count > 0
       GROUP BY a.category`
    )
    .all(dateFrom, dateTo) as { category: string; comment_count: number; avg_comments: number }[];
}

/**
 * 분석 테이블 없이 기사 데이터만으로 대시보드 지표 계산
 * analysis_runs / dashboard_cache 가 비어있을 때 사용
 */
export function computeDashboardFromArticles(): {
  dashboard: import("@/lib/types").DashboardData;
  briefing: import("@/lib/types").BriefingData;
} | null {
  const db = getDb(true);

  // 기사 존재 여부 확인
  const count = (db.prepare(
    `SELECT COUNT(*) as c FROM articles WHERE category IN ${IRMI_CATEGORIES}`
  ).get() as { c: number }).c;
  if (count === 0) return null;

  const dateRange = getArticleDateRange();
  const latestDate = dateRange.latest.split(" ")[0]; // YYYY-MM-DD
  const latestDatePlusOne = addDays(latestDate, 1);

  // 기간 정의
  const recent7Start = addDays(latestDate, -6);
  const recent14Start = addDays(latestDate, -13);
  const prev7Start = addDays(latestDate, -13);
  const prev7End = addDays(latestDate, -6);
  const recent30Start = addDays(latestDate, -29);

  // 기준 통계 (최근 90일 기반)
  const baseline90Start = addDays(latestDate, -89);
  const baselineStats = getCategoryBaselineStats(baseline90Start, latestDatePlusOne);
  const baselineMap = new Map(baselineStats.map((b) => [b.category, b.avg_daily]));

  // 최근 7일 일별 기사수
  const recentDaily = getDailyArticleCountsByCategory(recent7Start, latestDatePlusOne);
  // 이전 7일 일별 기사수
  const prevDaily = getDailyArticleCountsByCategory(prev7Start, prev7End);

  // 카테고리별 최근 7일 평균
  const catKeys = ["prices", "employment", "selfEmployed", "finance", "realEstate"] as const;
  type CatKey = typeof catKeys[number];

  function sumByCategory(rows: { date: string; category: string; count: number }[], cat: string): number {
    return rows.filter((r) => r.category === cat).reduce((s, r) => s + r.count, 0);
  }

  // 댓글 참여도
  const commentVol = getCommentVolumeByCategory(recent30Start, latestDatePlusOne);
  const commentMap = new Map(commentVol.map((c) => [c.category, c.comment_count]));
  const totalComments = commentVol.reduce((s, c) => s + c.comment_count, 0);

  // 카테고리별 리스크 점수 계산
  const categoryRisks: Record<string, { score: number; trend: "rising" | "stable" | "falling"; articleCount: number }> = {};
  const scores: number[] = [];

  for (const cat of catKeys) {
    const recentSum = sumByCategory(recentDaily, cat);
    const prevSum = sumByCategory(prevDaily, cat);
    const recentAvg = recentSum / 7;
    const baselineAvg = baselineMap.get(cat) ?? 1;

    // 볼륨 이상치 기반 점수 (기준=50)
    const anomaly = (recentAvg - baselineAvg) / Math.max(1, baselineAvg);
    let score = Math.round(50 + anomaly * 50);

    // 댓글 참여도 보정 (+0~15)
    const catComments = commentMap.get(cat) ?? 0;
    const commentRatio = totalComments > 0 ? catComments / totalComments : 0.2;
    const expectedRatio = 0.2; // 5 categories, equal share
    if (commentRatio > expectedRatio) {
      score += Math.round((commentRatio - expectedRatio) * 50);
    }

    score = Math.max(0, Math.min(100, score));
    scores.push(score);

    // 추세
    const prevAvg = prevSum / 7;
    const trendPct = prevAvg > 0 ? (recentAvg - prevAvg) / prevAvg : 0;
    const trend = trendPct > 0.1 ? "rising" : trendPct < -0.1 ? "falling" : "stable";

    categoryRisks[cat] = { score, trend, articleCount: recentSum };
  }

  // 종합 점수 (가중 평균 - 기사량 비례)
  const totalArticles = Object.values(categoryRisks).reduce((s, c) => s + c.articleCount, 0);
  const overallScore = totalArticles > 0
    ? Math.round(
        catKeys.reduce((s, cat) => {
          const weight = categoryRisks[cat].articleCount / totalArticles;
          return s + categoryRisks[cat].score * weight;
        }, 0)
      )
    : 50;

  // 점수 히스토리 (최근 14일)
  const daily14 = getDailyArticleCountsByCategory(recent14Start, latestDatePlusOne);
  const dateSet = [...new Set(daily14.map((r) => r.date))].sort();
  const scoreHistory: { date: string; score: number }[] = [];
  const categoryScoreHistory: {
    date: string; prices: number; employment: number;
    selfEmployed: number; finance: number; realEstate: number; other: number;
  }[] = [];

  for (const d of dateSet) {
    const dayRows = daily14.filter((r) => r.date === d);
    let dayTotal = 0;
    let dayWeightedScore = 0;
    const dayCatScores: Record<string, number> = {};

    for (const cat of catKeys) {
      const dayCount = dayRows.find((r) => r.category === cat)?.count ?? 0;
      const bAvg = baselineMap.get(cat) ?? 1;
      const anom = (dayCount - bAvg) / Math.max(1, bAvg);
      const s = Math.max(0, Math.min(100, Math.round(50 + anom * 50)));
      dayCatScores[cat] = s;
      dayTotal += dayCount;
      dayWeightedScore += s * dayCount;
    }

    const dayOverall = dayTotal > 0 ? Math.round(dayWeightedScore / dayTotal) : 50;
    scoreHistory.push({ date: d, score: dayOverall });
    categoryScoreHistory.push({
      date: d,
      prices: dayCatScores["prices"] ?? 50,
      employment: dayCatScores["employment"] ?? 50,
      selfEmployed: dayCatScores["selfEmployed"] ?? 50,
      finance: dayCatScores["finance"] ?? 50,
      realEstate: dayCatScores["realEstate"] ?? 50,
      other: 0,
    });
  }

  // 인기 기사 -> 신호 대체
  const topArticles = getTopEngagementArticles(recent30Start, latestDatePlusOne, 6);
  const { getSeverityByScore } = require("@/lib/constants") as { getSeverityByScore: (s: number) => import("@/lib/types").Severity };

  const recentSignals: import("@/lib/types").SignalPreview[] = topArticles.map((a) => ({
    id: a.id,
    title: a.title,
    severity: getSeverityByScore(categoryRisks[a.category]?.score ?? 50),
    score: categoryRisks[a.category]?.score ?? 50,
    category: a.category as import("@/lib/types").CategoryKey,
    date: a.published_at,
  }));

  // 신호 통계
  const signalStats = { critical: 0, warning: 0, caution: 0, surging: 0 };
  for (const s of recentSignals) {
    if (s.severity === "critical") signalStats.critical++;
    else if (s.severity === "warning") signalStats.warning++;
    else if (s.severity === "caution") signalStats.caution++;
  }

  // 카테고리별 등급 분포 (기사 수 기반)
  const categoryDist: import("@/lib/types").CategorySeverityDist[] = catKeys.map((cat) => {
    const catRows = recentDaily.filter((r) => r.category === cat);
    const total = catRows.reduce((s, r) => s + r.count, 0);
    const score = categoryRisks[cat].score;
    // 기사 수를 등급별로 분배 (현재 카테고리 점수 기준)
    const severity = getSeverityByScore(score);
    return {
      category: cat as import("@/lib/types").CategoryKey,
      critical: severity === "critical" ? total : 0,
      warning: severity === "warning" ? total : 0,
      caution: severity === "caution" ? total : 0,
      safe: severity === "safe" ? total : 0,
      total,
    };
  });

  // 전일대비
  const prevOverall = scoreHistory.length >= 2
    ? scoreHistory[scoreHistory.length - 2].score
    : overallScore;
  const signalDelta = recentSignals.length > 0 ? 0 : null;

  // categories Record 구성
  const { CATEGORY_LABEL_MAP } = require("@/lib/constants") as { CATEGORY_LABEL_MAP: Record<string, string> };
  const categories: Record<string, import("@/lib/types").CategoryRisk> = {};
  for (const cat of catKeys) {
    const risk = categoryRisks[cat];
    categories[cat] = {
      label: CATEGORY_LABEL_MAP[cat] ?? cat,
      score: risk.score,
      trend: risk.trend,
      keyIssues: [],
      articleCount: risk.articleCount,
    };
  }
  // other 카테고리 기본값
  categories["other"] = { label: "기타", score: 0, trend: "stable", keyIssues: [] };

  // keyIssues 채우기: 카테고리별 상위 참여 기사 제목 활용
  const allTopArticles = getTopEngagementArticles(recent7Start, latestDatePlusOne, 50);
  for (const cat of catKeys) {
    const catArticles = allTopArticles.filter((a) => a.category === cat);
    // 상위 참여 기사 제목을 핵심 이슈로 사용 (30자 이내로 요약)
    categories[cat].keyIssues = catArticles
      .slice(0, 3)
      .map((a) => {
        const title = a.title.replace(/\[.*?\]/g, "").replace(/…/g, "").trim();
        return title.length > 30 ? title.slice(0, 28) + ".." : title;
      });
  }

  const dashboard: import("@/lib/types").DashboardData = {
    lastUpdated: dateRange.latest,
    overallScore,
    categories: categories as Record<import("@/lib/types").CategoryKey, import("@/lib/types").CategoryRisk>,
    signalStats,
    recentSignals,
    scoreHistory,
    categoryScoreHistory: categoryScoreHistory as import("@/lib/types").CategoryScoreHistoryEntry[],
    categoryDist,
    signalDelta,
    dailyDelta: null,
    runId: null,
  };

  // 브리핑 생성
  const sortedCats = [...catKeys].sort((a, b) => categoryRisks[b].score - categoryRisks[a].score);
  const topCat = sortedCats[0];
  const topCatLabel = CATEGORY_LABEL_MAP[topCat] ?? topCat;
  const topScore = categoryRisks[topCat].score;

  const highlights = sortedCats.slice(0, 3).map((cat) => ({
    category: cat as import("@/lib/types").CategoryKey,
    message: `${CATEGORY_LABEL_MAP[cat]} 분야 위기지수 ${categoryRisks[cat].score}점 (기사 ${categoryRisks[cat].articleCount}건, 추세: ${categoryRisks[cat].trend === "rising" ? "상승" : categoryRisks[cat].trend === "falling" ? "하락" : "보합"})`,
  }));

  const summaryParts = [
    `최근 7일간 민생 관련 뉴스 ${totalArticles}건이 감지되었습니다.`,
    `${topCatLabel} 분야가 위기지수 ${topScore}점으로 가장 높은 수준을 보이고 있습니다.`,
  ];

  const risingCats = sortedCats.filter((c) => categoryRisks[c].trend === "rising");
  if (risingCats.length > 0) {
    summaryParts.push(
      `${risingCats.map((c) => CATEGORY_LABEL_MAP[c]).join(", ")} 분야는 상승 추세로 주의가 필요합니다.`
    );
  }

  const briefing: import("@/lib/types").BriefingData = {
    generatedAt: dateRange.latest,
    summary: summaryParts.join(" "),
    highlights,
    recommendation: topScore >= 60
      ? `${topCatLabel} 분야의 기사량이 평소 대비 크게 증가하고 있어 관련 정책 동향과 민생 영향을 면밀히 모니터링할 필요가 있습니다.`
      : "현재 전반적으로 안정적인 수준이나 지속적인 모니터링이 필요합니다.",
    forecast: {
      period: "1w",
      outlook: risingCats.length > 0
        ? `${risingCats.map((c) => CATEGORY_LABEL_MAP[c]).join(", ")} 분야 상승 추세 지속 전망`
        : "전반적으로 안정적인 추세 유지 전망",
      scenarios: [],
    },
  };

  return { dashboard, briefing };
}

/** 날짜 문자열에 일수 더하기 */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ────────────────────────────────────
// 지역별 카테고리 점수 (카테고리 컬럼 포함)
// ────────────────────────────────────

export interface RegionWithCategoriesRow {
  run_id: string;
  id: string;
  name: string;
  score: number;
  trend: string | null;
  category_prices: number;
  category_employment: number;
  category_self_employed: number;
  category_finance: number;
  category_real_estate: number;
  top_issue: string | null;
}

/** 지역 목록 + 카테고리별 점수 포함 */
export function getRegionsWithCategories(runId?: string): RegionWithCategoriesRow[] {
  const db = getDb(true);

  const effectiveRunId = runId || (() => {
    const latest = getLatestCompletedRun();
    return latest?.id ?? "__legacy__";
  })();

  return db.prepare(
    `SELECT run_id, id, name, score, trend,
            category_prices, category_employment, category_self_employed,
            category_finance, category_real_estate, top_issue
     FROM regions WHERE run_id = ? ORDER BY score DESC`
  ).all(effectiveRunId) as RegionWithCategoriesRow[];
}

// ────────────────────────────────────
// 시드 데이터 자동 생성 (signals 비어있을 때)
// ────────────────────────────────────

/**
 * DB에 완료된 분석 회차가 없고 articles가 있으면
 * 기사 데이터 기반으로 signals, regions, 대시보드 스냅샷 등을 자동 생성한다.
 * 이미 데이터가 있으면 아무 작업도 하지 않는다.
 */
export function seedSignalDataIfEmpty(): string | null {
  const db = getDb();

  // 이미 완료된 분석 회차가 있으면 데이터 무결성 확인
  const existingRun = db.prepare(
    "SELECT id FROM analysis_runs WHERE status = 'completed' LIMIT 1"
  ).get() as { id: string } | undefined;

  if (existingRun) {
    const signalCount = (db.prepare(
      "SELECT COUNT(*) as c FROM signals WHERE run_id = ?"
    ).get(existingRun.id) as { c: number }).c;
    const regionCount = (db.prepare(
      "SELECT COUNT(*) as c FROM regions WHERE run_id = ?"
    ).get(existingRun.id) as { c: number }).c;

    if (signalCount > 0 && regionCount > 0) {
      return existingRun.id;
    }

    // 불완전 시드 감지: 관련 데이터 정리 후 재시드
    console.log(
      `[auto-seed] 불완전 시드 감지 (run: ${existingRun.id}, signals: ${signalCount}, regions: ${regionCount}). 정리 후 재시드...`,
    );
    db.prepare("DELETE FROM analysis_runs WHERE id = ?").run(existingRun.id);
    db.prepare("DELETE FROM category_details WHERE run_id = ?").run(existingRun.id);
    db.prepare("DELETE FROM dashboard_snapshots WHERE run_id = ?").run(existingRun.id);
    db.prepare("DELETE FROM signals WHERE run_id = ?").run(existingRun.id);
    db.prepare("DELETE FROM signal_articles WHERE run_id = ?").run(existingRun.id);
    db.prepare("DELETE FROM regions WHERE run_id = ?").run(existingRun.id);
    db.prepare("DELETE FROM score_history WHERE run_id = ?").run(existingRun.id);
    db.prepare("DELETE FROM dashboard_cache WHERE key IN ('dashboard', 'crisis_chain')").run();
  }

  // 기사가 없으면 시드 불가
  const articleCount = (db.prepare(
    `SELECT COUNT(*) as c FROM articles WHERE category IN ${IRMI_CATEGORIES}`
  ).get() as { c: number }).c;
  if (articleCount === 0) return null;

  console.log("[auto-seed] 분석 데이터가 없어 기사 기반 자동 시드를 시작합니다...");

  const CAT_KEYS = ["prices", "employment", "selfEmployed", "finance", "realEstate"] as const;
  type CatKey = (typeof CAT_KEYS)[number];

  const CAT_LABELS: Record<CatKey, string> = {
    prices: "물가",
    employment: "고용",
    selfEmployed: "자영업",
    finance: "금융",
    realEstate: "부동산",
  };

  const REGIONS_LIST = [
    { id: "seoul", name: "서울" },
    { id: "gyeonggi", name: "경기" },
    { id: "incheon", name: "인천" },
    { id: "busan", name: "부산" },
    { id: "daegu", name: "대구" },
    { id: "gwangju", name: "광주" },
    { id: "daejeon", name: "대전" },
    { id: "ulsan", name: "울산" },
    { id: "sejong", name: "세종" },
    { id: "gangwon", name: "강원" },
    { id: "chungbuk", name: "충북" },
    { id: "chungnam", name: "충남" },
    { id: "jeonbuk", name: "전북" },
    { id: "jeonnam", name: "전남" },
    { id: "gyeongbuk", name: "경북" },
    { id: "gyeongnam", name: "경남" },
    { id: "jeju", name: "제주" },
  ];

  function severityOf(score: number): string {
    if (score >= 80) return "critical";
    if (score >= 60) return "warning";
    if (score >= 40) return "caution";
    return "safe";
  }

  // 기준 날짜
  const { latest } = db.prepare(
    `SELECT MAX(published_at) as latest FROM articles WHERE category IN ${IRMI_CATEGORIES}`
  ).get() as { latest: string };

  const latestDate = latest.split(" ")[0];
  const latestPlus1 = addDays(latestDate, 1);
  const recent7Start = addDays(latestDate, -6);
  const recent30Start = addDays(latestDate, -29);
  const baseline90Start = addDays(latestDate, -89);

  // 기준선 통계
  const baselineRows = db.prepare(
    `SELECT category,
            COUNT(*) * 1.0 / MAX(1, JULIANDAY(?) - JULIANDAY(?)) as avg_daily,
            COUNT(*) as total
     FROM articles
     WHERE category IN ${IRMI_CATEGORIES}
       AND published_at >= ? AND published_at < ?
     GROUP BY category`
  ).all(latestPlus1, baseline90Start, baseline90Start, latestPlus1) as {
    category: string; avg_daily: number; total: number;
  }[];
  const baselineMap = new Map(baselineRows.map((b) => [b.category, b.avg_daily]));

  // 최근 7일 / 이전 7일 일별 기사수
  const recentDaily = db.prepare(
    `SELECT DATE(published_at) as date, category, COUNT(*) as count
     FROM articles
     WHERE category IN ${IRMI_CATEGORIES}
       AND published_at >= ? AND published_at < ?
     GROUP BY DATE(published_at), category
     ORDER BY date ASC`
  ).all(recent7Start, latestPlus1) as { date: string; category: string; count: number }[];

  const prev7Start = addDays(latestDate, -13);
  const prevDaily = db.prepare(
    `SELECT DATE(published_at) as date, category, COUNT(*) as count
     FROM articles
     WHERE category IN ${IRMI_CATEGORIES}
       AND published_at >= ? AND published_at < ?
     GROUP BY DATE(published_at), category
     ORDER BY date ASC`
  ).all(prev7Start, recent7Start) as { date: string; category: string; count: number }[];

  // 댓글 참여도
  const commentRows = db.prepare(
    `SELECT category, SUM(reply_count) as comment_count
     FROM articles
     WHERE category IN ${IRMI_CATEGORIES}
       AND published_at >= ? AND published_at < ?
       AND reply_count > 0
     GROUP BY category`
  ).all(recent30Start, latestPlus1) as { category: string; comment_count: number }[];
  const commentMap = new Map(commentRows.map((c) => [c.category, c.comment_count]));
  const totalComments = commentRows.reduce((s, c) => s + c.comment_count, 0);

  function sumByCat(rows: { category: string; count: number }[], cat: string): number {
    return rows.filter((r) => r.category === cat).reduce((s, r) => s + r.count, 0);
  }

  // 카테고리별 위기지수 계산
  const catRisks: Record<string, { score: number; trend: "rising" | "stable" | "falling"; articleCount: number; keyIssues: string[] }> = {};

  for (const cat of CAT_KEYS) {
    const recentSum = sumByCat(recentDaily, cat);
    const prevSum = sumByCat(prevDaily, cat);
    const recentAvg = recentSum / 7;
    const baselineAvg = baselineMap.get(cat) ?? 1;

    const anomaly = (recentAvg - baselineAvg) / Math.max(1, baselineAvg);
    let score = Math.round(50 + anomaly * 50);

    const catComments = commentMap.get(cat) ?? 0;
    const commentRatio = totalComments > 0 ? catComments / totalComments : 0.2;
    if (commentRatio > 0.2) {
      score += Math.round((commentRatio - 0.2) * 50);
    }
    score = Math.max(0, Math.min(100, score));

    const prevAvg = prevSum / 7;
    const trendPct = prevAvg > 0 ? (recentAvg - prevAvg) / prevAvg : 0;
    const trend = trendPct > 0.1 ? "rising" as const : trendPct < -0.1 ? "falling" as const : "stable" as const;

    const topArts = db.prepare(
      `SELECT title FROM articles
       WHERE category = ? AND published_at >= ? AND published_at < ?
         AND (COALESCE(reply_count, 0) + COALESCE(like_count, 0)) > 0
       ORDER BY (COALESCE(reply_count, 0) + COALESCE(like_count, 0)) DESC
       LIMIT 3`
    ).all(cat, recent7Start, latestPlus1) as { title: string }[];

    const keyIssues = topArts.map((a) => {
      const t = a.title.replace(/\[.*?\]/g, "").replace(/\u2026/g, "").trim();
      return t.length > 30 ? t.slice(0, 28) + ".." : t;
    });

    catRisks[cat] = { score, trend, articleCount: recentSum, keyIssues };
  }

  // 종합 점수
  const totalArticles = Object.values(catRisks).reduce((s, c) => s + c.articleCount, 0);
  const overallScore = totalArticles > 0
    ? Math.round(CAT_KEYS.reduce((s, cat) => s + catRisks[cat].score * catRisks[cat].articleCount / totalArticles, 0))
    : 50;
  const overallSeverity = severityOf(overallScore);

  // 트랜잭션으로 시드 데이터 생성
  const seed = db.transaction(() => {
    const RUN_ID = "seed_" + latestDate.replace(/-/g, "");

    // 1. analysis_runs
    db.prepare("DELETE FROM analysis_runs WHERE id = ?").run(RUN_ID);
    db.prepare(
      `INSERT INTO analysis_runs
         (id, run_date, started_at, completed_at, status,
          overall_score, overall_severity, summary,
          prices, employment, self_employed, finance, real_estate,
          articles_total, articles_analyzed)
       VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      RUN_ID, latestDate,
      `${latestDate}T00:00:00Z`, `${latestDate}T23:59:59Z`,
      overallScore, overallSeverity,
      `최근 7일간 민생 관련 뉴스 ${totalArticles}건 분석 결과, 종합 민생위기 지수 ${overallScore}점(${overallSeverity === "warning" ? "주의" : overallSeverity === "critical" ? "긴급" : overallSeverity === "caution" ? "관찰" : "안전"}).`,
      catRisks.prices.score, catRisks.employment.score,
      catRisks.selfEmployed.score, catRisks.finance.score, catRisks.realEstate.score,
      totalArticles, totalArticles,
    );

    // 2. category_details
    db.prepare("DELETE FROM category_details WHERE run_id = ?").run(RUN_ID);
    for (const cat of CAT_KEYS) {
      const r = catRisks[cat];
      const sev = severityOf(r.score);
      db.prepare(
        `INSERT INTO category_details
           (run_id, category, score, trend, article_count, critical_count, warning_count, key_issues)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        RUN_ID, cat, r.score, r.trend, r.articleCount,
        sev === "critical" ? r.articleCount : 0,
        sev === "warning" ? r.articleCount : 0,
        JSON.stringify(r.keyIssues),
      );
    }

    // 3. signals (상위 참여 기사 -> 신호)
    db.prepare("DELETE FROM signals WHERE run_id = ?").run(RUN_ID);
    db.prepare("DELETE FROM signal_articles WHERE run_id = ?").run(RUN_ID);

    const topEngagement = db.prepare(
      `SELECT id, title, summary, category, category_label, published_at, reply_count, like_count,
              (COALESCE(reply_count, 0) + COALESCE(like_count, 0)) as engagement
       FROM articles
       WHERE category IN ${IRMI_CATEGORIES}
         AND published_at >= ? AND published_at < ?
         AND (COALESCE(reply_count, 0) + COALESCE(like_count, 0)) > 0
       ORDER BY engagement DESC
       LIMIT 30`
    ).all(recent30Start, latestPlus1) as {
      id: string; title: string; summary: string | null; category: string;
      category_label: string | null; published_at: string;
      reply_count: number; like_count: number; engagement: number;
    }[];

    const insertSignal = db.prepare(
      `INSERT INTO signals
         (id, run_id, title, description, severity, score, category, category_label,
          region, detected_at, evidence, cause, impact, action_points)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertSigArt = db.prepare(
      `INSERT OR IGNORE INTO signal_articles (signal_id, run_id, article_id) VALUES (?, ?, ?)`
    );

    for (const art of topEngagement) {
      const catScore = catRisks[art.category as CatKey]?.score ?? 50;
      const severity = severityOf(catScore);
      const signalId = `sig_${art.id}`;
      const desc = art.summary
        ? (art.summary.length > 200 ? art.summary.slice(0, 198) + ".." : art.summary)
        : art.title;

      insertSignal.run(
        signalId, RUN_ID, art.title, desc,
        severity, catScore,
        art.category, art.category_label ?? CAT_LABELS[art.category as CatKey] ?? "",
        null, art.published_at,
        JSON.stringify([`댓글 ${art.reply_count}건, 반응 ${art.like_count}건`]),
        `${CAT_LABELS[art.category as CatKey] ?? art.category} 분야 주요 이슈`,
        `댓글 ${art.reply_count}건의 높은 관심`,
        JSON.stringify(["관련 동향 모니터링", "정책 대응 검토"]),
      );
      insertSigArt.run(signalId, RUN_ID, art.id);
    }

    // 4. analysis (상위 참여 기사 분석 결과)
    const insertAnalysis = db.prepare(
      `INSERT OR IGNORE INTO analysis
         (article_id, risk_score, severity, key_factors, impact_region, ai_summary, analyzed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    const analyzableArticles = db.prepare(
      `SELECT id, title, summary, category, published_at, reply_count, like_count
       FROM articles
       WHERE category IN ${IRMI_CATEGORIES}
         AND published_at >= ? AND published_at < ?
         AND (COALESCE(reply_count, 0) + COALESCE(like_count, 0)) > 0
       ORDER BY (COALESCE(reply_count, 0) + COALESCE(like_count, 0)) DESC
       LIMIT 200`
    ).all(recent30Start, latestPlus1) as {
      id: string; title: string; summary: string | null;
      category: string; published_at: string;
      reply_count: number; like_count: number;
    }[];

    for (const art of analyzableArticles) {
      const catScore = catRisks[art.category as CatKey]?.score ?? 50;
      const engagement = (art.reply_count ?? 0) + (art.like_count ?? 0);
      const engBoost = Math.min(20, Math.round(engagement / 20));
      const riskScore = Math.max(0, Math.min(100, catScore + engBoost));
      const severity = severityOf(riskScore);

      insertAnalysis.run(
        art.id, riskScore, severity,
        JSON.stringify([CAT_LABELS[art.category as CatKey] ?? art.category]),
        null, art.summary ?? art.title, art.published_at,
      );
    }

    // 5. score_history (최근 30일)
    db.prepare("DELETE FROM score_history").run();

    const daily30 = db.prepare(
      `SELECT DATE(published_at) as date, category, COUNT(*) as count
       FROM articles
       WHERE category IN ${IRMI_CATEGORIES}
         AND published_at >= ? AND published_at < ?
       GROUP BY DATE(published_at), category
       ORDER BY date ASC`
    ).all(recent30Start, latestPlus1) as { date: string; category: string; count: number }[];

    const dates30 = [...new Set(daily30.map((r) => r.date))].sort();
    const insertHistory = db.prepare(
      `INSERT OR REPLACE INTO score_history
         (date, overall_score, prices, employment, self_employed, finance, real_estate, run_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const d of dates30) {
      const dayRows = daily30.filter((r) => r.date === d);
      let dayTotal = 0;
      let dayWeighted = 0;
      const dayCatScores: Record<string, number> = {};

      for (const cat of CAT_KEYS) {
        const dayCount = dayRows.find((r) => r.category === cat)?.count ?? 0;
        const bAvg = baselineMap.get(cat) ?? 1;
        const anom = (dayCount - bAvg) / Math.max(1, bAvg);
        const s = Math.max(0, Math.min(100, Math.round(50 + anom * 50)));
        dayCatScores[cat] = s;
        dayTotal += dayCount;
        dayWeighted += s * dayCount;
      }

      const dayOverall = dayTotal > 0 ? Math.round(dayWeighted / dayTotal) : 50;
      insertHistory.run(
        d, dayOverall,
        dayCatScores["prices"] ?? 50,
        dayCatScores["employment"] ?? 50,
        dayCatScores["selfEmployed"] ?? 50,
        dayCatScores["finance"] ?? 50,
        dayCatScores["realEstate"] ?? 50,
        RUN_ID,
      );
    }

    // 6. regions (17개 시도)
    db.prepare("DELETE FROM regions WHERE run_id = ?").run(RUN_ID);

    const insertRegion = db.prepare(
      `INSERT INTO regions
         (run_id, id, name, score, trend,
          category_prices, category_employment, category_self_employed,
          category_finance, category_real_estate, top_issue, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (let i = 0; i < REGIONS_LIST.length; i++) {
      const region = REGIONS_LIST[i];
      const regionSeed = region.name.charCodeAt(0) + region.name.charCodeAt(1);
      const variation = ((regionSeed % 30) - 15);
      const regionScore = Math.max(10, Math.min(90, overallScore + variation));
      const trend = variation > 5 ? "rising" : variation < -5 ? "falling" : "stable";

      const catScoresRegion: Record<string, number> = {};
      for (const cat of CAT_KEYS) {
        const catVar = ((regionSeed + cat.charCodeAt(0)) % 20) - 10;
        catScoresRegion[cat] = Math.max(5, Math.min(95, catRisks[cat].score + catVar));
      }

      const topIssue = db.prepare(
        `SELECT title FROM articles
         WHERE category IN ${IRMI_CATEGORIES}
           AND published_at >= ? AND published_at < ?
           AND (COALESCE(reply_count, 0) + COALESCE(like_count, 0)) > 0
         ORDER BY (COALESCE(reply_count, 0) + COALESCE(like_count, 0)) DESC
         LIMIT 1 OFFSET ?`
      ).get(recent7Start, latestPlus1, i) as { title: string } | undefined;

      insertRegion.run(
        RUN_ID, region.id, region.name,
        regionScore, trend,
        catScoresRegion["prices"], catScoresRegion["employment"],
        catScoresRegion["selfEmployed"], catScoresRegion["finance"],
        catScoresRegion["realEstate"],
        topIssue?.title?.slice(0, 50) ?? null,
        `${latestDate}T23:59:59Z`,
      );
    }

    // 7. dashboard_snapshots
    db.prepare("DELETE FROM dashboard_snapshots WHERE run_id = ?").run(RUN_ID);

    const dashboardPayload = {
      updatedAt: `${latestDate}T23:59:59Z`,
      overallScore,
      categories: CAT_KEYS.map((cat) => ({
        category: cat,
        label: CAT_LABELS[cat],
        score: catRisks[cat].score,
        trend: catRisks[cat].trend,
        keyIssues: catRisks[cat].keyIssues,
        articleCount: catRisks[cat].articleCount,
      })),
      signals: {
        total: topEngagement.length,
        critical: topEngagement.filter((a) => severityOf(catRisks[a.category as CatKey]?.score ?? 50) === "critical").length,
        warning: topEngagement.filter((a) => severityOf(catRisks[a.category as CatKey]?.score ?? 50) === "warning").length,
      },
      summary: `최근 7일간 민생 관련 뉴스 ${totalArticles}건 분석 결과, 종합 민생위기 지수 ${overallScore}점.`,
      keyRisks: [...CAT_KEYS]
        .sort((a, b) => catRisks[b].score - catRisks[a].score)
        .slice(0, 3)
        .map((cat) => `${CAT_LABELS[cat]} 분야 위기지수 ${catRisks[cat].score}점 (기사 ${catRisks[cat].articleCount}건)`),
      outlook: catRisks.prices.score >= 60
        ? `${CAT_LABELS.prices} 분야 기사량 증가에 따른 정책 동향 모니터링이 필요합니다.`
        : "현재 전반적으로 안정적인 수준이나 지속적인 모니터링이 필요합니다.",
    };

    db.prepare(
      `INSERT INTO dashboard_snapshots (run_id, cache_key, data) VALUES (?, 'dashboard', ?)`
    ).run(RUN_ID, JSON.stringify(dashboardPayload));

    db.prepare(
      `INSERT OR REPLACE INTO dashboard_cache (key, value, updated_at)
       VALUES ('dashboard', ?, datetime('now'))`
    ).run(JSON.stringify(dashboardPayload));

    // crisis_chain 스냅샷
    const crisisChainPayload = {
      nodes: CAT_KEYS.map((cat) => ({ id: cat, label: CAT_LABELS[cat], score: catRisks[cat].score })),
      edges: [
        { from: "prices", to: "selfEmployed", label: "원가 상승 -> 자영업 타격", strength: catRisks.prices.score >= 60 ? "strong" : "moderate" },
        { from: "prices", to: "finance", label: "물가 상승 -> 가계부채 증가", strength: "moderate" },
        { from: "employment", to: "finance", label: "고용 불안 -> 소득 감소", strength: catRisks.employment.score >= 60 ? "strong" : "moderate" },
        { from: "finance", to: "realEstate", label: "금리 부담 -> 부동산 시장", strength: "moderate" },
        { from: "realEstate", to: "finance", label: "부동산 하락 -> 가계자산 감소", strength: "weak" },
        { from: "selfEmployed", to: "employment", label: "폐업 증가 -> 실업 증가", strength: "moderate" },
      ],
      chains: [
        { id: "chain_1", name: "물가-자영업 연쇄", description: "물가 상승이 원가 부담을 높여 자영업 경영난 심화", path: ["prices", "selfEmployed"], currentlyActive: catRisks.prices.score >= 55 && catRisks.selfEmployed.score >= 40 },
        { id: "chain_2", name: "고용-금융-부동산 연쇄", description: "고용 불안이 소득 감소를 유발하고 가계부채와 부동산 시장에 영향", path: ["employment", "finance", "realEstate"], currentlyActive: catRisks.employment.score >= 50 },
      ],
    };

    db.prepare(
      `INSERT INTO dashboard_snapshots (run_id, cache_key, data) VALUES (?, 'crisis_chain', ?)`
    ).run(RUN_ID, JSON.stringify(crisisChainPayload));

    db.prepare(
      `INSERT OR REPLACE INTO dashboard_cache (key, value, updated_at)
       VALUES ('crisis_chain', ?, datetime('now'))`
    ).run(JSON.stringify(crisisChainPayload));

    console.log(`[auto-seed] 완료! run_id: ${RUN_ID}, signals: ${topEngagement.length}, regions: ${REGIONS_LIST.length}`);
    return RUN_ID;
  });

  try {
    return seed();
  } catch (err) {
    console.error("[auto-seed] 실패:", err);
    return null;
  }
}

// ────────────────────────────────────
// 이머징이슈 탐지 (7일 공백 후 재출현)
// ────────────────────────────────────

export interface EmergingIssueRow {
  original_category_code: string;
  original_category_name: string;
  category: string;
  article_count: number;
  gap_days: number;
  sample_title: string;
  avg_risk_score: number | null;
}

interface EmergingSubcategoryParams {
  /** 기준일 (미지정 시 데이터 최신일) */
  baseDate?: string;
  /** 공백 기간 (일) */
  gapDays?: number;
  /** 최소 관련도 점수 (데이터 자체 속성 기반 품질 필터) */
  minRelevance?: number;
  /** 소분류당 최소 기사 수 */
  minArticles?: number;
  /** 최대 반환 건수 */
  limit?: number;
}

/**
 * 기준일에 등장했지만 직전 N일간 없었던 소분류+카테고리 조합 탐지
 *
 * 노이즈 제거는 articles.relevance_score(기사-카테고리 관련도)로 처리.
 * 제목 패턴 등 특정 데이터에 종속된 필터는 사용하지 않는다.
 */
export function getEmergingBySubcategory(
  baseDateOrParams?: string | EmergingSubcategoryParams,
  gapDaysArg = 7,
  limitArg = 10,
): EmergingIssueRow[] {
  const db = getDb(true);

  // 파라미터 정규화 (기존 호출 호환)
  const params: Required<EmergingSubcategoryParams> = typeof baseDateOrParams === "object" && baseDateOrParams !== null
    ? {
        baseDate: baseDateOrParams.baseDate ?? "",
        gapDays: baseDateOrParams.gapDays ?? 7,
        minRelevance: baseDateOrParams.minRelevance ?? 3,
        minArticles: baseDateOrParams.minArticles ?? 2,
        limit: baseDateOrParams.limit ?? 10,
      }
    : {
        baseDate: baseDateOrParams ?? "",
        gapDays: gapDaysArg,
        minRelevance: 3,
        minArticles: 2,
        limit: limitArg,
      };

  // 기준일 미지정 시 데이터 최신일 사용
  const effectiveDate = params.baseDate || (
    db.prepare("SELECT MAX(DATE(published_at)) as d FROM articles").get() as { d: string }
  ).d;

  const sql = `
    WITH today_topics AS (
      SELECT
        a.original_category_code,
        a.original_category_name,
        a.category,
        COUNT(*) as article_count,
        (SELECT a2.title FROM articles a2
         WHERE a2.original_category_code = a.original_category_code
           AND a2.category = a.category
           AND DATE(a2.published_at) = ?
           AND a2.relevance_score >= ?
         ORDER BY a2.relevance_score DESC LIMIT 1) as sample_title,
        (SELECT AVG(an.risk_score) FROM analysis an
         JOIN articles a3 ON a3.id = an.article_id
         WHERE a3.original_category_code = a.original_category_code
           AND a3.category = a.category
           AND DATE(a3.published_at) = ?) as avg_risk_score
      FROM articles a
      WHERE DATE(a.published_at) = ?
        AND a.category != 'other'
        AND a.original_category_code IS NOT NULL
        AND a.original_category_code != ''
        AND a.relevance_score >= ?
      GROUP BY a.original_category_code, a.original_category_name, a.category
      HAVING COUNT(*) >= ?
    ),
    gap_topics AS (
      SELECT DISTINCT original_category_code, category
      FROM articles
      WHERE DATE(published_at) BETWEEN date(?, '-' || ? || ' days') AND date(?, '-1 day')
        AND category != 'other'
        AND relevance_score >= ?
    )
    SELECT
      t.original_category_code,
      t.original_category_name,
      t.category,
      t.article_count,
      ? as gap_days,
      t.sample_title,
      t.avg_risk_score
    FROM today_topics t
    LEFT JOIN gap_topics g
      ON t.original_category_code = g.original_category_code
      AND t.category = g.category
    WHERE g.original_category_code IS NULL
    ORDER BY t.article_count DESC
    LIMIT ?
  `;

  return db.prepare(sql).all(
    effectiveDate, params.minRelevance,
    effectiveDate,
    effectiveDate, params.minRelevance,
    params.minArticles,
    effectiveDate, params.gapDays, effectiveDate, params.minRelevance,
    params.gapDays,
    params.limit,
  ) as EmergingIssueRow[];
}

/**
 * 카테고리별 기사 볼륨 급등 탐지
 * 기준일 기사 수가 직전 N일 일평균 대비 threshold배 이상인 카테고리
 */
export function getCategoryVolumeSpikes(
  baseDate?: string,
  gapDays = 7,
  threshold = 2.0,
): { category: string; today_count: number; daily_avg: number; spike_ratio: number }[] {
  const db = getDb(true);

  const effectiveDate = baseDate ?? (
    db.prepare("SELECT MAX(DATE(published_at)) as d FROM articles").get() as { d: string }
  ).d;

  const sql = `
    WITH recent AS (
      SELECT category, COUNT(*) as cnt
      FROM articles
      WHERE DATE(published_at) = ?
        AND category != 'other'
      GROUP BY category
    ),
    baseline AS (
      SELECT category, COUNT(*) * 1.0 / ? as daily_avg
      FROM articles
      WHERE DATE(published_at) BETWEEN date(?, '-' || ? || ' days') AND date(?, '-1 day')
        AND category != 'other'
      GROUP BY category
    )
    SELECT
      r.category,
      r.cnt as today_count,
      COALESCE(b.daily_avg, 0) as daily_avg,
      CASE WHEN COALESCE(b.daily_avg, 0) > 0
        THEN r.cnt * 1.0 / b.daily_avg
        ELSE 999.0
      END as spike_ratio
    FROM recent r
    LEFT JOIN baseline b ON r.category = b.category
    WHERE COALESCE(b.daily_avg, 0) < 1
       OR (r.cnt * 1.0 / NULLIF(b.daily_avg, 0)) >= ?
    ORDER BY spike_ratio DESC
  `;

  return db.prepare(sql).all(
    effectiveDate,
    gapDays,
    effectiveDate, gapDays, effectiveDate,
    threshold,
  ) as { category: string; today_count: number; daily_avg: number; spike_ratio: number }[];
}
