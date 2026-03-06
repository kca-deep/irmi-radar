/**
 * 외부 API 데이터 동기화 스크립트
 *
 * 국회 오픈API + 보조금24 API 호출 → SQLite DB 저장
 *
 * 실행: npx tsx scripts/sync-external-apis.ts
 *
 * 파이프라인 순서:
 *   1. preprocess-news.ts  → 뉴스 DB (articles)
 *   2. sync-external-apis.ts → 외부 API (gov_services, assembly_*)  ← 여기
 *   3. analyze-batch.ts    → AI 분석 (analysis, signals)
 */

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DB_PATH = path.join(PROJECT_ROOT, "data", "irmi.db");

// ── .env.local 파싱 ──

function loadEnv(): Record<string, string> {
  const envPath = path.join(PROJECT_ROOT, ".env.local");
  const vars: Record<string, string> = {};
  try {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      vars[trimmed.slice(0, eqIndex).trim()] = trimmed.slice(eqIndex + 1).trim();
    }
  } catch {
    console.error(".env.local not found");
    process.exit(1);
  }
  return vars;
}

// ── 국회 오픈API ──

const ASSEMBLY_BASE = "https://open.assembly.go.kr/portal/openapi";

const ASSEMBLY_APIS = {
  petitions: { code: "nvqbafvaajdiqhehi", name: "청원 계류현황" },
  legislation: { code: "nknalejkafmvgzmpt", name: "진행중 입법예고" },
  bills: { code: "BILLRCP", name: "의안 접수목록", params: { AGE: "22" } },
} as const;

interface AssemblyRow {
  [key: string]: string | number | null;
}

async function fetchAssemblyApi(
  apiKey: string,
  code: string,
  extraParams: Record<string, string> = {},
  pSize = 100
): Promise<AssemblyRow[]> {
  const params = new URLSearchParams({
    Key: apiKey,
    Type: "json",
    pIndex: "1",
    pSize: String(pSize),
    ...extraParams,
  });
  const url = `${ASSEMBLY_BASE}/${code}?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Assembly API ${code}: HTTP ${res.status}`);

  const json = await res.json();
  const apiData = json[code];
  if (!apiData) return [];

  const rowBlock = apiData.find((b: Record<string, unknown>) => b.row);
  return (rowBlock?.row ?? []) as AssemblyRow[];
}

async function syncPetitions(db: Database.Database, apiKey: string) {
  const rows = await fetchAssemblyApi(apiKey, ASSEMBLY_APIS.petitions.code);
  const now = new Date().toISOString();

  db.prepare("DELETE FROM assembly_petitions").run();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO assembly_petitions
    (bill_id, bill_no, name, proposer, approver, propose_dt, committee, link_url, synced_at)
    VALUES (@billId, @billNo, @name, @proposer, @approver, @proposeDt, @committee, @linkUrl, @syncedAt)
  `);

  const tx = db.transaction(() => {
    for (const r of rows) {
      stmt.run({
        billId: r.BILL_ID,
        billNo: r.BILL_NO,
        name: r.BILL_NAME,
        proposer: r.PROPOSER,
        approver: r.APPROVER,
        proposeDt: r.PROPOSE_DT,
        committee: r.CURR_COMMITTEE,
        linkUrl: r.LINK_URL,
        syncedAt: now,
      });
    }
  });
  tx();
  return rows.length;
}

async function syncLegislations(db: Database.Database, apiKey: string) {
  const rows = await fetchAssemblyApi(apiKey, ASSEMBLY_APIS.legislation.code);
  const now = new Date().toISOString();

  db.prepare("DELETE FROM assembly_legislations").run();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO assembly_legislations
    (bill_id, bill_no, name, proposer, proposer_kind, committee, deadline_dt, link_url, synced_at)
    VALUES (@billId, @billNo, @name, @proposer, @proposerKind, @committee, @deadlineDt, @linkUrl, @syncedAt)
  `);

  const tx = db.transaction(() => {
    for (const r of rows) {
      stmt.run({
        billId: r.BILL_ID,
        billNo: r.BILL_NO,
        name: r.BILL_NAME,
        proposer: r.PROPOSER,
        proposerKind: r.PROPOSER_KIND_CD || "",
        committee: r.CURR_COMMITTEE,
        deadlineDt: r.NOTI_ED_DT,
        linkUrl: r.LINK_URL,
        syncedAt: now,
      });
    }
  });
  tx();
  return rows.length;
}

