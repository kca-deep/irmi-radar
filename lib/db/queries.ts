/**
 * 프로덕션 쿼리 함수 모음
 * 서버 컴포넌트 / API Route에서 호출
 */
import type { CategoryKey, Severity } from "@/lib/types";
import { getDb } from "./index";

// ────────────────────────────────────
// 기사 조회
// ────────────────────────────────────

interface ArticleListParams {
  category?: CategoryKey;
  severity?: Severity;
  region?: string;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
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

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;

  // 키워드 검색이 있으면 FTS 사용
  if (params.keyword) {
    const ftsQuery = params.keyword
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => `"${w}"`)
      .join(" OR ");

    const sql = `
      SELECT a.*, an.risk_score, an.severity AS analysis_severity, an.ai_summary
      FROM articles a
      LEFT JOIN analysis an ON a.id = an.article_id
      WHERE a.rowid IN (
        SELECT rowid FROM articles_fts WHERE articles_fts MATCH ?
      )
      ${conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : ""}
      ORDER BY a.published_at DESC
      LIMIT ? OFFSET ?
    `;
    return db.prepare(sql).all(ftsQuery, ...bindings, limit, offset);
  }

  const sql = `
    SELECT a.*, an.risk_score, an.severity AS analysis_severity, an.ai_summary
    FROM articles a
    LEFT JOIN analysis an ON a.id = an.article_id
    ${where}
    ORDER BY a.published_at DESC
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

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `SELECT COUNT(*) as count FROM articles a ${where}`;
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

// ────────────────────────────────────
// 신호 조회
// ────────────────────────────────────

interface SignalListParams {
  category?: CategoryKey;
  severity?: Severity;
  region?: string;
  limit?: number;
  offset?: number;
}

/** 신호 목록 (필터 + 페이지네이션) */
export function getSignals(params: SignalListParams = {}) {
  const db = getDb(true);
  const conditions: string[] = [];
  const bindings: (string | number)[] = [];

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
           (SELECT COUNT(*) FROM signal_articles sa WHERE sa.signal_id = s.id) as related_article_count
    FROM signals s
    ${where}
    ORDER BY s.score DESC, s.detected_at DESC
    LIMIT ? OFFSET ?
  `;
  return db.prepare(sql).all(...bindings, limit, offset);
}

/** 신호에 연결된 기사 목록 */
export function getSignalArticles(signalId: string) {
  const db = getDb(true);
  return db
    .prepare(
      `SELECT a.*, an.risk_score, an.severity AS analysis_severity, an.ai_summary
       FROM articles a
       JOIN signal_articles sa ON a.id = sa.article_id
       LEFT JOIN analysis an ON a.id = an.article_id
       WHERE sa.signal_id = ?
       ORDER BY a.published_at DESC`
    )
    .all(signalId);
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

/** 전체 지역 목록 (점수순) */
export function getRegions() {
  const db = getDb(true);
  return db.prepare("SELECT * FROM regions ORDER BY score DESC").all();
}

/** 지역 단건 조회 */
export function getRegionById(id: string) {
  const db = getDb(true);
  return db.prepare("SELECT * FROM regions WHERE id = ?").get(id);
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
