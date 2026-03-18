// -- 카테고리 키 --
export type CategoryKey =
  | "prices"
  | "employment"
  | "selfEmployed"
  | "finance"
  | "realEstate"
  | "other";

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
  articleCount?: number;
  /** 이 카테고리가 현재 회차에서 실제 분석되었는지 여부 (false면 이전 값 또는 기본값) */
  isAnalyzed?: boolean;
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
  score: number;
  category: CategoryKey;
  date: string;
}

// -- 카테고리별 일별 기사 수 집계 --
export interface ArticleDailyStat {
  date: string;          // "2025-12-31"
  category: CategoryKey;
  count: number;
}

// -- 점수 이력 --
export interface ScoreHistoryEntry {
  date: string;
  score: number;
}

// -- 카테고리별 점수 이력 (스파크라인용) --
export interface CategoryScoreHistoryEntry {
  date: string;
  prices: number;
  employment: number;
  selfEmployed: number;
  finance: number;
  other: number;
  realEstate: number;
}

// -- 기간 키 --
export type PeriodKey = "1w" | "1m" | "3m";

// -- 카테고리별 등급 분포 (미니 차트용) --
export interface CategorySeverityDist {
  category: CategoryKey;
  critical: number;
  warning: number;
  caution: number;
  safe: number;
  total: number;
}

// -- 전일대비 비교 --
export interface DailyDelta {
  previousDate: string | null;
  previousRunId: string | null;
  overall: {
    delta: number | null;
    direction: "up" | "down" | "unchanged";
    severityChanged: boolean;
    previousSeverity: Severity | null;
  };
  categories: Record<CategoryKey, {
    delta: number | null;
    direction: "up" | "down" | "unchanged";
    previousScore: number | null;
  }>;
  signals: {
    totalDelta: number | null;
    newCount: number;
    resolvedCount: number;
    upgradedCount: number;
    downgradedCount: number;
  };
  aiSummary: string | null;
}

// -- 분석 회차 --
export interface AnalysisRunInfo {
  id: string;
  runDate: string;
  startedAt: string;
  completedAt: string | null;
  status: "running" | "completed" | "failed";
  overallScore: number | null;
  overallSeverity: Severity | null;
  articlesAnalyzed: number;
}

// -- 데이터 소스 메타데이터 --
export type DashboardDataSource = "snapshot" | "cache" | "computed" | "mock";
export type DataFreshness = "fresh" | "aging" | "stale";

export interface DashboardMeta {
  /** 데이터 출처 */
  source: DashboardDataSource;
  /** 분석 회차 ID */
  runId: string | null;
  /** 데이터 생성 시각 (ISO 8601) */
  generatedAt: string;
  /** 데이터 신선도 */
  freshness: DataFreshness;
  /** 분석된 카테고리 목록 (부분 분석 시 일부만 포함) */
  analyzedCategories: CategoryKey[];
}

// -- 대시보드 데이터 --
export interface DashboardData {
  lastUpdated: string;
  overallScore: number;
  categories: Record<CategoryKey, CategoryRisk>;
  signalStats: SignalStats;
  recentSignals: SignalPreview[];
  scoreHistory: ScoreHistoryEntry[];
  categoryScoreHistory: CategoryScoreHistoryEntry[];
  /** 카테고리별 등급 분포 (analysis 테이블 기반) */
  categoryDist: CategorySeverityDist[];
  /** 전일대비 신호 증감 (null = 전일 데이터 없음) */
  signalDelta: number | null;
  /** 전일대비 상세 비교 (null = 이전 분석 없음) */
  dailyDelta: DailyDelta | null;
  /** 현재 분석 회차 ID */
  runId: string | null;
  /** 데이터 소스 메타데이터 */
  _meta?: DashboardMeta;
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
  score: number;
  category: CategoryKey;
  categoryLabel: string;
  region: string;
  relatedArticleIds: string[];
  detectedAt: string;
  evidence: string[];
  analysis: SignalAnalysis;
}

// -- 뉴스 기사 AI 분석 메타데이터 --
export interface NewsArticleAnalysis {
  riskScore: number;
  severity: Severity;
  signalId?: string;
  signalTitle?: string;
  keyFactors: string[];
  relatedCategories: CategoryKey[];
  impactRegion?: string;
  summary: string;
}

