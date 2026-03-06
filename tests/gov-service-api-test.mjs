/**
 * 행안부 공공서비스(보조금24) API 테스트
 * 3개 엔드포인트: serviceList, serviceDetail, supportConditions
 *
 * 실행: node tests/gov-service-api-test.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(__dirname, "results");

// .env.local에서 키 읽기
function loadApiKey() {
  const envPath = path.join(__dirname, "..", ".env.local");
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("DATA_GO_KR_API_KEY=") && !trimmed.startsWith("#")) {
      return trimmed.split("=").slice(1).join("=");
    }
  }
  throw new Error("DATA_GO_KR_API_KEY not found in .env.local");
}

// .env.local의 키가 이미 URL 인코딩된 상태일 수 있으므로 디코딩
const RAW_KEY = loadApiKey();
const API_KEY = decodeURIComponent(RAW_KEY);
const BASE_URL = "https://api.odcloud.kr/api/gov24/v3";

async function fetchApi(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.set("serviceKey", API_KEY);
  url.searchParams.set("returnType", "JSON");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  console.log(`  URL: ${url.toString().replace(encodeURIComponent(API_KEY), "***")}`);
  const res = await fetch(url.toString());
  console.log(`  Status: ${res.status}`);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

function saveResult(filename, data) {
  const filePath = path.join(RESULTS_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`  -> ${filePath}\n`);
}

async function testServiceList() {
  console.log("=== 1. serviceList (공공서비스 목록 조회) ===");
  const data = await fetchApi("serviceList", { page: 1, perPage: 5 });
  console.log(`  totalCount: ${data.totalCount}`);
  console.log(`  currentCount: ${data.currentCount}`);
  if (data.data && data.data.length > 0) {
    const first = data.data[0];
    console.log(`  fields: ${Object.keys(first).join(", ")}`);
    console.log(`  sample: ${first["서비스명"]} (${first["소관기관명"]})`);
  }
  saveResult("gov-service-list.json", data);
  return data;
}

async function testServiceListSearch() {
  console.log("=== 2. serviceList - 키워드 검색 (소상공인) ===");
  const data = await fetchApi("serviceList", {
    page: 1,
    perPage: 5,
    "cond[서비스명::LIKE]": "소상공인",
  });
  console.log(`  matchCount: ${data.matchCount}`);
  if (data.data) {
    data.data.forEach((d, i) => {
      console.log(`  [${i + 1}] ${d["서비스명"]} - ${d["지원유형"]} (${d["소관기관명"]})`);
    });
  }
  saveResult("gov-service-list-search.json", data);
  return data;
}

async function testServiceDetail() {
  console.log("=== 3. serviceDetail (공공서비스 상세 조회) ===");
  const data = await fetchApi("serviceDetail", { page: 1, perPage: 3 });
  console.log(`  totalCount: ${data.totalCount}`);
  if (data.data && data.data.length > 0) {
    const first = data.data[0];
    console.log(`  fields: ${Object.keys(first).join(", ")}`);
    console.log(`  sample: ${first["서비스명"]}`);
    console.log(`  지원대상: ${(first["지원대상"] || "").slice(0, 80)}...`);
    console.log(`  법령: ${first["법령"] || "(없음)"}`);
  }
  saveResult("gov-service-detail.json", data);
  return data;
}

async function testSupportConditions() {
  console.log("=== 4. supportConditions (지원조건 조회) ===");
  const data = await fetchApi("supportConditions", { page: 1, perPage: 3 });
  console.log(`  totalCount: ${data.totalCount}`);
  if (data.data && data.data.length > 0) {
    const first = data.data[0];
    const jaFields = Object.keys(first).filter((k) => k.startsWith("JA"));
    console.log(`  fields: ${Object.keys(first).join(", ")}`);
    console.log(`  JA fields count: ${jaFields.length}`);
    console.log(`  sample 서비스ID: ${first["서비스ID"]}`);
    // Y값인 조건만 표시
    const activeConditions = jaFields.filter((k) => first[k] === "Y");
    console.log(`  active conditions: ${activeConditions.join(", ") || "(none)"}`);
  }
  saveResult("gov-support-conditions.json", data);
  return data;
}

async function testSupportConditionsById(serviceId) {
  console.log(`=== 5. supportConditions - 특정 서비스 (${serviceId}) ===`);
  const data = await fetchApi("supportConditions", {
    page: 1,
    perPage: 1,
    "cond[서비스ID::EQ]": serviceId,
  });
  console.log(`  matchCount: ${data.matchCount}`);
  if (data.data && data.data.length > 0) {
    const item = data.data[0];
    const jaFields = Object.keys(item).filter((k) => k.startsWith("JA"));
    const active = jaFields.filter((k) => item[k] === "Y");
    console.log(`  active conditions: ${active.join(", ") || "(none)"}`);
  }
  saveResult("gov-support-conditions-by-id.json", data);
  return data;
}

// 실행
(async () => {
  console.log(`\nAPI Key: ${API_KEY.slice(0, 8)}...`);
  console.log(`Base URL: ${BASE_URL}\n`);

  const summary = { testedAt: new Date().toISOString(), results: [] };

  const tests = [
    { name: "serviceList", fn: testServiceList },
    { name: "serviceList-search", fn: testServiceListSearch },
    { name: "serviceDetail", fn: testServiceDetail },
    { name: "supportConditions", fn: testSupportConditions },
  ];

  for (const t of tests) {
    try {
      const data = await t.fn();
      summary.results.push({
        name: t.name,
        status: "OK",
        totalCount: data.totalCount ?? 0,
        currentCount: data.currentCount ?? 0,
      });
    } catch (err) {
      console.error(`  ERROR: ${err.message}\n`);
      summary.results.push({ name: t.name, status: "FAIL", error: err.message });
    }
  }

  // serviceList 결과에서 서비스ID 추출하여 조건 조회 테스트
  const listResult = summary.results.find((r) => r.name === "serviceList");
  if (listResult && listResult.status === "OK") {
    try {
      const listData = JSON.parse(
        fs.readFileSync(path.join(RESULTS_DIR, "gov-service-list.json"), "utf-8")
      );
      if (listData.data && listData.data.length > 0) {
        const svcId = listData.data[0]["서비스ID"];
        const data = await testSupportConditionsById(svcId);
        summary.results.push({
          name: "supportConditions-byId",
          status: "OK",
          serviceId: svcId,
          matchCount: data.matchCount ?? 0,
        });
      }
    } catch (err) {
      console.error(`  ERROR: ${err.message}\n`);
      summary.results.push({ name: "supportConditions-byId", status: "FAIL", error: err.message });
    }
  }

  saveResult("gov-service-summary.json", summary);

  console.log("========== SUMMARY ==========");
  const passed = summary.results.filter((r) => r.status === "OK").length;
  const failed = summary.results.filter((r) => r.status === "FAIL").length;
  console.log(`Total: ${summary.results.length} | OK: ${passed} | FAIL: ${failed}`);
  summary.results.forEach((r) => {
    console.log(`  [${r.status}] ${r.name}${r.totalCount ? ` (${r.totalCount}건)` : ""}`);
  });
})();
