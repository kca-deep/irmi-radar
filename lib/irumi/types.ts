/**
 * 이르미 대시보드 공유 타입 정의
 * 각 페이지 컴포넌트의 props 인터페이스가 여기서 export됩니다.
 */

/* ── 공통 ──────────────────────────────────────────────── */

export type RiskGrade = "긴급" | "주의" | "관찰" | "안전";

/* ── 대시보드 (GET /api/dashboard) ───────────────────────── */

export interface TrendDataPoint {
  day: string;   // e.g. "Oct", "Nov-3"
  value: number; // 0–100
}

export interface RiskByCategory {
  name: string;  // e.g. "물가"
  value: number; // 0–100
  diff: string;  // e.g. "+5", "-3"
  color: string; // e.g. "#E24B4A"
}

export interface HeatmapRow {
  label: string;      // e.g. "물가"
  cells: number[];    // 0–4 intensity per day
  today: number;      // 오늘 기사 수
}

export interface SignalTableItem {
  level: RiskGrade;
  levelBg: string;
  category: string;
  title: string;
  date: string; // "03-13"
}

export interface EmergingIssue {
  rank: number;
  name: string;
  count: number;
  category?: string;
  gapDays?: number;
  severity?: RiskGrade;
  method?: "volume_spike" | "keyword_emergence" | "ai_detected" | "subcategory_gap";
}

/** 데이터 신선도 정보 */
export interface DataFreshnessInfo {
  /** fresh: 6시간 이내, aging: 24시간 이내, stale: 24시간 초과 */
  level: "fresh" | "aging" | "stale";
  /** 데이터 출처 */
  source: "snapshot" | "cache" | "computed" | "mock";
  /** 마지막 분석 시각 (ISO 8601) */
  lastAnalyzedAt: string;
  /** 분석된 카테고리 목록 */
  analyzedCategories: string[];
}

export interface DashboardData {
  compositeIndex: number;       // 종합 민생위기 지수
  indexChange: number;          // 전일 대비 변화
  aiSummaryTitle: string;       // AI 한줄 요약
  aiSummaryBody: string;        // AI 본문
  aiSummaryTime: string;        // e.g. "10:07"
  trendData: TrendDataPoint[];
  heatmapDates: string[];       // e.g. ["3/8","3/9",...,"오늘"]
  riskByCategory: RiskByCategory[];
  heatmapData: HeatmapRow[];
  signals: SignalTableItem[];
  emergingIssues: EmergingIssue[];
  /** 데이터 신선도 (P1-7) */
  freshness?: DataFreshnessInfo;
}

/* ── 위기 신호 (GET /api/signals) ───────────────────────── */

export interface CrisisSignalItem {
  id: string | number;
  risk: RiskGrade;
  riskColor: string;
  riskBg: string;
  category: string;  // e.g. "🏠 부동산"
  catColor: string;
  catBg: string;
  region: string | null;
  date: string;
  title: string;
  summary?: string;
  articles?: number;
}

export interface RegionItem {
  id: string;
  name: string;
  x: number;  // % on map
  y: number;  // % on map
  color: string;
  score: number; // DB 종합 위험도 점수 0-100
  bars: number[]; // [물가, 자영업, 부동산, 고용, 금융] 점수 0-100
}

export interface CrisisSignalData {
  signals: CrisisSignalItem[];
  regions: RegionItem[];
  nationalCompositeScore: number;
}

/* ── 뉴스 분석 (GET /api/news) ──────────────────────────── */

export interface NewsArticle {
  id: string | number;
  category: string;   // "물가" | "고용" | "자영업" | "금융" | "부동산"
  risk: RiskGrade;
  score: number;
  date: string;
  reporter: string;
  title: string;
  body: string;
  keywords: string[];
  thumbnailUrl?: string;
}

export interface NewsAnalysisStats {
  total: number;
  urgent: number;
  caution: number;
  watch: number;
  remaining: number; // 아직 분석 안 된 기사 수
}

export interface NewsAnalysisData {
  stats: NewsAnalysisStats;
  articles: NewsArticle[];
}

/* ── 기자의 시선 (GET /api/reporters) ──────────────────── */

export interface BeatItem {
  beat: string;
  count: number;
}

export interface Reporter {
  name: string;
  total: number;
  primaryBeat: string;
  isSpecialist: boolean;
  beatCount: number;
  recentCount: number;
  avgWeekly: number;
  surgeRatio: number;
  weeklyTrend: number[];
  beatBreakdown: BeatItem[];
  surgeReason?: string;
  aiProfileSummary?: string;
}

export interface Convergence {
  topic: string;
  writer_count: number;
  beat_count: number;
  article_count: number;
  beatDistribution: BeatItem[];
  topReporters: { name: string; beat: string; count: number }[];
  aiInsight?: string;
  topArticleTitle?: string;
}

export interface BeatSummary {
  beat: string;
  writers: number;
  articles: number;
}

export interface ReporterData {
  leaderboard: Reporter[];
  convergence: Convergence[];
  beatSummary: BeatSummary[];
  referenceDate: string;
  weeklyRatio?: number;
  aiSummary?: string;
  aiAnalyzedAt?: string;
}

/* ── 맞춤 분석 (GET /api/custom) ───────────────────────── */

export interface CustomCard {
  id: string | number;
  category: string;  // "물가" | "고용" | "자영업" | "금융" | "부동산"
  risk: RiskGrade;
  title: string;     // \n 포함 가능 (개행 처리)
  subtitle: string;
  keywords: string[];
  date: string;
}

export interface SupportNewsItem {
  headline: string;
  date: string; // "2026.03.14"
}

export interface CustomAnalysisData {
  userName: string;
  ageGroup: string;    // e.g. "30대"
  jobGroup: string;    // e.g. "직장인"
  cards: CustomCard[];
  /**
   * cardId → 관련 뉴스 매핑
   * 없을 경우 공통 뉴스를 사용하거나 빈 배열
   */
  supportNews: Record<string | number, SupportNewsItem[]>;
}
