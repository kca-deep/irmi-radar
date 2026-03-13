/**
 * DB 마이그레이션 스크립트
 * articles/analysis 보존, 분석 결과 테이블 재생성
 */
import Database from "better-sqlite3";
import path from "path";
import { SCHEMA_SQL, INDEX_SQL, FTS_SQL, FTS_TRIGGERS_SQL } from "../lib/db/schema";

const DB_PATH = path.join(process.cwd(), "data", "irmi.db");

console.log("DB 경로:", DB_PATH);

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = OFF"); // 마이그레이션 중 FK 비활성화

// 마이그레이션 전 상태
console.log("\n=== 마이그레이션 전 ===");
const beforeTables = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '%fts%' ORDER BY name"
).all() as { name: string }[];

for (const t of beforeTables) {
  const count = db.prepare(`SELECT COUNT(*) as c FROM "${t.name}"`).get() as { c: number };
  console.log(`  ${t.name}: ${count.c}건`);
}

// analysis_runs 존재 여부로 마이그레이션 필요성 판단
const hasRunsTable = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name='analysis_runs'"
).get();

if (hasRunsTable) {
  console.log("\n이미 마이그레이션 완료된 DB입니다.");
  db.close();
  process.exit(0);
}

console.log("\n=== 마이그레이션 시작 ===");

// DROP 대상 테이블 (articles, analysis, articles_fts*, assembly_*, gov_services, policies 제외)
const tablesToDrop = [
  "signal_articles",
  "signals",
  "regions",
  "dashboard_cache",
  "score_history",
];

for (const table of tablesToDrop) {
  const exists = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
  ).get(table);
  if (exists) {
    db.exec(`DROP TABLE IF EXISTS "${table}";`);
    console.log(`  DROP TABLE ${table}`);
  }
}

// 관련 인덱스 정리
const indexesToDrop = [
  "idx_signals_severity",
  "idx_signals_category",
  "idx_signals_detected",
  "idx_regions_score",
  "idx_score_history_date",
];

for (const idx of indexesToDrop) {
  db.exec(`DROP INDEX IF EXISTS "${idx}";`);
}

console.log("  기존 테이블/인덱스 삭제 완료");

// 새 스키마 적용
console.log("  새 스키마 적용 중...");
db.exec(SCHEMA_SQL);
db.exec(INDEX_SQL);
db.exec(FTS_SQL);
db.exec(FTS_TRIGGERS_SQL);
console.log("  스키마 적용 완료");

db.pragma("foreign_keys = ON");

// 마이그레이션 후 상태
console.log("\n=== 마이그레이션 후 ===");
const afterTables = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '%fts%' ORDER BY name"
).all() as { name: string }[];

for (const t of afterTables) {
  const count = db.prepare(`SELECT COUNT(*) as c FROM "${t.name}"`).get() as { c: number };
  console.log(`  ${t.name}: ${count.c}건`);
}

// 새 테이블 스키마 확인
console.log("\n=== 신규/변경 테이블 스키마 ===");

console.log("\nanalysis_runs:");
const runCols = db.prepare("PRAGMA table_info(analysis_runs)").all() as { name: string; type: string; pk: number }[];
for (const c of runCols) console.log(`  ${c.name} (${c.type})${c.pk ? " [PK]" : ""}`);

console.log("\nsignals (PK: id + run_id):");
const sigCols = db.prepare("PRAGMA table_info(signals)").all() as { name: string; type: string; pk: number }[];
for (const c of sigCols) console.log(`  ${c.name} (${c.type})${c.pk ? " [PK]" : ""}`);

console.log("\nregions (PK: run_id + id):");
const regCols = db.prepare("PRAGMA table_info(regions)").all() as { name: string; type: string; pk: number }[];
for (const c of regCols) console.log(`  ${c.name} (${c.type})${c.pk ? " [PK]" : ""}`);

console.log("\ndashboard_snapshots:");
const dsCols = db.prepare("PRAGMA table_info(dashboard_snapshots)").all() as { name: string; type: string; pk: number }[];
for (const c of dsCols) console.log(`  ${c.name} (${c.type})${c.pk ? " [PK]" : ""}`);

console.log("\ncategory_details:");
const cdCols = db.prepare("PRAGMA table_info(category_details)").all() as { name: string; type: string; pk: number }[];
for (const c of cdCols) console.log(`  ${c.name} (${c.type})${c.pk ? " [PK]" : ""}`);

console.log("\nscore_history:");
const shCols = db.prepare("PRAGMA table_info(score_history)").all() as { name: string; type: string; pk: number }[];
for (const c of shCols) console.log(`  ${c.name} (${c.type})${c.pk ? " [PK]" : ""}`);

// 보존 확인
const artCount = (db.prepare("SELECT COUNT(*) as c FROM articles").get() as { c: number }).c;
const anaCount = (db.prepare("SELECT COUNT(*) as c FROM analysis").get() as { c: number }).c;
console.log(`\n=== 보존 확인 ===`);
console.log(`  articles: ${artCount}건`);
console.log(`  analysis: ${anaCount}건`);

db.close();
console.log("\n마이그레이션 완료!");
