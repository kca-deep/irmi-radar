/**
 * lib/irumi/transform.ts
 *
 * 기존 데이터 소스(lib/types)의 데이터를 irumi 타입(lib/irumi/types)으로 변환하는 헬퍼 함수들
 */

import type {
  DashboardData as SourceDashboard,
  BriefingData as SourceBriefing,
  Signal as SourceSignal,
  RegionScore as SourceRegionScore,
  NewsArticle as SourceNews,
  ArticleDailyStat,
  CategoryKey,
  Severity,
} from "@/lib/types";

import type { EmergingIssueData } from "@/lib/api/data-source";

import type {
  DashboardData as IrumiDashboard,
  TrendDataPoint,
  RiskByCategory,
  HeatmapRow,
  SignalTableItem,
  EmergingIssue,
  RiskGrade,
  CrisisSignalData,
  CrisisSignalItem,
  RegionItem,
  NewsAnalysisData,
  NewsArticle as IrumiNews,
  NewsAnalysisStats,
} from "@/lib/irumi/types";

import { CATEGORY_LABEL_MAP, SEVERITY_LABEL_MAP } from "@/lib/constants";

// ── 공통 헬퍼 ──────────────────────────────────────────────

/** Severity -> RiskGrade 한글 변환 */
function toRiskGrade(severity: Severity): RiskGrade {
  const map: Record<Severity, RiskGrade> = {
    critical: "긴급",
    warning: "주의",
    caution: "관찰",
    safe: "안전",
  };
  return map[severity];
}

/** RiskGrade에 맞는 배경 hex 색상 */
function riskGradeBg(grade: RiskGrade): string {
  const map: Record<RiskGrade, string> = {
    "긴급": "#E24B4A",
    "주의": "#FF6600",
    "관찰": "#FFAA00",
    "안전": "#5DAA30",
  };
  return map[grade] ?? "#999999";
}

/** RiskGrade에 맞는 텍스트색 CSS 클래스 */
function riskGradeColor(grade: RiskGrade): string {
  const map: Record<RiskGrade, string> = {
    "긴급": "text-danger",
    "주의": "text-warning",
    "관찰": "text-caution",
    "안전": "text-safe",
  };
  return map[grade] ?? "";
}

/** CategoryKey -> 한글 라벨 */
function catLabel(key: CategoryKey): string {
  return CATEGORY_LABEL_MAP[key] ?? key;
}

/** 카테고리별 색상 */
function catColor(label: string): string {
  const map: Record<string, string> = {
    "물가": "text-chart-1",
    "고용": "text-chart-2",
    "자영업": "text-chart-3",
    "금융": "text-chart-4",
    "부동산": "text-chart-5",
  };
  return map[label] ?? "text-muted-foreground";
}

function catBg(label: string): string {
  const map: Record<string, string> = {
    "물가": "bg-chart-1/10",
    "고용": "bg-chart-2/10",
    "자영업": "bg-chart-3/10",
    "금융": "bg-chart-4/10",
    "부동산": "bg-chart-5/10",
  };
  return map[label] ?? "bg-muted/10";
}

/** 날짜를 MM-DD 형식으로 변환 */
function toShortDate(dateStr: string): string {
  try {
    // 이미 MM-DD 형식이면 그대로 반환
    if (/^\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    // YYYY-MM-DD 또는 YYYY.MM.DD 형식에서 직접 추출
    const match = dateStr.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
    if (match) {
      return `${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${m}-${day}`;
  } catch {
    return dateStr;
  }
}

/** 날짜를 HH:MM 형식으로 변환 */
function toTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  } catch {
    return "00:00";
  }
}

// ── Dashboard 변환 ─────────────────────────────────────────

/** ArticleDailyStat[]를 날짜별 카테고리별 Map으로 구조화 */
function buildDateCategoryMap(
  stats: ArticleDailyStat[],
): Map<string, Map<CategoryKey, number>> {
  const dateMap = new Map<string, Map<CategoryKey, number>>();
  for (const s of stats) {
    if (!dateMap.has(s.date)) dateMap.set(s.date, new Map());
    dateMap.get(s.date)!.set(s.category, s.count);
  }
  return dateMap;
}

