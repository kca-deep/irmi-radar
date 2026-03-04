import { GOV_SERVICE_KEYWORDS } from "@/lib/constants";
import type { CategoryKey, GovService, Policy } from "@/lib/types";

const BASE_URL = "https://api.odcloud.kr/api/gov24/v3";

function getApiKey(): string {
  const raw = process.env.DATA_GO_KR_API_KEY;
  if (!raw) throw new Error("DATA_GO_KR_API_KEY not configured");
  // .env에 URL 인코딩된 키가 저장될 수 있으므로 디코딩
  return decodeURIComponent(raw);
}

// -- 공통 fetch --
async function fetchGovApi<T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.set("serviceKey", getApiKey());
  url.searchParams.set("returnType", "JSON");

  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gov API error ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

// -- Raw 응답 타입 --
interface GovApiResponse {
  page: number;
  perPage: number;
  totalCount: number;
  currentCount: number;
  matchCount: number;
  data: Record<string, unknown>[];
}

// -- Raw -> GovService 변환 --
function toGovService(raw: Record<string, unknown>): GovService {
  return {
    serviceId: String(raw["서비스ID"] ?? ""),
    serviceName: String(raw["서비스명"] ?? ""),
    servicePurpose: String(raw["서비스목적요약"] ?? ""),
    supportType: String(raw["지원유형"] ?? ""),
    targetAudience: String(raw["지원대상"] ?? ""),
    selectionCriteria: String(raw["선정기준"] ?? ""),
    supportContent: String(raw["지원내용"] ?? ""),
    applyMethod: String(raw["신청방법"] ?? ""),
    applyDeadline: String(raw["신청기한"] ?? ""),
    detailUrl: String(raw["상세조회URL"] ?? ""),
    orgName: String(raw["소관기관명"] ?? ""),
    deptName: String(raw["부서명"] ?? ""),
    contact: String(raw["전화문의"] ?? ""),
    serviceField: String(raw["서비스분야"] ?? ""),
    orgType: String(raw["소관기관유형"] ?? ""),
    receptionOrg: String(raw["접수기관"] ?? ""),
    viewCount: Number(raw["조회수"] ?? 0),
    registeredAt: String(raw["등록일시"] ?? ""),
    modifiedAt: String(raw["수정일시"] ?? ""),
  };
}

// -- GovService -> Policy 변환 --
export function govServiceToPolicy(
  svc: GovService,
  categories: CategoryKey[] = []
): Policy {
  return {
    id: `gov-${svc.serviceId}`,
    title: svc.serviceName,
    description: svc.servicePurpose,
    provider: svc.orgName,
    contact: svc.contact.split("||")[0] || "",
    url: svc.detailUrl,
    targetCategories: categories.length > 0 ? categories : detectCategories(svc),
    targetRegions: [],
    relatedSignals: [],
    eligibility: cleanText(svc.targetAudience),
    benefit: cleanText(svc.supportContent),
  };
}

// -- 텍스트 정리 (줄바꿈/특수문자 제거) --
function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// -- 카테고리 자동 감지 --
function detectCategories(svc: GovService): CategoryKey[] {
  const text = `${svc.serviceName} ${svc.servicePurpose} ${svc.serviceField}`;
  const matched: CategoryKey[] = [];

  for (const [cat, keywords] of Object.entries(GOV_SERVICE_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) {
      matched.push(cat as CategoryKey);
    }
  }

  return matched.length > 0 ? matched : ["prices"]; // fallback
}

// -- 서비스 목록 조회 --
export async function fetchGovServiceList(params: {
  keyword?: string;
  field?: string;
  page?: number;
  perPage?: number;
}): Promise<{ services: GovService[]; totalCount: number }> {
  const queryParams: Record<string, string> = {
    page: String(params.page ?? 1),
    perPage: String(params.perPage ?? 10),
  };

  if (params.keyword) {
    queryParams["cond[서비스명::LIKE]"] = params.keyword;
  }
  if (params.field) {
    queryParams["cond[서비스분야::LIKE]"] = params.field;
  }

  const res = await fetchGovApi<GovApiResponse>("serviceList", queryParams);
  return {
    services: (res.data || []).map(toGovService),
    totalCount: res.matchCount ?? res.totalCount ?? 0,
  };
}

// -- 카테고리별 서비스 조회 (대표 키워드 2개 병렬 검색 + 합산) --
export async function fetchGovServicesByCategory(
  category: CategoryKey,
  limit: number = 5
): Promise<GovService[]> {
  const keywords = GOV_SERVICE_KEYWORDS[category];
  // 대표 키워드 2개만 사용 (API 호출 최소화)
  const searchKeywords = keywords.slice(0, 2);

  const results = await Promise.all(
    searchKeywords.map((kw) =>
      fetchGovServiceList({ keyword: kw, perPage: limit }).catch(() => ({
        services: [],
        totalCount: 0,
      }))
    )
  );

  // 합산 + 중복 제거
  const seen = new Set<string>();
  const merged: GovService[] = [];

  for (const r of results) {
    for (const svc of r.services) {
      if (!seen.has(svc.serviceId)) {
        seen.add(svc.serviceId);
        merged.push(svc);
      }
    }
  }

  // 조회수 내림차순 정렬
  merged.sort((a, b) => b.viewCount - a.viewCount);

  return merged.slice(0, limit);
}

// -- 카테고리별 Policy 변환 조회 --
export async function fetchPoliciesByCategory(
  category: CategoryKey,
  limit: number = 5
): Promise<Policy[]> {
  const services = await fetchGovServicesByCategory(category, limit);
  return services.map((svc) => govServiceToPolicy(svc, [category]));
}

// -- 인기 서비스 조회 (대시보드용) --
export async function fetchPopularGovServices(
  limit: number = 10
): Promise<GovService[]> {
  const { services } = await fetchGovServiceList({ perPage: limit });
  // API 기본 정렬이 조회수 순이 아닐 수 있으므로 재정렬
  services.sort((a, b) => b.viewCount - a.viewCount);
  return services.slice(0, limit);
}
