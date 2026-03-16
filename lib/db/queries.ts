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

/** 점수 히스토리 조회 (최근 N일) */
export function getScoreHistory(days?: number): ScoreHistoryRow[] {
  const db = getDb(true);
  if (days) {
    return db
      .prepare(
        `SELECT * FROM score_history
         WHERE date >= date('now', '-' || ? || ' days')
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