/** 기사 집계 데이터에서 최신일 vs 전일 기사 수 변동 계산 */
function computeArticleDiffs(
  stats: ArticleDailyStat[],
  keys: CategoryKey[],
): Record<CategoryKey, { todayCount: number; diff: number }> | null {
  if (!stats || stats.length === 0) return null;

  const dateMap = buildDateCategoryMap(stats);
  const sortedDates = [...dateMap.keys()].sort().reverse();
  if (sortedDates.length === 0) return null;

  const latestDate = sortedDates[0];
  const prevDate = sortedDates.length >= 2 ? sortedDates[1] : null;

  const result = {} as Record<CategoryKey, { todayCount: number; diff: number }>;
  for (const key of keys) {
    const todayCount = dateMap.get(latestDate)?.get(key) || 0;
    const prevCount = prevDate ? (dateMap.get(prevDate)?.get(key) || 0) : 0;
    result[key] = {
      todayCount,
      diff: prevDate ? todayCount - prevCount : 0,
    };
  }
  return result;
}

/** 기사 집계 데이터에서 최근 N일간 히트맵 생성 (카테고리별 평균 대비 강도) */
function buildHeatmapFromStats(
  stats: ArticleDailyStat[],
  keys: CategoryKey[],
  days: number,
): { dates: string[]; rows: HeatmapRow[] } | null {
  if (!stats || stats.length === 0) return null;

  const dateMap = buildDateCategoryMap(stats);
  const sortedDates = [...dateMap.keys()].sort();
  if (sortedDates.length === 0) return null;

  // 최근 N일 선택
  const recentDates = sortedDates.slice(-days);

  // 카테고리별 전체 기간 평균 일일 기사 수 계산
  const catAvg: Record<string, number> = {};
  for (const key of keys) {
    let total = 0;
    for (const date of sortedDates) {
      total += dateMap.get(date)?.get(key) || 0;
    }
    catAvg[key] = total / Math.max(1, sortedDates.length);
  }

  const dates = recentDates.map((d, i) =>
    i === recentDates.length - 1 ? "오늘" : toShortDate(d),
  );

  const rows: HeatmapRow[] = keys.map((key) => {
    const avg = catAvg[key] || 1;
    const cells = recentDates.map((date) => {
      const count = dateMap.get(date)?.get(key) || 0;
      const ratio = count / avg;
      // 평균 대비 비율로 강도 계산
      if (ratio >= 1.6) return 4;
      if (ratio >= 1.2) return 3;
      if (ratio >= 0.8) return 2;
      if (ratio >= 0.4) return 1;
      return 0;
    });
    const todayCount = dateMap.get(recentDates[recentDates.length - 1])?.get(key) || 0;
    return { label: catLabel(key), cells, today: todayCount };
  });

  return { dates, rows };
}

