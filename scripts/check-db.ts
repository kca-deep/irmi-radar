import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "data", "irmi.db"), { readonly: true });

console.log("=== 전체 테이블 현황 ===");
const tables = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '%fts%' ORDER BY name"
).all() as { name: string }[];
for (const t of tables) {
  const count = (db.prepare(`SELECT COUNT(*) as c FROM "${t.name}"`).get() as { c: number }).c;
  console.log(`  ${t.name}: ${count}건`);
}

console.log("\n=== analysis_runs ===");
const runs = db.prepare("SELECT id, run_date, status, overall_score, overall_severity, articles_analyzed, completed_at FROM analysis_runs ORDER BY started_at DESC").all();
if (runs.length === 0) console.log("  (비어있음)");
else console.log(JSON.stringify(runs, null, 2));

console.log("\n=== signals (상위 5건) ===");
const signals = db.prepare("SELECT id, run_id, title, severity, score, category FROM signals ORDER BY score DESC LIMIT 5").all();
if (signals.length === 0) console.log("  (비어있음)");
else console.log(JSON.stringify(signals, null, 2));

console.log("\n=== signal_articles ===");
const saCount = (db.prepare("SELECT COUNT(*) as c FROM signal_articles").get() as { c: number }).c;
console.log(`  ${saCount}건`);

console.log("\n=== regions (score > 0, 상위 5건) ===");
const regions = db.prepare("SELECT run_id, id, name, score FROM regions WHERE score > 0 ORDER BY score DESC LIMIT 5").all();
if (regions.length === 0) console.log("  (비어있음)");
else console.log(JSON.stringify(regions, null, 2));

console.log("\n=== category_details ===");
const cats = db.prepare("SELECT * FROM category_details ORDER BY run_id, score DESC").all();
if (cats.length === 0) console.log("  (비어있음)");
else console.log(JSON.stringify(cats, null, 2));

console.log("\n=== dashboard_snapshots ===");
const snaps = db.prepare("SELECT run_id, cache_key, length(data) as data_len FROM dashboard_snapshots").all();
if (snaps.length === 0) console.log("  (비어있음)");
else console.log(JSON.stringify(snaps, null, 2));

console.log("\n=== score_history ===");
const history = db.prepare("SELECT * FROM score_history ORDER BY date DESC LIMIT 5").all();
if (history.length === 0) console.log("  (비어있음)");
else console.log(JSON.stringify(history, null, 2));

console.log("\n=== dashboard_cache ===");
const cache = db.prepare("SELECT key, length(value) as val_len, updated_at FROM dashboard_cache").all();
if (cache.length === 0) console.log("  (비어있음)");
else console.log(JSON.stringify(cache, null, 2));

db.close();
console.log("\n확인 완료.");
