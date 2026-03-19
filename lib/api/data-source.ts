/**
 * 데이터 소스 통합 모듈
 * DATA_SOURCE 환경변수에 따라 mock JSON / SQLite DB 분기
 *
 * mock: data/mock/*.json (프로토타입)
 * db:   data/irmi.db (해커톤 운영)
 */

import type {
  DashboardData,
  DashboardDataSource,
  DashboardMeta,
  DataFreshness,
  DailyDelta,
  BriefingData,
  CrisisChainData,
  Signal,
  SignalPreview,
  CategoryRisk,
  NewsArticle,
  Policy,
  ChatData,
  CategoryKey,
  Severity,
  ArticleDailyStat,
} from "@/lib/types";

import { CATEGORIES } from "@/lib/constants";
import * as mock from "./mock-data";

type DataSource = "mock" | "db";

// ── 인메모리 캐시 (dev 새로고침 + 프로덕션 cold start 최적화) ──
const _cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 10_000; // 10초

function cached<T>(key: string, fn: () => T): T {
  const entry = _cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data as T;
  const data = fn();
  _cache.set(key, { data, ts: Date.now() });
  return data;
}

/** 분석 완료 시 호출하여 캐시 무효화 */
export function invalidateDataCache() {
  _cache.clear();
}

export function getDataSource(): DataSource {
  const env = process.env.DATA_SOURCE;
  if (env === "db") return "db";
  return "mock";
}

function isDb(): boolean {
  return getDataSource() === "db";
}

/** DB 모드에서 분석 결과가 없을 때 반환할 빈 대시보드 */
function emptyDashboard(): DashboardData {
  const now = new Date().toISOString();
  return {
    lastUpdated: now,
    overallScore: 0,
    categories: Object.fromEntries(
      CATEGORIES.map((c) => [
        c.key,
        {
          label: c.label,
          score: 0,
          trend: "stable" as const,
          keyIssues: [],
          isAnalyzed: false,
        },
      ]),
    ) as unknown as Record<CategoryKey, CategoryRisk>,
    signalStats: { critical: 0, warning: 0, caution: 0, surging: 0 },
    recentSignals: [],
    scoreHistory: [],
    categoryScoreHistory: [],
    categoryDist: [],
    signalDelta: null,
    dailyDelta: null,
    runId: null,
  };
}

/** DB 모드에서 분석 결과가 없을 때 반환할 빈 브리핑 */
function emptyBriefing(): BriefingData {
  return {
    generatedAt: new Date().toISOString(),
    summary: "",
    highlights: [],
    recommendation: "",
    forecast: { scenarios: [], period: "1m", outlook: "" },
  };
}

/** 데이터 신선도 판정 (마지막 분석 시점 기준) */
function calcFreshness(lastUpdated: string): DataFreshness {
  const hours = (Date.now() - new Date(lastUpdated).getTime()) / 3_600_000;
  if (hours < 6) return "fresh";
  if (hours < 24) return "aging";
  return "stale";
}

/** 메타데이터 생성 헬퍼 */
function makeMeta(
  source: DashboardDataSource,
  runId: string | null,
  generatedAt: string,
  analyzedCategories?: CategoryKey[],
): DashboardMeta {
  return {
    source,
    runId,
    generatedAt,
    freshness: calcFreshness(generatedAt),
    analyzedCategories: analyzedCategories ?? CATEGORIES.map((c) => c.key),
  };
}

// ── DB 행 → 타입 변환 헬퍼 ──

interface ArticleRow {
  id: string;
  title: string;
  summary: string | null;
  content: string | null;
  category: string;
  category_label: string | null;
  original_category_code: string | null;
  original_category_name: string | null;
  middle_category_code: string | null;
  middle_category_name: string | null;
  keywords: string | null;
  published_at: string;
  region: string | null;
  url: string | null;
  writer: string | null;
  relevance_score: number | null;
  thumbnail_url: string | null;
  risk_score?: number | null;
  analysis_severity?: string | null;
  ai_summary?: string | null;
  key_factors?: string | null;
  impact_region?: string | null;
}

