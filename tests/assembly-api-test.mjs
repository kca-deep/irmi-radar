/**
 * 국회 오픈API 테스트 스크립트
 * 핵심 5개 API 호출 후 응답 데이터를 tests/results/ 에 JSON 저장
 *
 * 실행: node tests/assembly-api-test.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const RESULTS_DIR = resolve(__dirname, "results");

// .env.local 파싱
function loadEnv() {
  const envPath = resolve(ROOT, ".env.local");
  try {
    const content = readFileSync(envPath, "utf-8");
    const vars = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      vars[key] = value;
    }
    return vars;
  } catch {
    console.error("[ERROR] .env.local 파일을 찾을 수 없습니다.");
    process.exit(1);
  }
}

const BASE_URL = "https://open.assembly.go.kr/portal/openapi";

// 테스트 대상 API 목록
const API_LIST = [
  {
    name: "NABO 경제전망",
    code: "npmbwjybaffxwvbbk",
    filename: "nabo-economic-forecast",
  },
  {
    name: "진행중 입법예고",
    code: "nknalejkafmvgzmpt",
    filename: "legislation-notice-active",
  },
  {
    name: "의안 접수목록",
    code: "BILLRCP",
    filename: "bill-received",
    params: { AGE: "22" },
  },
  {
    name: "NARS 현안분석",
    code: "nvkfeqbsacvlzjmea",
    filename: "nars-issue-analysis",
  },
  {
    name: "청원 계류현황",
    code: "nvqbafvaajdiqhehi",
    filename: "petition-pending",
  },
];

// 개별 API 호출
async function testApi(apiKey, { name, code, filename, params }) {
  const extraParams = params
    ? "&" + Object.entries(params).map(([k, v]) => `${k}=${v}`).join("&")
    : "";
  const url = `${BASE_URL}/${code}?Key=${apiKey}&Type=json&pIndex=1&pSize=5${extraParams}`;
  const separator = "=".repeat(60);

  console.log(`\n${separator}`);
  console.log(`[TEST] ${name} (${code})`);
  console.log(separator);

  try {
    const res = await fetch(url);
    console.log(`  Status: ${res.status}`);

    if (!res.ok) {
      const errorResult = { api: name, code, status: res.status, error: "HTTP Error", data: null };
      saveResult(filename, errorResult);
      return;
    }

    const json = await res.json();

    // 응답 구조 분석
    const apiData = json[code];

    if (!apiData) {
      console.log("  응답에 데이터 키가 없습니다. 전체 응답 키:", Object.keys(json));
      const errorResult = { api: name, code, status: res.status, error: "No data key", rawKeys: Object.keys(json), data: json };
      saveResult(filename, errorResult);
      return;
    }

    // head 정보 추출
    const headBlock = apiData.find((block) => block.head);
    const rowBlock = apiData.find((block) => block.row);

    const head = headBlock?.head || [];
    const rows = rowBlock?.row || [];

    // head에서 총 건수, 결과코드 추출
    const totalCount = head.find((h) => h.list_total_count)?.list_total_count;
    const resultInfo = head.find((h) => h.RESULT);
    const resultCode = resultInfo?.RESULT?.CODE;
    const resultMessage = resultInfo?.RESULT?.MESSAGE;

    console.log(`  결과코드: ${resultCode} (${resultMessage})`);
    console.log(`  총 건수: ${totalCount}`);
    console.log(`  조회 건수: ${rows.length}`);

    if (rows.length > 0) {
      const fields = Object.keys(rows[0]);
      console.log(`  필드 목록 (${fields.length}개): ${fields.join(", ")}`);
      console.log(`  첫 번째 데이터 샘플:`);

      for (const [key, value] of Object.entries(rows[0])) {
        const display = typeof value === "string" && value.length > 80
          ? value.slice(0, 80) + "..."
          : value;
        console.log(`    ${key}: ${display}`);
      }
    }

    // JSON 파일 저장
    const result = {
      api: name,
      code,
      status: res.status,
      resultCode,
      resultMessage,
      totalCount,
      fetchedCount: rows.length,
      fields: rows.length > 0 ? Object.keys(rows[0]) : [],
      rows,
    };
    saveResult(filename, result);

  } catch (err) {
    console.error(`  [ERROR] ${err.message}`);
    const errorResult = { api: name, code, error: err.message, data: null };
    saveResult(filename, errorResult);
  }
}

function saveResult(filename, data) {
  const filePath = resolve(RESULTS_DIR, `${filename}.json`);
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`  >> 저장: tests/results/${filename}.json`);
}

// 메인 실행
async function main() {
  const env = loadEnv();
  const apiKey = env.ASSEMBLY_API_KEY;

  if (!apiKey) {
    console.error("[ERROR] ASSEMBLY_API_KEY가 .env.local에 설정되지 않았습니다.");
    process.exit(1);
  }

  console.log("국회 오픈API 테스트 시작");
  console.log(`대상 API: ${API_LIST.length}개`);
  console.log(`API Key: ${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`);

  mkdirSync(RESULTS_DIR, { recursive: true });

  for (const api of API_LIST) {
    await testApi(apiKey, api);
  }

  // 전체 요약 저장
  const summary = {
    testedAt: new Date().toISOString(),
    apiCount: API_LIST.length,
    apis: API_LIST.map((a) => ({ name: a.name, code: a.code, resultFile: `${a.filename}.json` })),
  };
  saveResult("_summary", summary);

  console.log("\n" + "=".repeat(60));
  console.log("테스트 완료. 결과: tests/results/");
}

main();
