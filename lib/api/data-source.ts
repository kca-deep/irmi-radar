/**
 * 데이터 소스 통합 모듈
 * DATA_SOURCE 환경변수에 따라 mock JSON / SQLite DB 분기
 *
 * mock: data/mock/*.json (프로토타입)
 * db:   data/irmi.db (해커톤 운영)
 */

import type {
  DashboardData,
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
} from "@/lib/types";

import { CATEGORIES } from "@/lib/constants";
import * as mock from "./mock-data";

type DataSource = "mock" | "db";

export function getDataSource(): DataSource {
  const env = process.env.DATA_SOURCE;
  if (env === "db") return "db";
  return "mock";
}

function isDb(): boolean {
  return getDataSource() === "db";
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

export function loadDashboard(): DashboardData {
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
        for (const cat of (data.categories || [])) {
          categories[cat.category] = {
            label: cat.label,
            score: cat.score,
            trend: cat.trend || "stable",
            keyIssues: cat.keyIssues || [],
          };
        }

        // 누락된 카테고리에 기본값 채우기 (부분 분석 시)
        for (const cat of CATEGORIES) {
          if (!categories[cat.key]) {
            categories[cat.key] = {
              label: cat.label,
              score: 0,
              trend: "stable" as const,
              keyIssues: [],
            };
          }
        }

        // 최근 신호 미리보기 (최신 회차 기준)
        const signalRows = dbGetSignals({ runId, limit: 4 }) as SignalRow[];
        const recentSignals: SignalPreview[] = signalRows.map((s: SignalRow) => ({
          id: s.id,
          title: s.title,
          severity: s.severity as Severity,
          score: s.score,
          category: s.category as CategoryKey,
          date: s.detected_at || "",
        }));

        // 점수 히스토리 조회
        let scoreHistory: import("@/lib/types").ScoreHistoryEntry[] = [];
        let categoryScoreHistory: import("@/lib/types").CategoryScoreHistoryEntry[] = [];
        try {
          const historyRows = getScoreHistory(90) as {
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

        return {
          lastUpdated: data.updatedAt || new Date().toISOString(),
          overallScore: data.overallScore ?? 0,
          categories: categories as Record<CategoryKey, CategoryRisk>,
          signalStats: {
            critical: data.signals?.critical ?? 0,
            warning: data.signals?.warning ?? 0,
            caution: 0,
            surging: 0,
          },
          recentSignals,
          scoreHistory,
          categoryScoreHistory,
          categoryDist,
          signalDelta,
          dailyDelta,
          runId,
        };
      }
    } catch {
      // DB 실패 시 mock fallback
    }
  }
  return mock.loadDashboard();
}

// ── Briefing ──

export function loadBriefing(): BriefingData {
  if (isDb()) {
    try {
      const { getDashboardCache } = require("@/lib/db/queries");
      const cached = getDashboardCache("dashboard") as string | null;
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
    } catch { /* mock fallback */ }
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
    } catch { /* mock fallback */ }
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
        signal.relatedArticleIds = loadSignalArticleIds(row.id);
        return signal;
      });
    } catch {
      return mock.loadSignals(filters);
    }
  }
  return mock.loadSignals(filters);
}

export function loadSignalById(id: string): Signal | null {
  if (isDb()) {
    try {
      const { getSignals: dbGetSignals } = require("@/lib/db/queries");
      const rows = dbGetSignals({ limit: 100 }) as SignalRow[];
      const row = rows.find((r: SignalRow) => r.id === id);
      if (row) {
        const signal = toSignal(row);
        signal.relatedArticleIds = loadSignalArticleIds(id);
        return signal;
      }
    } catch { /* mock fallback */ }
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
  // mock fallback: relatedArticleIds로 매칭
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
      return mock.loadNews(filters);
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
      return mock.loadNews(filters).length;
    }
  }
  return mock.loadNews(filters).length;
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
      if (rows.length > 0) {
        return rows.map(toPolicy);
      }
    } catch { /* mock fallback */ }
  }
  return mock.loadPolicies(filters);
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