function toNewsArticle(row: ArticleRow): NewsArticle {
  let keywords: string[] = [];
  if (row.keywords) {
    try {
      keywords = JSON.parse(row.keywords);
    } catch {
      keywords = [];
    }
  }

  return {
    id: row.id,
    title: row.title,
    summary: row.summary || "",
    category: row.category as CategoryKey,
    categoryLabel: row.category_label || "",
    keywords,
    publishedAt: row.published_at,
    section: row.original_category_name || "",
    content: row.content || undefined,
    source: row.writer || undefined,
    region: row.region || undefined,
    url: row.url || undefined,
    thumbnailUrl: row.thumbnail_url || undefined,
    analysis: row.risk_score != null
      ? {
          riskScore: row.risk_score,
          severity: (row.analysis_severity || "safe") as Severity,
          keyFactors: (() => {
            try { return JSON.parse(row.key_factors || "[]"); }
            catch { return []; }
          })(),
          relatedCategories: [],
          impactRegion: row.impact_region || undefined,
          summary: row.ai_summary || "",
        }
      : undefined,
  };
}

// ── DB 행 → Signal 변환 헬퍼 ──

interface SignalRow {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  score: number;
  category: string;
  category_label: string | null;
  region: string | null;
  detected_at: string | null;
  evidence: string | null;
  cause: string | null;
  impact: string | null;
  action_points: string | null;
}

function toSignal(row: SignalRow): Signal {
  let evidence: string[] = [];
  try { evidence = JSON.parse(row.evidence || "[]"); } catch { /* skip */ }

  let actionPoints: string[] = [];
  try { actionPoints = JSON.parse(row.action_points || "[]"); } catch { /* skip */ }

  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    severity: row.severity as Severity,
    score: row.score,
    category: row.category as CategoryKey,
    categoryLabel: row.category_label || "",
    region: row.region || "",
    relatedArticleIds: [],
    detectedAt: row.detected_at || "",
    evidence,
    analysis: {
      cause: row.cause || "",
      impact: row.impact || "",
      actionPoints,
    },
  };
}

function loadSignalArticleIds(signalId: string): string[] {
  try {
    const { getSignalArticles } = require("@/lib/db/queries");
    const rows = getSignalArticles(signalId) as { id: string }[];
    return rows.map((r) => r.id);
  } catch {
    return [];
  }
}

// ── Dashboard ──

/** overallScore만 경량 조회 (signals 페이지용 - loadDashboard 12+ 쿼리 대신 2-3개만) */
export function loadOverallScore(): number {
  if (isDb()) {
    try {
      const {
        getDashboardCache,
        getLatestCompletedRun,
        getLatestDashboardSnapshot,
      } = require("@/lib/db/queries");

      const latestRun = getLatestCompletedRun();
      if (latestRun?.id) {
        const snapshot = getLatestDashboardSnapshot("dashboard");
        if (snapshot) {
          const data = JSON.parse(snapshot.data);
          return data.overallScore ?? 0;
        }
      }
      const cached = getDashboardCache("dashboard") as string | null;
      if (cached) return JSON.parse(cached).overallScore ?? 0;
      return 0;
    } catch {
      return 0;
    }
  }
  return mock.loadDashboard().overallScore;
}

export function loadDashboard(): DashboardData {
  return cached("dashboard", _loadDashboardImpl);
}