export function transformDashboard(
  src: SourceDashboard,
  briefing: SourceBriefing,
  articleStats?: ArticleDailyStat[],
  emergingIssueData?: EmergingIssueData[],
): IrumiDashboard {
  // カテゴリデータの正規化: 配列形式(0,1,2...)の場合はcategoryキーでマッピング
  const categoryKeys: CategoryKey[] = [
    "prices", "employment", "selfEmployed", "finance", "realEstate",
  ];

  // categories가 배열 형태(0,1,2,3,4)로 저장된 경우 정규화
  let normalizedCategories = src.categories;
  if (src.categories && !src.categories["prices"]) {
    const arr = Object.values(src.categories) as Array<{ category: CategoryKey; label: string; score: number; trend: string; keyIssues: string[] }>;
    const normalized: Record<string, { score: number; trend: string; keyIssues: string[] }> = {};
    for (const item of arr) {
      if (item.category) {
        normalized[item.category] = { score: item.score, trend: item.trend || "stable", keyIssues: item.keyIssues || [] };
      }
    }
    normalizedCategories = normalized as typeof src.categories;
  }

  // 트렌드 데이터: scoreHistory -> TrendDataPoint[]
  const scoreHistory = src.scoreHistory || [];
  let trendData: TrendDataPoint[];
  if (scoreHistory.length >= 2) {
    trendData = scoreHistory.slice(-90).map((h) => ({
      day: toShortDate(h.date),
      value: h.score,
    }));
  } else if (articleStats && articleStats.length > 0) {
    // scoreHistory 부족 시 기사량 기반 가상 추이 생성
    const dailyTotals = new Map<string, number>();
    for (const s of articleStats) {
      dailyTotals.set(s.date, (dailyTotals.get(s.date) || 0) + s.count);
    }
    const sorted = [...dailyTotals.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-90);
    const latestTotal = sorted[sorted.length - 1]?.[1] || 1;
    // 최신일 기사량 = 현재 종합지수, 나머지는 비례 환산
    trendData = sorted.map(([date, total], i) => ({
      day: i === sorted.length - 1 ? "오늘" : toShortDate(date),
      value: Math.round((total / latestTotal) * src.overallScore),
    }));
  } else {
    trendData = [{ day: "오늘", value: src.overallScore }];
  }

  const catBarColor = (score: number): string => {
    if (score >= 80) return "#E24B4A";
    if (score >= 60) return "#FF6600";
    if (score >= 40) return "#FFAA00";
    return "#5DAA30";
  };

  // 기사 원본 데이터 기반 카테고리별 변동 계산
  const articleDiffs = computeArticleDiffs(articleStats || [], categoryKeys);

  const riskByCategory: RiskByCategory[] = categoryKeys.map((key) => {
    const cat = normalizedCategories[key] || { score: 0, trend: "stable", keyIssues: [] };

    let diffStr: string;
    if (cat.score === 0) {
      // AI 분석 결과가 없으면 diff 표시 안 함
      diffStr = "-";
    } else if (articleDiffs && articleDiffs[key]) {
      const d = articleDiffs[key].diff;
      diffStr = d > 0 ? `+${d}` : d < 0 ? `${d}` : "0";
    } else {
      const trendSign = cat.trend === "rising" ? "+" : cat.trend === "falling" ? "-" : "";
      diffStr = `${trendSign}${cat.trend === "stable" ? "0" : Math.round(cat.score * 0.05)}`;
    }

    return {
      name: catLabel(key),
      value: cat.score,
      diff: diffStr,
      color: catBarColor(cat.score),
    };
  });

  // 히트맵: articleStats 기사 수 기반 우선, 없으면 categoryScoreHistory fallback
  let heatmapDates: string[];
  let heatmapData: HeatmapRow[];

  const heatmapFromArticles = buildHeatmapFromStats(articleStats || [], categoryKeys, 7);

  if (heatmapFromArticles) {
    heatmapDates = heatmapFromArticles.dates;
    heatmapData = heatmapFromArticles.rows;
  } else {
    const categoryScoreHistory = src.categoryScoreHistory || [];
    const recentHistory = categoryScoreHistory.length > 0
      ? categoryScoreHistory.slice(-7)
      : [];

    if (recentHistory.length > 0) {
      heatmapDates = recentHistory.map((h, i) =>
        i === recentHistory.length - 1 ? "오늘" : toShortDate(h.date),
      );
      heatmapData = categoryKeys.map((key) => {
        const label = catLabel(key);
        const cells = recentHistory.map((h) => {
          const score = h[key] ?? 0;
          if (score >= 80) return 4;
          if (score >= 60) return 3;
          if (score >= 40) return 2;
          if (score >= 20) return 1;
          return 0;
        });
        const today = cells[cells.length - 1] ?? 0;
        return { label, cells, today };
      });
    } else {
      heatmapDates = ["오늘"];
      heatmapData = categoryKeys.map((key) => {
        const cat = normalizedCategories[key] || { score: 0 };
        const score = cat.score;
        const level = score >= 80 ? 4 : score >= 60 ? 3 : score >= 40 ? 2 : score >= 20 ? 1 : 0;
        return { label: catLabel(key), cells: [level], today: level };
      });
    }
  }

  // 최근 신호 -> SignalTableItem
  const recentSignals = src.recentSignals || [];
  const signals: SignalTableItem[] = recentSignals.map((s) => {
    const grade = toRiskGrade(s.severity);
    return {
      level: grade,
      levelBg: riskGradeBg(grade),
      category: catLabel(s.category),
      title: s.title,
      date: toShortDate(s.date),
      url: s.url,
    };
  });

  // AI 요약
  const aiSummaryTitle = briefing.title
    || (briefing.summary ? briefing.summary.split(".")[0] + "." : "민생위기 종합 분석");
  const aiSummaryBody = briefing.summary || "분석 데이터를 준비 중입니다.";

  // 급부상 이슈: DB 이머징 데이터 -> briefing highlights -> keyIssues -> fallback
  let emergingIssues: EmergingIssue[] = [];

  // 1차: DB 기반 이머징이슈 (소분류 공백 재출현 + 볼륨 급등)
  if (emergingIssueData && emergingIssueData.length > 0) {
    emergingIssues = emergingIssueData.slice(0, 5).map((d, i) => {
      const score = d.avgRiskScore ?? 0;
      const grade: RiskGrade = score >= 80 ? "긴급" : score >= 60 ? "주의" : score >= 40 ? "관찰" : "안전";
      return {
        rank: i + 1,
        name: d.name,
        count: d.count,
        category: catLabel(d.category as CategoryKey),
        gapDays: d.gapDays,
        severity: grade,
        method: d.method,
      };
    });
  }

  // 2차: briefing highlights
  if (emergingIssues.length === 0 && briefing.highlights && briefing.highlights.length > 0) {
    emergingIssues = briefing.highlights
      .filter((h) => h.message && h.message.trim().length > 0)
      .slice(0, 5)
      .map((h, i) => ({
        rank: i + 1,
        name: h.message,
        count: Math.max(1, 10 - i * 2),
      }));
  }

  // 3차: 카테고리별 keyIssues
  if (emergingIssues.length === 0) {
    emergingIssues = categoryKeys
      .map((key) => {
        const cat = normalizedCategories[key] || { keyIssues: [] };
        return (cat.keyIssues ?? []).map((issue: string) => `[${catLabel(key)}] ${issue}`);
      })
      .flat()
      .filter((name) => name.trim().length > 0)
      .slice(0, 5)
      .map((name, i) => ({
        rank: i + 1,
        name,
        count: Math.max(1, 10 - i * 2),
      }));
  }

  // 데이터가 없으면 빈 배열 유지

  // 전일 대비 변화 추정
  const prevScore = trendData.length >= 2
    ? trendData[trendData.length - 2].value
    : src.overallScore;
  const indexChange = src.overallScore - prevScore;

  // 데이터 신선도 정보 (P1-7)
  const freshnessInfo: import("@/lib/irumi/types").DataFreshnessInfo | undefined =
    src._meta
      ? {
          level: src._meta.freshness,
          source: src._meta.source,
          lastAnalyzedAt: src._meta.generatedAt,
          analyzedCategories: src._meta.analyzedCategories,
        }
      : undefined;

  return {
    compositeIndex: src.overallScore,
    indexChange,
    aiSummaryTitle,
    aiSummaryBody,
    aiSummaryTime: src.lastUpdated ? toTime(src.lastUpdated) : toTime(briefing.generatedAt || new Date().toISOString()),
    trendData,
    heatmapDates,
    riskByCategory,
    heatmapData,
    signals,
    emergingIssues,
    freshness: freshnessInfo,
  };
}

