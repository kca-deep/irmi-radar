/**
 * 매경 카테고리 코드 → IRMI 5대 민생 카테고리 매핑
 * docs/maeil-news-data-spec.md 5.1절 기준
 */
import type { CategoryKey } from "@/lib/types";

/** 소분류 코드 → IRMI 카테고리 직접 매핑 */
export const SMALL_CODE_TO_IRMI: Record<string, CategoryKey> = {
  // 물가 (prices)
  MK100103: "prices", // 경기/지표
  MK100106: "prices", // 생활경제
  MK100208: "prices", // 생활경제 (중복 코드)
  MK101604: "prices", // 식품/음식료
  MK101606: "prices", // 쇼핑
  MK101601: "prices", // 백화점/마트

  // 고용 (employment)
  MK100802: "employment", // 노동/노사
  MK100803: "employment", // 취업/채용
  MK700106: "employment", // 취업

  // 자영업 (selfEmployed)
  MK100401: "selfEmployed", // 신설법인
  MK100402: "selfEmployed", // 중견/중소기업
  MK100403: "selfEmployed", // 벤쳐/벤쳐캐피탈
  MK100408: "selfEmployed", // 창업

  // 금융 (finance)
  MK100105: "finance", // 세금
  MK100201: "finance", // 금융정책/일반
  MK100202: "finance", // 외환/환율
  MK100203: "finance", // 은행
  MK100204: "finance", // 보험
  MK100205: "finance", // 저축은행/기타
  MK100206: "finance", // 카드/캐피털
  MK100209: "finance", // 핀테크
  MK100501: "finance", // 증권정책
  MK100502: "finance", // 시황
  MK100503: "finance", // 기업정보
  MK100504: "finance", // 채권
  MK100505: "finance", // 펀드
  MK100506: "finance", // 선물/옵션
  MK100507: "finance", // 공시
  MK100508: "finance", // 해외증시
  MK100509: "finance", // 종목분석
  MK100510: "finance", // 상장공모
  MK100511: "finance", // 가상자산
  MK100512: "finance", // 증권일반
  MK100513: "finance", // 투자전략
  MK100514: "finance", // 파생상품
  MK100515: "finance", // ETF

  // 부동산 (realEstate)
  MK100601: "realEstate", // 아파트/분양
  MK100602: "realEstate", // 시세/시황
  MK100603: "realEstate", // 재개발/재건축
  MK100604: "realEstate", // 상가/오피스텔
  MK100605: "realEstate", // 신도시/토지
  MK100606: "realEstate", // 세제/정책
  MK100607: "realEstate", // 건설업계 동향
  MK100609: "realEstate", // 경매
  MK100610: "realEstate", // 토지
};

/** 복합 카테고리 (여러 민생 카테고리에 걸침) */
export const MIXED_CODES = new Set([
  "MK100101", // 경제일반
  "MK100102", // 정책
  "MK100807", // 보건/복지
  "MK100809", // 지역경제
]);

/** 확실히 제외할 중분류 코드 */
export const EXCLUDED_MIDDLE_CODES = new Set([
  "00308", // English
  "00506", // 스포츠
  "00505", // 문화
  "00888", // 포토
  "00999", // 기타
  "30001", // 사설
  "30002", // 사외칼럼
  "30003", // 매경칼럼
  "30004", // 기자24시
  "30005", // 카툰
  "30006", // 사고/알림
  "60001", // 스타투데이: 핫이슈
  "60002", // 스타투데이: 영화
  "60003", // 스타투데이: 방송/TV
  "60004", // 스타투데이: 가요
  "60005", // 스타투데이: 공연
  "60006", // 스타투데이: 전시
  "60007", // 스타투데이: 포토
  "60008", // 스타투데이
  "60009", // 스타투데이
  "60010", // 스타투데이
  "60011", // 스타투데이
  "60012", // 스타투데이
  "60013", // 스타투데이
]);

/** 키워드 기반 2차 필터링용 민생 키워드 (카테고리별) */
export const IRMI_KEYWORDS: Record<CategoryKey, string[]> = {
  prices: [
    "물가", "소비자물가", "식료품", "공공요금", "생활비",
    "장바구니", "인플레이션", "전기료", "가스비", "수도요금",
    "식비", "교통비", "통신비", "난방비", "유류비",
  ],
  employment: [
    "실업", "고용", "해고", "구조조정", "채용", "취업",
    "청년실업", "일자리", "퇴직", "정리해고", "실업급여",
    "고용률", "실업률", "비정규직", "최저임금",
  ],
  selfEmployed: [
    "자영업", "소상공인", "폐업", "창업", "배달앱",
    "임대료", "프랜차이즈", "소규모사업", "폐업률",
    "골목상권", "상가임대", "영세사업", "1인사업",
  ],
  finance: [
    "금리", "가계부채", "연체율", "서민금융", "대출",
    "이자", "신용", "카드빚", "연체", "파산", "채무",
    "가계대출", "신용대출", "주담대", "다중채무",
  ],
  realEstate: [
    "집값", "전세", "월세", "주거비", "아파트",
    "분양", "재건축", "전월세", "매매가", "전세사기",
    "주택가격", "부동산", "청약", "임대차", "전세보증",
  ],
};

/** 모든 민생 키워드를 하나의 Set으로 (빠른 검색) */
export const ALL_IRMI_KEYWORDS = new Set(
  Object.values(IRMI_KEYWORDS).flat()
);

/** 제목/요약에서 IRMI 카테고리 추론 (키워드 매칭 기반) */
export function inferCategoryFromText(
  title: string,
  summary: string,
  keywords: string[]
): CategoryKey | null {
  const text = `${title} ${summary} ${keywords.join(" ")}`;
  const scores: Record<CategoryKey, number> = {
    prices: 0,
    employment: 0,
    selfEmployed: 0,
    finance: 0,
    realEstate: 0,
  };

  for (const [cat, kws] of Object.entries(IRMI_KEYWORDS)) {
    for (const kw of kws) {
      if (title.includes(kw)) scores[cat as CategoryKey] += 3;
      if (summary.includes(kw)) scores[cat as CategoryKey] += 2;
      if (keywords.some((k) => k.includes(kw))) scores[cat as CategoryKey] += 1;
    }
  }

  const best = Object.entries(scores).sort(
    ([, a], [, b]) => b - a
  )[0] as [CategoryKey, number];

  return best[1] > 0 ? best[0] : null;
}

/** 위기 관련성 점수 계산 (0~100) */
export function calculateRelevanceScore(
  title: string,
  summary: string,
  keywords: string[]
): number {
  let score = 0;
  const text = `${title} ${summary}`;

  for (const kw of ALL_IRMI_KEYWORDS) {
    if (title.includes(kw)) score += 6;
    if (summary.includes(kw)) score += 3;
    if (keywords.some((k) => k.includes(kw))) score += 2;
  }

  return Math.min(score, 100);
}