function _loadDashboardImpl(): DashboardData {
  if (isDb()) {
    try {
      const {
        getDashboardCache,
        getLatestCompletedRun,
        getLatestDashboardSnapshot,
        getSignals: dbGetSignals,
        getScoreHistory,
        getCategorySeverityDistribution,
        getSignalCountByDate,
        getArticles: dbGetArticles,
      } = require("@/lib/db/queries");

      // 최신 완료 회차 조회
      const latestRun = getLatestCompletedRun();
      const runId = latestRun?.id ?? null;

      // 스냅샷 우선, 없으면 레거시 캐시
      let cached: string | null = null;
      if (runId) {
        const snapshot = getLatestDashboardSnapshot("dashboard");
        if (snapshot) cached = snapshot.data;
      }
      if (!cached) {
        cached = getDashboardCache("dashboard") as string | null;
      }

      if (cached) {
        const data = JSON.parse(cached);
        // dashboard_cache → DashboardData 변환
        const categories: Record<string, CategoryRisk> = {};
        const analyzedCategoryKeys: CategoryKey[] = [];
        for (const cat of (data.categories || [])) {
          categories[cat.category] = {
            label: cat.label,
            score: cat.score,
            trend: cat.trend || "stable",
            keyIssues: cat.keyIssues || [],
            articleCount: cat.articleCount ?? undefined,
            isAnalyzed: true,
          };
          analyzedCategoryKeys.push(cat.category as CategoryKey);
        }

        // 누락된 카테고리: 이전 회차 점수 유지, 없으면 기본값 (isAnalyzed=false)
        let prevCategoryScores: Record<string, { score: number; trend: string; keyIssues: string[] }> | null = null;
        if (analyzedCategoryKeys.length < CATEGORIES.length && runId) {
          try {
            const { getPreviousCompletedRun, getCategoryDetailsByRunId } = require("@/lib/db/queries");
            const prevRun = getPreviousCompletedRun(runId);
            if (prevRun?.id) {
              const prevDetails = getCategoryDetailsByRunId(prevRun.id) as { category: string; score: number; trend: string; key_issues: string }[];
              if (prevDetails?.length) {
                prevCategoryScores = {};
                for (const d of prevDetails) {
                  prevCategoryScores[d.category] = {
                    score: d.score,
                    trend: d.trend || "stable",
                    keyIssues: (() => { try { return JSON.parse(d.key_issues || "[]"); } catch { return []; } })(),
                  };
                }
              }
            }
          } catch { /* skip */ }
        }

        for (const cat of CATEGORIES) {
          if (!categories[cat.key]) {
            const prev = prevCategoryScores?.[cat.key];
            categories[cat.key] = {
              label: cat.label,
              score: prev?.score ?? 0,
              trend: (prev?.trend as "rising" | "stable" | "falling") ?? "stable",
              keyIssues: prev?.keyIssues ?? [],
              isAnalyzed: false,
            };
          }
        }

        // 위기 뉴스 전체 로드 (safe 제외, 위험도순) - 날짜별 필터링은 클라이언트
        const newsRows = dbGetArticles({ analyzedOnly: true, sort: "riskScore", limit: 500 }) as Array<{
          id: string; title: string; category: string; published_at: string;
          risk_score: number; analysis_severity: string; url: string | null;
        }>;
        const recentSignals: SignalPreview[] = newsRows
          .filter((r) => r.analysis_severity && r.analysis_severity !== "safe")
          .map((r) => ({
            id: r.id,
            title: r.title,
            severity: (r.analysis_severity || "safe") as Severity,
            score: r.risk_score || 0,
            category: (r.category || "other") as CategoryKey,
            date: r.published_at || "",
            url: r.url || undefined,
          }));

        // repairScoreHistory()는 분석 완료 시에만 실행 (읽기 경로에서 제거)

        let scoreHistory: import("@/lib/types").ScoreHistoryEntry[] = [];
        let categoryScoreHistory: import("@/lib/types").CategoryScoreHistoryEntry[] = [];
        try {
          const historyRows = getScoreHistory(31) as {
            date: string;
            overall_score: number;
            prices: number;
            employment: number;
            self_employed: number;
            finance: number;
            real_estate: number;
          }[];
          scoreHistory = historyRows.map((h: { date: string; overall_score: number }) => ({
            date: h.date,
            score: h.overall_score,
          }));
          categoryScoreHistory = historyRows.map((h: { date: string; prices: number; employment: number; self_employed: number; finance: number; real_estate: number }) => ({
            date: h.date,
            prices: h.prices,
            employment: h.employment,
            selfEmployed: h.self_employed,
            finance: h.finance,
            realEstate: h.real_estate,
            other: 0,
          }));
        } catch { /* skip */ }

        // 카테고리별 등급 분포 (analysis 테이블)
        let categoryDist: import("@/lib/types").CategorySeverityDist[] = [];
        try {
          const distRows = getCategorySeverityDistribution() as {
            category: string; critical: number; warning: number; caution: number; safe: number; total: number;
          }[];
          categoryDist = distRows.map((r) => ({
            category: r.category as CategoryKey,
            critical: r.critical,
            warning: r.warning,
            caution: r.caution,
            safe: r.safe,
            total: r.total,
          }));
        } catch { /* skip */ }

        // 전일대비 신호 증감
        let signalDelta: number | null = null;
        try {
          const dateCounts = getSignalCountByDate() as { date: string; count: number }[];
          if (dateCounts.length >= 2) {
            signalDelta = dateCounts[0].count - dateCounts[1].count;
          }
        } catch { /* skip */ }

        // 전일대비 상세 (daily_delta 스냅샷)
        let dailyDelta: DailyDelta | null = null;
        if (runId) {
          try {
            const { getDashboardSnapshot } = require("@/lib/db/queries");
            const deltaSnapshot = getDashboardSnapshot(runId, "daily_delta") as string | null;
            if (deltaSnapshot) {
              dailyDelta = JSON.parse(deltaSnapshot);
            }
          } catch { /* skip */ }
        }

        const dataSource: DashboardDataSource = runId ? "snapshot" : "cache";
        const lastUpdated = data.updatedAt || new Date().toISOString();

        return {
          lastUpdated,
          overallScore: data.overallScore ?? 0,
          categories: categories as Record<CategoryKey, CategoryRisk>,
          signalStats: {
            critical: data.signals?.critical ?? 0,
            warning: data.signals?.warning ?? 0,
            caution: data.signals?.caution ?? Math.max(0, (data.signals?.total ?? 0) - (data.signals?.critical ?? 0) - (data.signals?.warning ?? 0)),
            surging: 0,
          },
          recentSignals,
          scoreHistory,
          categoryScoreHistory,
          categoryDist,
          signalDelta,
          dailyDelta,
          runId,
          _meta: makeMeta(dataSource, runId, lastUpdated, analyzedCategoryKeys),
          _briefing: {
            summary: data.summary || "",
            keyRisks: data.keyRisks || [],
            outlook: data.outlook || "",
          },
        };
      }
    } catch {
      // DB 분석 결과 로드 실패
    }
    // AI 분석 결과가 없어도 baseline score_history는 로드
    const empty = emptyDashboard();
    try {
      const { getScoreHistory } = require("@/lib/db/queries");
      const historyRows = getScoreHistory(31) as {
        date: string; overall_score: number;
        prices: number; employment: number; self_employed: number;
        finance: number; real_estate: number;
      }[];
      if (historyRows.length > 0) {
        empty.scoreHistory = historyRows.map((h) => ({
          date: h.date, score: h.overall_score,
        }));
        empty.categoryScoreHistory = historyRows.map((h) => ({
          date: h.date,
          prices: h.prices,
          employment: h.employment,
          selfEmployed: h.self_employed,
          finance: h.finance,
          realEstate: h.real_estate,
          other: 0,
        }));
      }
    } catch { /* skip */ }

    // baseline analysis에서 위기 뉴스 전체 로드 (safe 제외, 위험도순)
    // 날짜별 필터링은 클라이언트에서 수행
    try {
      const { getArticles: dbGetArticles } = require("@/lib/db/queries");
      const newsRows = dbGetArticles({ analyzedOnly: true, sort: "riskScore", limit: 500 }) as Array<{
        id: string; title: string; category: string; published_at: string;
        risk_score: number; analysis_severity: string; url: string | null;
      }>;
      empty.recentSignals = newsRows
        .filter((r) => r.analysis_severity && r.analysis_severity !== "safe")
        .map((r) => ({
          id: r.id,
          title: r.title,
          severity: (r.analysis_severity || "safe") as Severity,
          score: r.risk_score || 0,
          category: (r.category || "other") as CategoryKey,
          date: r.published_at || "",
          url: r.url || undefined,
        }));
    } catch { /* skip */ }

    return empty;
  }
  const mockDash = mock.loadDashboard();
  mockDash._meta = makeMeta("mock", null, mockDash.lastUpdated);
  return mockDash;
}

