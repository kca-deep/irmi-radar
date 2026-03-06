const Database = require("better-sqlite3");
const db = new Database("./data/irmi.db", { readonly: true });

console.log("=== 1. 테이블 존재 여부 ===");
const tables = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
).all().map(r => r.name);
console.log("tables:", tables);

const expected = [
  "articles", "analysis", "signals", "signal_articles",
  "policies", "regions", "dashboard_cache"
];
const missing = expected.filter(t => !tables.includes(t));
console.log("missing:", missing.length ? missing : "none");

console.log("\n=== 2. articles 컬럼 검증 ===");
const cols = db.prepare("PRAGMA table_info(articles)").all().map(c => c.name);
console.log("columns:", cols);

console.log("\n=== 3. 카테고리별 분포 ===");
const catDist = db.prepare(
  "SELECT category, category_label, COUNT(*) as count FROM articles GROUP BY category ORDER BY count DESC"
).all();
catDist.forEach(r => console.log(`  ${r.category_label} (${r.category}): ${r.count}`));

console.log("\n=== 4. 테이블별 건수 ===");
expected.forEach(t => {
  if (tables.includes(t)) {
    const count = db.prepare(`SELECT COUNT(*) as c FROM ${t}`).get().c;
    console.log(`  ${t}: ${count}`);
  }
});

console.log("\n=== 5. 날짜 범위 ===");
const range = db.prepare("SELECT MIN(published_at) as earliest, MAX(published_at) as latest FROM articles").get();
console.log("earliest:", range.earliest);
console.log("latest:", range.latest);

console.log("\n=== 6. dashboard_cache 키 목록 ===");
const keys = db.prepare("SELECT key FROM dashboard_cache").all().map(r => r.key);
console.log("keys:", keys.length ? keys : "empty");

db.close();
