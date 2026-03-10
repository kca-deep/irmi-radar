/**
 * 지역별 위기 현황 집계 모듈
 * analysis.impact_region을 17개 시도로 정규화하여 regions 테이블에 저장
 */

import { getDb } from "@/lib/db/index";

// -- 17개 시도 정규화 매핑 --

const REGION_NAMES = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
] as const;

/** 하위 시군구 → 시도 매핑 */
const SUB_REGION_MAP: Record<string, string> = {
  // 서울
  강남구: "서울", 강동구: "서울", 강북구: "서울", 강서구: "서울",
  관악구: "서울", 광진구: "서울", 구로구: "서울", 금천구: "서울",
  노원구: "서울", 도봉구: "서울", 동대문구: "서울", 동작구: "서울",
  마포구: "서울", 서대문구: "서울", 서초구: "서울", 성동구: "서울",
  성북구: "서울", 송파구: "서울", 양천구: "서울", 영등포구: "서울",
  용산구: "서울", 은평구: "서울", 종로구: "서울", 중구: "서울", 중랑구: "서울",
  서울특별시: "서울",
  // 경기
  수원: "경기", 성남: "경기", 고양: "경기", 용인: "경기", 부천: "경기",
  안산: "경기", 안양: "경기", 남양주: "경기", 화성: "경기", 평택: "경기",
  의정부: "경기", 시흥: "경기", 파주: "경기", 김포: "경기", 광명: "경기",
  광주시: "경기", 군포: "경기", 이천: "경기", 오산: "경기", 하남: "경기",
  경기도: "경기",
  // 인천
  인천광역시: "인천", 미추홀구: "인천", 연수구: "인천", 남동구: "인천",
  부평구: "인천", 계양구: "인천", 서구: "인천",
  // 부산
  부산광역시: "부산", 해운대구: "부산",
  // 대구
  대구광역시: "대구",
  // 광주
  광주광역시: "광주",
  // 대전
  대전광역시: "대전",
  // 울산
  울산광역시: "울산",
  // 세종
  세종특별자치시: "세종",
  // 강원
  강원도: "강원", 강원특별자치도: "강원", 춘천: "강원", 원주: "강원", 강릉: "강원",
  // 충북
  충청북도: "충북", 청주: "충북", 충주: "충북",
  // 충남
  충청남도: "충남", 천안: "충남", 아산: "충남",
  // 전북
  전라북도: "전북", 전북특별자치도: "전북", 전주: "전북",
  // 전남
  전라남도: "전남", 여수: "전남", 순천: "전남", 목포: "전남",
  // 경북
  경상북도: "경북", 포항: "경북", 구미: "경북", 경주: "경북",
  // 경남
  경상남도: "경남", 창원: "경남", 김해: "경남", 진주: "경남", 거제: "경남",
  // 제주
  제주특별자치도: "제주", 제주시: "제주", 서귀포: "제주",
};

/**
 * 원시 지역 문자열을 17개 시도 중 하나로 정규화
 * 매핑 불가(해외 등)면 null 반환
 */
export function normalizeRegion(raw: string | null): string | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  // 정확히 17개 시도명 중 하나
  if ((REGION_NAMES as readonly string[]).includes(trimmed)) return trimmed;

  // 하위 시군구 매핑 테이블 조회
  if (SUB_REGION_MAP[trimmed]) return SUB_REGION_MAP[trimmed];

  // "서울 강남구" → 앞부분 추출
  const parts = trimmed.split(/[\s,]+/);
  for (const part of parts) {
    if ((REGION_NAMES as readonly string[]).includes(part)) return part;
    if (SUB_REGION_MAP[part]) return SUB_REGION_MAP[part];
  }

  // 시도명 포함 여부 ("서울특별시 강남구" 등)
  for (const name of REGION_NAMES) {
    if (trimmed.includes(name)) return name;
  }

  // 매핑 불가 (해외 지역 등)
  return null;
}

// -- 지역별 집계 --

export interface RegionScore {
  id: string;
  name: string;
  score: number;
  trend: "rising" | "stable" | "falling";
  categoryPrices: number;
  categoryEmployment: number;
  categorySelfEmployed: number;
  categoryFinance: number;
  categoryRealEstate: number;
  topIssue: string;
}

export function aggregateRegions(): RegionScore[] {
  const db = getDb();

  // analysis.impact_region이 있는 행 조회
  const rows = db
    .prepare(
      `SELECT an.impact_region, an.risk_score, a.category, an.key_factors
       FROM analysis an
       INNER JOIN articles a ON an.article_id = a.id
       WHERE an.impact_region IS NOT NULL
         AND an.impact_region != 'null'
         AND an.impact_region != ''`
    )
    .all() as {
    impact_region: string;
    risk_score: number;
    category: string;
    key_factors: string | null;
  }[];

  // 지역별 집계
  const regionMap = new Map<
    string,
    {
      scores: number[];
      categories: Record<string, number[]>;
      factors: Map<string, number>;
    }
  >();

  for (const row of rows) {
    const region = normalizeRegion(row.impact_region);
    if (!region) continue;

    if (!regionMap.has(region)) {
      regionMap.set(region, {
        scores: [],
        categories: {},
        factors: new Map(),
      });
    }

    const data = regionMap.get(region)!;
    data.scores.push(row.risk_score);

    if (!data.categories[row.category]) {
      data.categories[row.category] = [];
    }
    data.categories[row.category].push(row.risk_score);

    try {
      const factors = JSON.parse(row.key_factors || "[]") as string[];
      for (const f of factors) {
        data.factors.set(f, (data.factors.get(f) || 0) + 1);
      }
    } catch { /* skip */ }
  }

  // RegionScore 배열 생성
  const results: RegionScore[] = [];

  for (const name of REGION_NAMES) {
    const data = regionMap.get(name);

    const avg = (arr: number[]) =>
      arr.length > 0 ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;

    const score = data ? avg(data.scores) : 0;
    const catScores = data?.categories || {};

    // 상위 이슈
    let topIssue = "";
    if (data?.factors.size) {
      const sorted = [...data.factors.entries()].sort((a, b) => b[1] - a[1]);
      topIssue = sorted[0]?.[0] || "";
    }

    const regionScore: RegionScore = {
      id: name,
      name,
      score,
      trend: "stable" as const,
      categoryPrices: avg(catScores["prices"] || []),
      categoryEmployment: avg(catScores["employment"] || []),
      categorySelfEmployed: avg(catScores["selfEmployed"] || []),
      categoryFinance: avg(catScores["finance"] || []),
      categoryRealEstate: avg(catScores["realEstate"] || []),
      topIssue,
    };

    results.push(regionScore);
  }

  // DB 저장
  const upsert = db.prepare(`
    INSERT OR REPLACE INTO regions
      (id, name, score, trend, category_prices, category_employment, category_self_employed, category_finance, category_real_estate, top_issue, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const txn = db.transaction(() => {
    for (const r of results) {
      upsert.run(
        r.id,
        r.name,
        r.score,
        r.trend,
        r.categoryPrices,
        r.categoryEmployment,
        r.categorySelfEmployed,
        r.categoryFinance,
        r.categoryRealEstate,
        r.topIssue
      );
    }
  });
  txn();

  return results;
}