// ── Briefing ──

export function loadBriefing(): BriefingData {
  if (isDb()) {
    try {
      const {
        getDashboardCache,
        getLatestCompletedRun,
        getLatestDashboardSnapshot,
      } = require("@/lib/db/queries");

      // 스냅샷 우선, 없으면 레거시 캐시 (loadDashboard와 동일한 조회 우선순위)
      let cached: string | null = null;
      const latestRun = getLatestCompletedRun();
      if (latestRun?.id) {
        const snapshot = getLatestDashboardSnapshot("dashboard");
        if (snapshot) cached = snapshot.data;
      }
      if (!cached) {
        cached = getDashboardCache("dashboard") as string | null;
      }

      if (cached) {
        const data = JSON.parse(cached);
        // API 사용량 로드
        let apiUsage;
        try {
          const usageCached = getDashboardCache("api_usage") as string | null;
          if (usageCached) apiUsage = JSON.parse(usageCached);
        } catch { /* ignore */ }

        return {
          generatedAt: data.updatedAt || new Date().toISOString(),
          title: data.title || "",
          summary: data.summary || "",
          highlights: (data.keyRisks || []).map((risk: string) => ({
            category: "prices" as CategoryKey,
            message: risk,
          })),
          recommendation: data.outlook || "",
          forecast: {
            scenarios: [],
            period: "1m",
            outlook: data.outlook || "",
          },
          apiUsage,
        };
      }
    } catch { /* empty fallback */ }
    // AI 분석 결과가 없으면 빈 브리핑 반환
    return emptyBriefing();
  }
  return mock.loadBriefing();
}

