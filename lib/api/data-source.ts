/**
 * 데이터 소스 통합 모듈
 * DATA_SOURCE 환경변수에 따라 mock JSON / SQLite DB 분기
 *
 * mock: data/mock/*.json (프로토타입)
 * db:   data/irmi.db (해커톤 운영)
 */

import type {
  DashboardData,
  BriefingData,
  CrisisChainData,
  Signal,
  NewsArticle,
  Policy,
  ChatData,
  CategoryKey,
  Severity,
} from "@/lib/types";

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
    analysis: row.risk_score != null
      ? {
          riskScore: row.risk_score,
          severity: (row.analysis_severity || "safe") as Severity,
          keyFactors: [],
          relatedCategories: [],
          summary: row.ai_summary || "",
        }
      : undefined,
  };
}

// ── Dashboard ──

export function loadDashboard(): DashboardData {
  // 대시보드는 AI 분석 후 dashboard_cache에 저장하는 구조
  // 아직 분석 미수행 시 mock 반환
  return mock.loadDashboard();
}

// ── Briefing ──

export function loadBriefing(): BriefingData {
  return mock.loadBriefing();
}

// ── Crisis Chain ──

export function loadCrisisChain(): CrisisChainData {
  return mock.loadCrisisChain();
}

// ── Signals ──

export function loadSignals(filters?: {
  category?: CategoryKey;
  region?: string;
  severity?: Severity;
}): Signal[] {
  // signals 테이블은 AI 분석 후 생성되는 데이터
  return mock.loadSignals(filters);
}

export function loadSignalById(id: string): Signal | null {
  return mock.loadSignalById(id);
}

// ── News ──

export function loadNews(filters?: {
  keyword?: string;
  category?: CategoryKey;
  limit?: number;
  offset?: number;
}): NewsArticle[] {
  if (isDb()) {
    try {
      const { getArticles } = require("@/lib/db/queries");
      const rows = getArticles({
        keyword: filters?.keyword,
        category: filters?.category,
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
  return all.slice(offset, offset + limit);
}

export function loadNewsCount(filters?: {
  keyword?: string;
  category?: CategoryKey;
}): number {
  if (isDb()) {
    try {
      const { getArticleCount } = require("@/lib/db/queries");
      return getArticleCount({
        keyword: filters?.keyword,
        category: filters?.category,
      }) as number;
    } catch {
      return mock.loadNews(filters).length;
    }
  }
  return mock.loadNews(filters).length;
}

// ── Policies ──

export function loadPolicies(filters?: {
  category?: CategoryKey;
  region?: string;
  signalId?: string;
}): Policy[] {
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