// -- 기사 댓글 --
export interface ArticleComment {
  commentId: number;
  articleId: string;
  parentId: number;
  author: string;
  content: string;
  likeCount: number;
  hateCount: number;
  createdAt: string;
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
  content?: string;
  source?: string;
  region?: string;
  url?: string;
  thumbnailUrl?: string;
  thumbnailCaption?: string;
  likeCount?: number;
  replyCount?: number;
  analysis?: NewsArticleAnalysis;
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

// -- API 사용량 --
export interface ApiUsageData {
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  provider: string;
  model: string;
}

// -- AI 브리핑 데이터 --
export interface BriefingData {
  generatedAt: string;
  summary: string;
  highlights: BriefingHighlight[];
  recommendation: string;
  forecast: ForecastData;
  apiUsage?: ApiUsageData;
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

// -- 분석 기간 프리셋 --
export type AnalysisPeriodPreset =
  | "1w"
  | "1m"
  | "3m"
  | "6m"
  | "1y"
  | "all"
  | "custom";

// -- 분석 단계 상태 --
export type AnalysisStepStatus = "pending" | "running" | "completed" | "error";

// -- 분석 단계 --
export interface AnalysisStep {
  id: string;
  label: string;
  status: AnalysisStepStatus;
  category?: CategoryKey;
  /** 단계별 상세 정보 (예: "총 12건", "3건 분석, 1건 실패") */
  detail?: string;
}

// -- 분석 진행 상황 --
export interface AnalysisProgress {
  steps: AnalysisStep[];
  currentStepIndex: number;
  /** 완료된 단계 수 */
  completedSteps: number;
  /** 전체 단계 수 */
  totalSteps: number;
  percent: number;
  elapsedSeconds: number;
  estimatedRemainingSeconds: number;
}

// -- 분석 결과 요약 --
export interface AnalysisResult {
  overallScore: number;
  severity: Severity;
  signalCount: number;
  elapsedSeconds: number;
  tokenUsage?: {
    totalCalls: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    totalCost: number;
    provider: string;
    model: string;
  };
}

// -- 분석 상태 --
export type AnalysisState = "idle" | "running" | "completed" | "error";

// -- 외부 데이터 연계 옵션 --
export interface ExternalDataOptions {
  includeAssembly: boolean;
  includeGovServices: boolean;
}

// -- 보조금24 공공서비스 (행안부 API) --
export interface GovService {
  serviceId: string;
  serviceName: string;
  servicePurpose: string;
  supportType: string;
  targetAudience: string;
  selectionCriteria: string;
  supportContent: string;
  applyMethod: string;
  applyDeadline: string;
  detailUrl: string;
  orgName: string;
  deptName: string;
  contact: string;
  serviceField: string;
  orgType: string;
  receptionOrg: string;
  viewCount: number;
  registeredAt: string;
  modifiedAt: string;
}

// -- 국회 오픈API: 청원 계류현황 --
export interface AssemblyPetition {
  billNo: string;
  billId: string;
  name: string;
  proposer: string;
  approver: string;
  proposeDt: string;
  committee: string;
  linkUrl: string;
}

// -- 국회 오픈API: 진행중 입법예고 --
export interface AssemblyLegislation {
  billId: string;
  billNo: string;
  name: string;
  proposer: string;
  proposerKind: string;
  committee: string;
  deadlineDt: string;
  linkUrl: string;
}

// -- 국회 오픈API: 의안 접수목록 --
export interface AssemblyBill {
  billId: string;
  billNo: string;
  name: string;
  kind: string;
  proposerKind: string;
  proposeDt: string;
  result: string;
  linkUrl: string;
}

// -- 국회 오픈API: NABO 경제전망 --
export interface NaboForecast {
  regDate: string;
  department: string;
  subject: string;
  linkUrl: string;
}

// -- 국회 오픈API: NARS 현안분석 --
export interface NarsAnalysis {
  title: string;
  insertDt: string;
  pdfUrl: string;
  viewerUrl: string;
}

// -- 보조금24: 공공서비스 상세 (serviceDetail 추가 필드) --
export interface GovServiceDetail extends GovService {
  law: string;
  requiredDocs: string;
  officialDocs: string;
  onlineUrl: string;
  receptionOrg: string;
  localRegulation: string;
  adminRule: string;
}

// -- 보조금24: 지원조건 --
export interface GovSupportCondition {
  serviceId: string;
  serviceName: string;
  conditions: Record<string, string | number | null>;
  activeConditions: string[];
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