// ── Crisis Chain ──

export function loadCrisisChain(): CrisisChainData {
  if (isDb()) {
    try {
      const { getDashboardCache } = require("@/lib/db/queries");
      const cached = getDashboardCache("crisis_chain") as string | null;
      if (cached) {
        const data = JSON.parse(cached);
        return {
          nodes: Array.isArray(data.nodes)
            ? data.nodes.map((n: { id: string; label: string; score: number }) => ({
                id: n.id as CategoryKey,
                label: n.label,
                score: n.score,
              }))
            : [],
          edges: Array.isArray(data.edges)
            ? data.edges.map((e: { from: string; to: string; label: string; strength: string }) => ({
                from: e.from as CategoryKey,
                to: e.to as CategoryKey,
                label: e.label,
                strength: e.strength as "strong" | "moderate" | "weak",
              }))
            : [],
          chains: Array.isArray(data.chains)
            ? data.chains.map((c: { id: string; name: string; description: string; path: string[]; currentlyActive: boolean }) => ({
                id: c.id,
                name: c.name,
                description: c.description,
                path: (c.path || []) as CategoryKey[],
                currentlyActive: !!c.currentlyActive,
              }))
            : [],
        };
      }
    } catch { /* empty fallback */ }
    return { nodes: [], edges: [], chains: [] };
  }
  return mock.loadCrisisChain();
}

// ── Signals ──

export function loadSignals(filters?: {
  category?: CategoryKey;
  region?: string;
  severity?: Severity;
}): Signal[] {
  if (isDb()) {
    try {
      const { getSignals: dbGetSignals } = require("@/lib/db/queries");

      const rows = dbGetSignals({
        category: filters?.category,
        severity: filters?.severity,
        region: filters?.region,
        limit: 100,
      }) as SignalRow[];

      return rows.map((row: SignalRow) => {
        const signal = toSignal(row);
        // N+1 쿼리 제거: relatedArticleIds는 상세 보기 시 lazy load
        // (신호 100개 x 개별 쿼리 = 1.5초+ 병목 해소)
        signal.relatedArticleIds = [];
        return signal;
      });
    } catch {
      return [];
    }
  }
  return mock.loadSignals(filters);
}