async function syncBills(db: Database.Database, apiKey: string) {
  const rows = await fetchAssemblyApi(
    apiKey,
    ASSEMBLY_APIS.bills.code,
    ASSEMBLY_APIS.bills.params,
    300
  );
  const now = new Date().toISOString();

  // 민생 관련 키워드 필터링
  const KEYWORDS = [
    "물가", "소비자", "식료품", "공공요금", "생활비",
    "고용", "실업", "구조조정", "채용", "청년", "일자리", "노동",
    "자영업", "소상공인", "폐업", "배달", "임대료", "창업", "상가",
    "금리", "가계부채", "연체", "서민금융", "대출", "금융",
    "부동산", "집값", "전세", "월세", "주거", "임대차", "아파트",
  ];

  const filtered = rows.filter((r) => {
    const name = String(r.BILL_NM || "");
    return KEYWORDS.some((kw) => name.includes(kw));
  });

  db.prepare("DELETE FROM assembly_bills").run();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO assembly_bills
    (bill_id, bill_no, name, kind, proposer_kind, propose_dt, result, link_url, synced_at)
    VALUES (@billId, @billNo, @name, @kind, @proposerKind, @proposeDt, @result, @linkUrl, @syncedAt)
  `);

  const tx = db.transaction(() => {
    for (const r of filtered) {
      stmt.run({
        billId: r.BILL_ID,
        billNo: r.BILL_NO,
        name: r.BILL_NM,
        kind: r.BILL_KIND,
        proposerKind: r.PPSR_KIND,
        proposeDt: r.PPSL_DT,
        result: r.PROC_RSLT,
        linkUrl: r.LINK_URL,
        syncedAt: now,
      });
    }
  });
  tx();
  return filtered.length;
}

// ── 보조금24 API ──

const GOV_BASE = "https://api.odcloud.kr/api/gov24/v3";

const GOV_KEYWORDS: Record<string, string[]> = {
  prices: ["물가", "생활비", "에너지", "바우처", "긴급복지"],
  employment: ["고용", "취업", "일자리", "실업", "청년"],
  selfEmployed: ["소상공인", "자영업", "창업", "폐업", "상가"],
  finance: ["금융", "대출", "서민금융", "장려금", "채무"],
  realEstate: ["주거", "전세", "임대", "주택", "월세"],
};

interface GovRawItem {
  [key: string]: string | number | null;
}

async function fetchGovServices(
  apiKey: string,
  keyword: string,
  perPage = 10
): Promise<GovRawItem[]> {
  const url = new URL(`${GOV_BASE}/serviceList`);
  url.searchParams.set("serviceKey", apiKey);
  url.searchParams.set("returnType", "JSON");
  url.searchParams.set("page", "1");
  url.searchParams.set("perPage", String(perPage));
  url.searchParams.set("cond[서비스명::LIKE]", keyword);

  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data ?? []) as GovRawItem[];
}

async function syncGovServices(db: Database.Database, apiKey: string) {
  const now = new Date().toISOString();
  const seen = new Set<string>();
  const allItems: GovRawItem[] = [];

  // 카테고리별 키워드 검색 (대표 2개씩)
  for (const [, keywords] of Object.entries(GOV_KEYWORDS)) {
    for (const kw of keywords.slice(0, 2)) {
      try {
        const items = await fetchGovServices(apiKey, kw, 10);
        for (const item of items) {
          const id = String(item["서비스ID"] ?? "");
          if (id && !seen.has(id)) {
            seen.add(id);
            allItems.push(item);
          }
        }
      } catch {
        console.warn(`  [WARN] 보조금24 검색 실패: ${kw}`);
      }
    }
  }

  db.prepare("DELETE FROM gov_services").run();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO gov_services
    (service_id, service_name, service_purpose, support_type, target_audience,
     selection_criteria, support_content, apply_method, apply_deadline,
     detail_url, org_name, dept_name, contact, service_field, org_type,
     reception_org, view_count, registered_at, modified_at, synced_at)
    VALUES
    (@serviceId, @serviceName, @servicePurpose, @supportType, @targetAudience,
     @selectionCriteria, @supportContent, @applyMethod, @applyDeadline,
     @detailUrl, @orgName, @deptName, @contact, @serviceField, @orgType,
     @receptionOrg, @viewCount, @registeredAt, @modifiedAt, @syncedAt)
  `);

  const tx = db.transaction(() => {
    for (const r of allItems) {
      stmt.run({
        serviceId: String(r["서비스ID"] ?? ""),
        serviceName: String(r["서비스명"] ?? ""),
        servicePurpose: String(r["서비스목적요약"] ?? ""),
        supportType: String(r["지원유형"] ?? ""),
        targetAudience: String(r["지원대상"] ?? ""),
        selectionCriteria: String(r["선정기준"] ?? ""),
        supportContent: String(r["지원내용"] ?? ""),
        applyMethod: String(r["신청방법"] ?? ""),
        applyDeadline: String(r["신청기한"] ?? ""),
        detailUrl: String(r["상세조회URL"] ?? ""),
        orgName: String(r["소관기관명"] ?? ""),
        deptName: String(r["부서명"] ?? ""),
        contact: String(r["전화문의"] ?? ""),
        serviceField: String(r["서비스분야"] ?? ""),
        orgType: String(r["소관기관유형"] ?? ""),
        receptionOrg: String(r["접수기관"] ?? ""),
        viewCount: Number(r["조회수"] ?? 0),
        registeredAt: String(r["등록일시"] ?? ""),
        modifiedAt: String(r["수정일시"] ?? ""),
        syncedAt: now,
      });
    }
  });
  tx();
  return allItems.length;
}

