import type {
  AssemblyPetition,
  AssemblyLegislation,
  AssemblyBill,
} from "@/lib/types";

const BASE_URL = "https://open.assembly.go.kr/portal/openapi";

const API_CODES = {
  petitions: "nvqbafvaajdiqhehi",
  legislation: "nknalejkafmvgzmpt",
  bills: "BILLRCP",
} as const;

type ApiType = keyof typeof API_CODES;

interface AssemblyApiHead {
  list_total_count?: number;
  RESULT?: { CODE: string; MESSAGE: string };
}

interface AssemblyApiResponse<T> {
  [key: string]: [{ head: AssemblyApiHead[] }, { row: T[] }];
}

// -- 공통 fetch --
async function fetchAssemblyApi<T>(
  type: ApiType,
  params?: Record<string, string>
): Promise<{ rows: T[]; totalCount: number }> {
  const apiKey = process.env.ASSEMBLY_API_KEY;
  if (!apiKey) {
    throw new Error("ASSEMBLY_API_KEY is not configured");
  }

  const code = API_CODES[type];
  const searchParams = new URLSearchParams({
    Key: apiKey,
    Type: "json",
    pIndex: "1",
    pSize: "20",
    ...params,
  });

  const url = `${BASE_URL}/${code}?${searchParams.toString()}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });

  if (!res.ok) {
    throw new Error(`Assembly API returned ${res.status}`);
  }

  const json = await res.json();
  const apiData = json[code];

  if (!apiData) {
    const result = json.RESULT;
    if (result?.CODE === "INFO-200") {
      return { rows: [], totalCount: 0 };
    }
    throw new Error(result?.MESSAGE || "No data returned");
  }

  const headBlock = apiData.find(
    (block: Record<string, unknown>) => block.head
  );
  const rowBlock = apiData.find(
    (block: Record<string, unknown>) => block.row
  );

  const totalCount =
    headBlock?.head?.find(
      (h: AssemblyApiHead) => h.list_total_count !== undefined
    )?.list_total_count ?? 0;
  const rows = (rowBlock?.row ?? []) as T[];

  return { rows, totalCount };
}

// -- Raw 타입 --
interface RawPetition {
  BILL_NO: string;
  BILL_ID: string;
  BILL_NAME: string;
  PROPOSER: string;
  APPROVER: string;
  PROPOSE_DT: string;
  CURR_COMMITTEE: string;
  LINK_URL: string;
}

interface RawLegislation {
  BILL_ID: string;
  BILL_NO: string;
  BILL_NAME: string;
  PROPOSER: string;
  PROPOSER_KIND_CD: string;
  CURR_COMMITTEE: string;
  NOTI_ED_DT: string;
  LINK_URL: string;
}

interface RawBill {
  BILL_ID: string;
  BILL_NO: string;
  BILL_NM: string;
  BILL_KIND: string;
  PPSR_KIND: string;
  PPSL_DT: string;
  PROC_RSLT: string;
  LINK_URL: string;
}

// -- 청원 계류현황 --
export async function fetchPetitions(
  limit = 10
): Promise<AssemblyPetition[]> {
  const { rows } = await fetchAssemblyApi<RawPetition>("petitions", {
    pSize: String(limit),
  });

  return rows.map((r) => ({
    billNo: r.BILL_NO,
    billId: r.BILL_ID,
    name: r.BILL_NAME,
    proposer: r.PROPOSER,
    approver: r.APPROVER,
    proposeDt: r.PROPOSE_DT,
    committee: r.CURR_COMMITTEE,
    linkUrl: r.LINK_URL,
  }));
}

// -- 진행중 입법예고 --
export async function fetchLegislationNotices(
  limit = 10
): Promise<AssemblyLegislation[]> {
  const { rows } = await fetchAssemblyApi<RawLegislation>("legislation", {
    pSize: String(limit),
  });

  return rows.map((r) => ({
    billId: r.BILL_ID,
    billNo: r.BILL_NO,
    name: r.BILL_NAME,
    proposer: r.PROPOSER,
    proposerKind: r.PROPOSER_KIND_CD,
    committee: r.CURR_COMMITTEE,
    deadlineDt: r.NOTI_ED_DT,
    linkUrl: r.LINK_URL,
  }));
}

// -- 의안 접수목록 (키워드 필터링) --
export async function fetchBills(
  keyword?: string,
  limit = 10
): Promise<AssemblyBill[]> {
  const { rows } = await fetchAssemblyApi<RawBill>("bills", {
    AGE: "22",
    pSize: keyword ? "100" : String(limit),
  });

  let mapped = rows.map((r) => ({
    billId: r.BILL_ID,
    billNo: r.BILL_NO,
    name: r.BILL_NM,
    kind: r.BILL_KIND,
    proposerKind: r.PPSR_KIND,
    proposeDt: r.PPSL_DT,
    result: r.PROC_RSLT,
    linkUrl: r.LINK_URL,
  }));

  if (keyword) {
    const keywords = keyword.split(",").map((k) => k.trim());
    mapped = mapped.filter((bill) =>
      keywords.some((kw) => bill.name.includes(kw))
    );
  }

  return mapped.slice(0, limit);
}

// -- 키워드로 입법예고 필터링 --
export async function fetchLegislationByKeywords(
  keywords: string[],
  limit = 5
): Promise<AssemblyLegislation[]> {
  const all = await fetchLegislationNotices(50);
  const filtered = all.filter((item) =>
    keywords.some((kw) => item.name.includes(kw))
  );
  return filtered.slice(0, limit);
}

// -- 키워드로 의안 필터링 --
export async function fetchBillsByKeywords(
  keywords: string[],
  limit = 5
): Promise<AssemblyBill[]> {
  return fetchBills(keywords.join(","), limit);
}