export function loadSignalById(id: string): Signal | null {
  if (isDb()) {
    try {
      const { getSignals: dbGetSignals, getLatestCompletedRun } = require("@/lib/db/queries");
      // run_id를 명시하여 최신 회차의 신호만 조회
      const latestRun = getLatestCompletedRun();
      const runId = latestRun?.id ?? undefined;
      const rows = dbGetSignals({ runId, limit: 200 }) as SignalRow[];
      const row = rows.find((r: SignalRow) => r.id === id);
      if (row) {
        const signal = toSignal(row);
        signal.relatedArticleIds = loadSignalArticleIds(id);
        return signal;
      }
      return null;
    } catch {
      return null;
    }
  }
  return mock.loadSignalById(id);
}

/** 신호에 연결된 기사 목록 (signal_articles JOIN) */
export function loadSignalArticles(signalId: string): NewsArticle[] {
  if (isDb()) {
    try {
      const { getSignalArticles } = require("@/lib/db/queries");
      const rows = getSignalArticles(signalId) as ArticleRow[];
      return rows.map(toNewsArticle);
    } catch {
      return [];
    }
  }
  const signal = mock.loadSignalById(signalId);
  if (!signal || !signal.relatedArticleIds.length) return [];
  const allNews = mock.loadNews();
  const idSet = new Set(signal.relatedArticleIds);
  return allNews.filter((a) => idSet.has(a.id));
}

// ── Regions ──

export function loadRegionScores(): import("@/lib/types").RegionScore[] {
  if (isDb()) {
    try {
      const { getRegions } = require("@/lib/db/queries");
      const { getSeverityByScore } = require("@/lib/constants");

      const rows = getRegions() as {
        id: string;
        name: string;
        score: number;
        top_issue: string | null;
      }[];
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        score: r.score,
        severity: getSeverityByScore(r.score),
        signalCount: 0,
        topSignal: r.top_issue || undefined,
      }));
    } catch { /* mock fallback */ }
  }
  return [];
}

/** DB 지역별 카테고리 점수 (Record<지역명, Record<CategoryKey, number>>) */
export function loadRegionCategoryScores(): Record<string, Record<CategoryKey, number>> {
  if (isDb()) {
    try {
      const { getRegionsWithCategories } = require("@/lib/db/queries");
      const rows = getRegionsWithCategories() as {
        name: string;
        category_prices: number;
        category_employment: number;
        category_self_employed: number;
        category_finance: number;
        category_real_estate: number;
      }[];

      const result: Record<string, Record<CategoryKey, number>> = {};
      for (const r of rows) {
        result[r.name] = {
          prices: r.category_prices ?? 0,
          employment: r.category_employment ?? 0,
          selfEmployed: r.category_self_employed ?? 0,
          finance: r.category_finance ?? 0,
          realEstate: r.category_real_estate ?? 0,
          other: 0,
        };
      }
      return result;
    } catch { /* fallback */ }
  }
  return {};
}

// ── Article Daily Stats (카테고리별 일별 기사 수 집계) ──

export function loadArticleDailyStats(days = 14): ArticleDailyStat[] {
  return cached(`articleDailyStats:${days}`, () => _loadArticleDailyStatsImpl(days));
}

