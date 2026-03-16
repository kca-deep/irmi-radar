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
  CategoryKey,
  Severity,
} from "@/lib/types";

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

export function transformDashboard(
  src: SourceDashboard,
  briefing: SourceBriefing,
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
  if (scoreHistory.length > 0) {
    trendData = scoreHistory.slice(-14).map((h) => ({
      day: toShortDate(h.date),
      value: h.score,
    }));
  } else {
    // scoreHistory가 비어있으면 DB에서 직접 생성할 수 없으므로 단일 포인트
    trendData = [{ day: "오늘", value: src.overallScore }];
  }

  const catBarColor = (score: number): string => {
    if (score >= 80) return "#E24B4A";
    if (score >= 60) return "#FF6600";
    if (score >= 40) return "#FFAA00";
    return "#5DAA30";
  };

  const riskByCategory: RiskByCategory[] = categoryKeys.map((key) => {
    const cat = normalizedCategories[key] || { score: 0, trend: "stable", keyIssues: [] };
    const trendSign = cat.trend === "rising" ? "+" : cat.trend === "falling" ? "-" : "";
    return {
      name: catLabel(key),
      value: cat.score,
      diff: `${trendSign}${cat.trend === "stable" ? "0" : Math.round(cat.score * 0.05)}`,
      color: catBarColor(cat.score),
    };
  });

  // 히트맵: categoryScoreHistory 기반 (비어있으면 현재 점수로 단일 행)
  const categoryScoreHistory = src.categoryScoreHistory || [];
  const recentHistory = categoryScoreHistory.length > 0
    ? categoryScoreHistory.slice(-7)
    : [];

  let heatmapDates: string[];
  let heatmapData: HeatmapRow[];

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
    // categoryScoreHistory가 비어있으면 현재 점수로 히트맵 생성
    heatmapDates = ["오늘"];
    heatmapData = categoryKeys.map((key) => {
      const cat = normalizedCategories[key] || { score: 0 };
      const score = cat.score;
      const level = score >= 80 ? 4 : score >= 60 ? 3 : score >= 40 ? 2 : score >= 20 ? 1 : 0;
      return { label: catLabel(key), cells: [level], today: level };
    });
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
    };
  });

  // AI 요약
  const aiSummaryTitle = briefing.summary
    ? briefing.summary.split(".")[0] + "."
    : "민생위기 종합 분석";
  const aiSummaryBody = briefing.summary || "분석 데이터를 준비 중입니다.";

  // 급부상 이슈: briefing highlights -> 카테고리 keyIssues -> 하드코딩 fallback
  let emergingIssues: EmergingIssue[] = [];

  // 1차: briefing highlights
  if (briefing.highlights && briefing.highlights.length > 0) {
    emergingIssues = briefing.highlights
      .filter((h) => h.message && h.message.trim().length > 0)
      .slice(0, 5)
      .map((h, i) => ({
        rank: i + 1,
        name: h.message,
        count: Math.max(1, 10 - i * 2),
      }));
  }

  // 2차: 카테고리별 keyIssues
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

  // 3차: 최종 fallback
  if (emergingIssues.length === 0) {
    emergingIssues = [
      { rank: 1, name: "물가 상승 압력 지속", count: 10 },
      { rank: 2, name: "고용 불확실성 확대", count: 8 },
      { rank: 3, name: "가계부채 관리 강화", count: 6 },
    ];
  }

  // 전일 대비 변화 추정
  const prevScore = trendData.length >= 2
    ? trendData[trendData.length - 2].value
    : src.overallScore;
  const indexChange = src.overallScore - prevScore;

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
  };
}

// ── Signals 변환 ───────────────────────────────────────────

/** 지역 좌표 (한국 지도상 대략적 % 위치) */
const REGION_COORDS: Record<string, { x: number; y: number }> = {
  "서울": { x: 38, y: 28 },
  "경기": { x: 42, y: 32 },
  "인천": { x: 32, y: 30 },
  "부산": { x: 68, y: 72 },
  "대구": { x: 62, y: 58 },
  "광주": { x: 32, y: 68 },
  "대전": { x: 45, y: 48 },
  "울산": { x: 72, y: 62 },
  "세종": { x: 42, y: 44 },
  "강원": { x: 58, y: 22 },
  "충북": { x: 50, y: 38 },
  "충남": { x: 35, y: 45 },
  "전북": { x: 35, y: 58 },
  "전남": { x: 30, y: 75 },
  "경북": { x: 65, y: 42 },
  "경남": { x: 58, y: 70 },
  "제주": { x: 30, y: 92 },
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

  const regions: RegionItem[] = regionScores.map((r) => {
    const coords = REGION_COORDS[r.name] ?? { x: 50, y: 50 };
    return {
      id: r.id,
      name: r.name,
      x: coords.x,
      y: coords.y,
      color: severityColor(r.severity),
      bars: categoryKeys.map(() => Math.round(r.score * (0.7 + Math.random() * 0.6))),
    };
  });

  return {
    signals: items,
    regions,
    nationalCompositeScore: overallScore,
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
