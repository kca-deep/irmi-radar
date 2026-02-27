// -- 카테고리 키 --
export type CategoryKey =
  | "prices"
  | "employment"
  | "selfEmployed"
  | "finance"
  | "realEstate";

// -- 위기 등급 --
export type Severity = "critical" | "warning" | "caution" | "safe";

// -- 추세 --
export type Trend = "rising" | "stable" | "falling";

// -- 카테고리별 리스크 --
export interface CategoryRisk {
  label: string;
  score: number;
  trend: Trend;
  keyIssues: string[];
}

// -- 신호 통계 --
export interface SignalStats {
  critical: number;
  warning: number;
  caution: number;
  surging: number;
}

// -- 최근 신호 미리보기 --
export interface SignalPreview {
  id: string;
  title: string;
  severity: Severity;
  category: CategoryKey;
  date: string;
}

// -- 점수 이력 --
export interface ScoreHistoryEntry {
  date: string;
  score: number;
}

// -- 기간 키 --
export type PeriodKey = "1w" | "1m" | "3m";

// -- 대시보드 데이터 --
export interface DashboardData {
  lastUpdated: string;
  overallScore: number;
  categories: Record<CategoryKey, CategoryRisk>;
  signalStats: SignalStats;
  recentSignals: SignalPreview[];
  scoreHistory: ScoreHistoryEntry[];
}

// -- 신호 상세 분석 --
export interface SignalAnalysis {
  cause: string;
  impact: string;
  actionPoints: string[];
}

// -- 위기 신호 --
export interface Signal {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  category: CategoryKey;
  categoryLabel: string;
  region: string;
  relatedArticleCount: number;
  detectedAt: string;
  evidence: string[];
  analysis: SignalAnalysis;
}

// -- 뉴스 기사 --
export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  category: CategoryKey;
  categoryLabel: string;
  keywords: string[];
  publishedAt: string;
  section: string;
}

// -- 지역 리스크 --
export interface RegionRisk {
  id: string;
  name: string;
  score: number;
  trend: Trend;
  categories: Record<CategoryKey, number>;
  topIssue: string;
}

// -- 지역 점수 (지도용) --
export interface RegionScore {
  id: string;
  name: string;
  score: number;
  severity: Severity;
  signalCount: number;
  topSignal?: string;
}

// -- 지역별 현황 데이터 --
export interface RegionsData {
  lastUpdated: string;
  regions: RegionRisk[];
}

// -- 전망 시나리오 --
export interface ForecastScenario {
  type: "current" | "withResponse";
  label: string;
  overallScore: number;
  description: string;
}

// -- 전망 데이터 --
export interface ForecastData {
  period: string;
  outlook: string;
  scenarios: ForecastScenario[];
}

// -- AI 브리핑 하이라이트 --
export interface BriefingHighlight {
  category: CategoryKey;
  message: string;
}

// -- AI 브리핑 데이터 --
export interface BriefingData {
  generatedAt: string;
  summary: string;
  highlights: BriefingHighlight[];
  recommendation: string;
  forecast: ForecastData;
}

// -- 채팅 메시지 --
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  relatedSignals?: string[];
}

// -- 채팅 예시 --
export interface ChatExample {
  id: string;
  question: string;
  answer: string;
  relatedSignals: string[];
}

// -- 채팅 데이터 --
export interface ChatData {
  examples: ChatExample[];
  suggestedQuestions: string[];
}

// -- 연쇄 반응 노드 --
export interface CrisisNode {
  id: CategoryKey;
  label: string;
  score: number;
}

// -- 연쇄 반응 엣지 --
export interface CrisisEdge {
  from: CategoryKey;
  to: CategoryKey;
  label: string;
  strength: "strong" | "moderate" | "weak";
}

// -- 연쇄 반응 체인 --
export interface CrisisChain {
  id: string;
  name: string;
  description: string;
  path: CategoryKey[];
  currentlyActive: boolean;
}

// -- 연쇄 반응 맵 데이터 --
export interface CrisisChainData {
  nodes: CrisisNode[];
  edges: CrisisEdge[];
  chains: CrisisChain[];
}

// -- 지원 정책 --
export interface Policy {
  id: string;
  title: string;
  description: string;
  provider: string;
  contact: string;
  url: string;
  targetCategories: CategoryKey[];
  targetRegions: string[];
  relatedSignals: string[];
  eligibility: string;
  benefit: string;
}

// -- 대응 가이드 --
export interface ActionGuide {
  signalId: string;
  actionSteps: string[];
  matchedPolicies: Policy[];
  pastCases?: string[];
}

// -- 지역 비교 데이터 --
export interface RegionComparison {
  regionId: string;
  regionName: string;
  score: number;
  nationalAverage: number;
  difference: number;
  rank: number;
  totalRegions: number;
  categoryComparisons: {
    category: CategoryKey;
    regionScore: number;
    nationalAverage: number;
    difference: number;
  }[];
}

// -- 리포트 메타 --
export interface ReportMeta {
  generatedAt: string;
  period: string;
  overallScore: number;
  categories: Record<CategoryKey, number>;
  topSignals: SignalPreview[];
  briefingSummary: string;
  forecast: ForecastData;
}