function _loadArticleDailyStatsImpl(days: number): ArticleDailyStat[] {
  if (isDb()) {
    try {
      const {
        getArticleDateRange,
        getDailyArticleCountsByCategory,
      } = require("@/lib/db/queries");

      const range = getArticleDateRange() as { earliest: string; latest: string };
      if (!range?.latest) return [];

      // 데이터상 최신 날짜 기준으로 N일 범위 계산
      const latestDate = new Date(range.latest);
      const fromDate = new Date(latestDate);
      fromDate.setDate(fromDate.getDate() - days);
      const dateFrom = fromDate.toISOString().slice(0, 10);
      // dateTo는 최신 날짜 다음날 (exclusive)
      const toDate = new Date(latestDate);
      toDate.setDate(toDate.getDate() + 1);
      const dateTo = toDate.toISOString().slice(0, 10);

      const rows = getDailyArticleCountsByCategory(dateFrom, dateTo) as {
        date: string;
        category: string;
        count: number;
      }[];

      return rows.map((r) => ({
        date: r.date,
        category: r.category as CategoryKey,
        count: r.count,
      }));
    } catch {
      // DB 실패 시 빈 배열 반환
    }
    return [];
  }

  // Mock 모드: news.json에서 집계
  const allNews = mock.loadNews();
  const dateMap = new Map<string, Map<string, number>>();
  for (const article of allNews) {
    const dateKey = article.publishedAt.slice(0, 10);
    if (!dateMap.has(dateKey)) dateMap.set(dateKey, new Map());
    const catMap = dateMap.get(dateKey)!;
    catMap.set(article.category, (catMap.get(article.category) || 0) + 1);
  }

  const result: ArticleDailyStat[] = [];
  for (const [date, catMap] of dateMap) {
    for (const [category, count] of catMap) {
      result.push({ date, category: category as CategoryKey, count });
    }
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

// ── News ──

export function loadNews(filters?: {
  keyword?: string;
  category?: CategoryKey;
  dateFrom?: string;
  dateTo?: string;
  analyzedOnly?: boolean;
  sort?: "publishedAt" | "riskScore";
  limit?: number;
  offset?: number;
}): NewsArticle[] {
  if (isDb()) {
    try {
      const { getArticles } = require("@/lib/db/queries");
      const rows = getArticles({
        keyword: filters?.keyword,
        category: filters?.category,
        dateFrom: filters?.dateFrom,
        dateTo: filters?.dateTo,
        analyzedOnly: filters?.analyzedOnly,
        sort: filters?.sort,
        limit: filters?.limit ?? 50,
        offset: filters?.offset ?? 0,
      }) as ArticleRow[];
      return rows.map(toNewsArticle);
    } catch {
      return [];
    }
  }
  const all = mock.loadNews(filters);
  const offset = filters?.offset ?? 0;
  const limit = filters?.limit ?? 50;
  const sliced = all.slice(offset, offset + limit);
  if (filters?.sort === "riskScore") {
    sliced.sort((a, b) => (b.analysis?.riskScore ?? -1) - (a.analysis?.riskScore ?? -1));
  }
  return sliced;
}

export function loadNewsCount(filters?: {
  keyword?: string;
  category?: CategoryKey;
  dateFrom?: string;
  dateTo?: string;
  analyzedOnly?: boolean;
}): number {
  if (isDb()) {
    try {
      const { getArticleCount } = require("@/lib/db/queries");
      return getArticleCount({
        keyword: filters?.keyword,
        category: filters?.category,
        dateFrom: filters?.dateFrom,
        dateTo: filters?.dateTo,
        analyzedOnly: filters?.analyzedOnly,
      }) as number;
    } catch {
      return 0;
    }
  }
  return mock.loadNews(filters).length;
}

export interface AnalysisSeverityStats {
  total: number;
  critical: number;
  warning: number;
  caution: number;
  safe: number;
}

export function loadAnalysisSeverityStats(): AnalysisSeverityStats {
  if (isDb()) {
    try {
      const { getAnalysisSeverityStats } = require("@/lib/db/queries");
      return getAnalysisSeverityStats() as AnalysisSeverityStats;
    } catch {
      return { total: 0, critical: 0, warning: 0, caution: 0, safe: 0 };
    }
  }
  return { total: 0, critical: 0, warning: 0, caution: 0, safe: 0 };
}

// ── Policies ──

interface PolicyRow {
  id: string;
  title: string;
  description: string | null;
  provider: string | null;
  contact: string | null;
  url: string | null;
  target_categories: string | null;
  target_regions: string | null;
  related_signals: string | null;
  eligibility: string | null;
  benefit: string | null;
}

function toPolicy(row: PolicyRow): Policy {
  let targetCategories: CategoryKey[] = [];
  let targetRegions: string[] = [];
  let relatedSignals: string[] = [];
  try { targetCategories = JSON.parse(row.target_categories || "[]"); } catch { /* skip */ }
  try { targetRegions = JSON.parse(row.target_regions || "[]"); } catch { /* skip */ }
  try { relatedSignals = JSON.parse(row.related_signals || "[]"); } catch { /* skip */ }

  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    provider: row.provider || "",
    contact: row.contact || "",
    url: row.url || "",
    targetCategories,
    targetRegions,
    relatedSignals,
    eligibility: row.eligibility || "",
    benefit: row.benefit || "",
  };
}

export function loadPolicies(filters?: {
  category?: CategoryKey;
  region?: string;
  signalId?: string;
}): Policy[] {
  if (isDb()) {
    try {
      const { getPolicies } = require("@/lib/db/queries");
      const rows = getPolicies({
        category: filters?.category,
        region: filters?.region,
        signalId: filters?.signalId,
        limit: 50,
      }) as PolicyRow[];
      return rows.map(toPolicy);
    } catch {
      return [];
    }
  }
  return mock.loadPolicies(filters);
}

// ── Emerging Issues ──

export interface EmergingIssueData {
  name: string;
  count: number;
  category: CategoryKey;
  gapDays: number;
  avgRiskScore: number | null;
  method: "subcategory_gap" | "volume_spike";
}

export function loadEmergingIssues(baseDate?: string, gapDays = 7): EmergingIssueData[] {
  return cached(`emergingIssues:${baseDate}:${gapDays}`, () => _loadEmergingIssuesImpl(baseDate, gapDays));
}

function _loadEmergingIssuesImpl(baseDate?: string, gapDays = 7): EmergingIssueData[] {
  if (isDb()) {
    try {
      const {
        getEmergingBySubcategory,
        getCategoryVolumeSpikes,
      } = require("@/lib/db/queries");

      const results: EmergingIssueData[] = [];

      // 1) 소분류 공백 후 재출현 (relevance_score 기반 품질 필터)
      const subcatEmerging = getEmergingBySubcategory({
        baseDate,
        gapDays,
        minRelevance: 6,
        minArticles: 2,
        limit: 10,
      }) as {
        original_category_code: string;
        original_category_name: string;
        category: string;
        article_count: number;
        gap_days: number;
        sample_title: string;
        avg_risk_score: number | null;
      }[];

      for (const row of subcatEmerging) {
        results.push({
          name: row.sample_title || `[${row.original_category_name}] 이슈 재부상`,
          count: row.article_count,
          category: row.category as CategoryKey,
          gapDays: row.gap_days,
          avgRiskScore: row.avg_risk_score,
          method: "subcategory_gap",
        });
      }

      // 2) 카테고리 볼륨 급등 (소분류 결과에 없는 카테고리만 추가)
      const spikes = getCategoryVolumeSpikes(baseDate, gapDays, 2.5) as {
        category: string;
        today_count: number;
        daily_avg: number;
        spike_ratio: number;
      }[];

      const existingCats = new Set(results.map((r) => r.category));
      for (const spike of spikes) {
        if (!existingCats.has(spike.category as CategoryKey)) {
          results.push({
            name: `${CATEGORIES.find((c) => c.key === spike.category)?.label ?? spike.category} 분야 기사 급증 (${spike.spike_ratio.toFixed(1)}배)`,
            count: spike.today_count,
            category: spike.category as CategoryKey,
            gapDays: 0,
            avgRiskScore: null,
            method: "volume_spike",
          });
        }
      }

      if (results.length > 0) return results;
    } catch (err) {
      console.error("[loadEmergingIssues] DB 오류:", err);
    }
  }
  return [];
}

// ── Chat ──

export function loadChatData(): ChatData {
  return mock.loadChatData();
}

export function findChatResponse(message: string): {
  answer: string;
  relatedSignals: string[];
} {
  return mock.findChatResponse(message);
}
