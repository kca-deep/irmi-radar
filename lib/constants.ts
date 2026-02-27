import type { CategoryKey, Severity } from "@/lib/types";

// -- 카테고리 정의 --
export const CATEGORIES: {
  key: CategoryKey;
  label: string;
  description: string;
}[] = [
  {
    key: "prices",
    label: "물가",
    description: "소비자물가, 식료품, 공공요금, 생활비",
  },
  {
    key: "employment",
    label: "고용",
    description: "실업률, 구조조정, 채용동향, 청년고용",
  },
  {
    key: "selfEmployed",
    label: "자영업",
    description: "폐업률, 소상공인, 배달앱, 임대료",
  },
  {
    key: "finance",
    label: "금융",
    description: "금리, 가계부채, 연체율, 서민금융",
  },
  {
    key: "realEstate",
    label: "부동산",
    description: "집값, 전세, 월세, 주거비",
  },
];

// -- 카테고리 라벨 맵 (빠른 조회용) --
export const CATEGORY_LABEL_MAP: Record<CategoryKey, string> = {
  prices: "물가",
  employment: "고용",
  selfEmployed: "자영업",
  finance: "금융",
  realEstate: "부동산",
};

// -- 등급 정의 --
export const SEVERITY_CONFIG: {
  key: Severity;
  label: string;
  scoreMin: number;
  scoreMax: number;
  description: string;
}[] = [
  {
    key: "critical",
    label: "긴급",
    scoreMin: 80,
    scoreMax: 100,
    description: "즉각 대응 필요",
  },
  {
    key: "warning",
    label: "주의",
    scoreMin: 60,
    scoreMax: 79,
    description: "주의 깊은 모니터링 필요",
  },
  {
    key: "caution",
    label: "관찰",
    scoreMin: 40,
    scoreMax: 59,
    description: "추이 관찰 필요",
  },
  {
    key: "safe",
    label: "안전",
    scoreMin: 0,
    scoreMax: 39,
    description: "정상 범위",
  },
];

// -- 등급 라벨 맵 (빠른 조회용) --
export const SEVERITY_LABEL_MAP: Record<Severity, string> = {
  critical: "긴급",
  warning: "주의",
  caution: "관찰",
  safe: "안전",
};

// -- 점수로 등급 판별 --
export function getSeverityByScore(score: number): Severity {
  if (score >= 80) return "critical";
  if (score >= 60) return "warning";
  if (score >= 40) return "caution";
  return "safe";
}

// -- 지역 정의 --
export const REGIONS: { id: string; name: string }[] = [
  { id: "nationwide", name: "전국" },
  { id: "seoul", name: "서울" },
  { id: "gyeonggi", name: "경기" },
  { id: "incheon", name: "인천" },
  { id: "busan", name: "부산" },
  { id: "daegu", name: "대구" },
  { id: "gwangju", name: "광주" },
  { id: "daejeon", name: "대전" },
];

// -- 기간 필터 --
export const PERIOD_OPTIONS: { value: string; label: string }[] = [
  { value: "1w", label: "최근 1주" },
  { value: "1m", label: "최근 1개월" },
  { value: "3m", label: "최근 3개월" },
];