// ── 메인 ──

async function main() {
  const env = loadEnv();

  if (!fs.existsSync(DB_PATH)) {
    console.error(`DB not found: ${DB_PATH}`);
    console.error("Run preprocess-news.ts first.");
    process.exit(1);
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // 테이블이 없으면 생성
  db.exec(`
    CREATE TABLE IF NOT EXISTS gov_services (
      service_id TEXT PRIMARY KEY, service_name TEXT NOT NULL,
      service_purpose TEXT, support_type TEXT, target_audience TEXT,
      selection_criteria TEXT, support_content TEXT, apply_method TEXT,
      apply_deadline TEXT, detail_url TEXT, org_name TEXT, dept_name TEXT,
      contact TEXT, service_field TEXT, org_type TEXT, reception_org TEXT,
      view_count INTEGER DEFAULT 0, registered_at TEXT, modified_at TEXT, synced_at TEXT
    );
    CREATE TABLE IF NOT EXISTS assembly_petitions (
      bill_id TEXT PRIMARY KEY, bill_no TEXT, name TEXT NOT NULL,
      proposer TEXT, approver TEXT, propose_dt TEXT, committee TEXT,
      link_url TEXT, synced_at TEXT
    );
    CREATE TABLE IF NOT EXISTS assembly_legislations (
      bill_id TEXT PRIMARY KEY, bill_no TEXT, name TEXT NOT NULL,
      proposer TEXT, proposer_kind TEXT, committee TEXT, deadline_dt TEXT,
      link_url TEXT, synced_at TEXT
    );
    CREATE TABLE IF NOT EXISTS assembly_bills (
      bill_id TEXT PRIMARY KEY, bill_no TEXT, name TEXT NOT NULL,
      kind TEXT, proposer_kind TEXT, propose_dt TEXT, result TEXT,
      link_url TEXT, synced_at TEXT
    );
  `);

  const startTime = Date.now();
  const results: { name: string; count: number; status: string }[] = [];

  // 국회 API
  const assemblyKey = env.ASSEMBLY_API_KEY;
  if (assemblyKey) {
    console.log("[1/2] 국회 오픈API 동기화...");

    for (const [key, api] of Object.entries(ASSEMBLY_APIS)) {
      try {
        let count = 0;
        if (key === "petitions") count = await syncPetitions(db, assemblyKey);
        else if (key === "legislation") count = await syncLegislations(db, assemblyKey);
        else if (key === "bills") count = await syncBills(db, assemblyKey);
        console.log(`  ${api.name}: ${count}건`);
        results.push({ name: api.name, count, status: "OK" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  ${api.name}: FAIL - ${msg}`);
        results.push({ name: api.name, count: 0, status: `FAIL: ${msg}` });
      }
    }
  } else {
    console.warn("[1/2] ASSEMBLY_API_KEY 미설정, 국회 API 건너뜀");
  }

  // 보조금24 API
  const govKey = env.DATA_GO_KR_API_KEY;
  if (govKey) {
    console.log("[2/2] 보조금24 API 동기화...");
    try {
      const decodedKey = decodeURIComponent(govKey);
      const count = await syncGovServices(db, decodedKey);
      console.log(`  공공서비스: ${count}건`);
      results.push({ name: "보조금24 공공서비스", count, status: "OK" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  보조금24: FAIL - ${msg}`);
      results.push({ name: "보조금24 공공서비스", count: 0, status: `FAIL: ${msg}` });
    }
  } else {
    console.warn("[2/2] DATA_GO_KR_API_KEY 미설정, 보조금24 건너뜀");
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n========================================");
  console.log("외부 API 동기화 완료");
  console.log(`소요 시간: ${elapsed}s`);
  console.log("----------------------------------------");
  for (const r of results) {
    console.log(`  [${r.status}] ${r.name}: ${r.count}건`);
  }
  console.log("========================================");

  db.close();
}

main();