// ── Signals 변환 ───────────────────────────────────────────

/** 지역 좌표 (한국 지도 SVG 상 % 위치, Figma 기준) */
const REGION_COORDS: Record<string, { x: number; y: number }> = {
  "서울": { x: 34, y: 25 },
  "인천": { x: 20, y: 29 },
  "경기": { x: 29, y: 33 },
  "강원": { x: 63, y: 21 },
  "충북": { x: 49, y: 38 },
  "충남": { x: 24, y: 42 },
  "대전": { x: 39, y: 44 },
  "전북": { x: 31, y: 54 },
  "광주": { x: 31, y: 66 },
  "전남": { x: 28, y: 70 },
  "경북": { x: 62, y: 42 },
  "대구": { x: 58, y: 53 },
  "울산": { x: 70, y: 58 },
  "부산": { x: 64, y: 64 },
  "경남": { x: 53, y: 65 },
  "제주": { x: 33, y: 92 },
};

function severityColor(severity: Severity): string {
  const map: Record<Severity, string> = {
    critical: "var(--danger)",
    warning: "var(--warning)",
    caution: "var(--caution)",
    safe: "var(--safe)",
  };
  return map[severity] ?? "var(--safe)";
}

export function transformSignals(
  signals: SourceSignal[],
  regionScores: SourceRegionScore[],
  overallScore: number,
  regionCategories?: Record<string, Record<CategoryKey, number>>,
  dashboardCategoryScores?: number[],
): CrisisSignalData {
  const items: CrisisSignalItem[] = signals.map((s) => {
    const grade = toRiskGrade(s.severity);
    const label = catLabel(s.category);
    return {
      id: s.id,
      risk: grade,
      riskColor: riskGradeColor(grade),
      riskBg: riskGradeBg(grade),
      category: label,
      catColor: catColor(label),
      catBg: catBg(label),
      region: s.region || null,
      date: toShortDate(s.detectedAt),
      title: s.title,
      summary: s.description,
      articles: s.relatedArticleIds.length || undefined,
    };
  });

  const categoryKeys: CategoryKey[] = [
    "prices", "selfEmployed", "realEstate", "employment", "finance",
  ];

  // bars 순서: [물가, 자영업, 부동산, 고용, 금융]
  const barCategoryKeys: CategoryKey[] = [
    "prices", "selfEmployed", "realEstate", "employment", "finance",
  ];

  const regions: RegionItem[] = regionScores
    .filter((r) => r.name in REGION_COORDS)
    .map((r) => {
    const coords = REGION_COORDS[r.name];
    const cats = regionCategories?.[r.name];
    const bars = cats
      ? barCategoryKeys.map((key) => cats[key] ?? r.score)
      : barCategoryKeys.map((_, i) => {
          const offsets = [-5, 8, -3, -10, 2];
          return Math.max(0, Math.min(100, r.score + offsets[i]));
        });

    return {
      id: r.id,
      name: r.name,
      x: coords.x,
      y: coords.y,
      color: severityColor(r.severity),
      score: r.score,
      bars,
    };
  });

  return {
    signals: items,
    regions,
    nationalCompositeScore: overallScore,
    nationalCategoryScores: dashboardCategoryScores,
  };
}

// ── News 변환 ──────────────────────────────────────────────

export function transformNews(
  articles: SourceNews[],
  totalCount: number,
): NewsAnalysisData {
  const converted: IrumiNews[] = articles.map((a) => {
    const severity: Severity = a.analysis?.severity ?? "safe";
    const grade = toRiskGrade(severity);
    return {
      id: a.id,
      category: catLabel(a.category),
      risk: grade,
      score: a.analysis?.riskScore ?? 0,
      date: toShortDate(a.publishedAt),
      reporter: a.source ?? "",
      title: a.title,
      body: a.summary || a.content || "",
      keywords: a.keywords,
      thumbnailUrl: a.thumbnailUrl,
    };
  });

  const urgent = converted.filter((a) => a.risk === "긴급").length;
  const caution = converted.filter((a) => a.risk === "주의").length;
  const watch = converted.filter((a) => a.risk === "관찰").length;

  const stats: NewsAnalysisStats = {
    total: totalCount,
    urgent,
    caution,
    watch,
    remaining: Math.max(0, totalCount - converted.length),
  };

  return {
    stats,
    articles: converted,
  };
}
