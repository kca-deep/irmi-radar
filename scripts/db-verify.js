const Database = require("better-sqlite3");
const db = new Database("./data/irmi.db", { readonly: true });

console.log("=== 1. 새 컬럼 검증 ===");
const cols = db.prepare("PRAGMA table_info(articles)").all().map(c => c.name);
console.log("columns:", cols);
console.log("image_url present:", cols.includes("image_url"));
console.log("like_count present:", cols.includes("like_count"));
console.log("reply_count present:", cols.includes("reply_count"));

console.log("\n=== 2. image_url 통계 ===");
const imgStats = db.prepare([
  "SELECT",
  "COUNT(*) as total,",
  "COUNT(image_url) as has_image,",
  "COUNT(*) - COUNT(image_url) as no_image",
  "FROM articles"
].join(" ")).get();
console.log(imgStats);
console.log("image rate:", (imgStats.has_image / imgStats.total * 100).toFixed(1) + "%");

console.log("\n=== 3. like_count / reply_count 통계 ===");
const engStats = db.prepare([
  "SELECT",
  "COUNT(CASE WHEN like_count > 0 THEN 1 END) as has_likes,",
  "COUNT(CASE WHEN reply_count > 0 THEN 1 END) as has_replies,",
  "SUM(like_count) as total_likes,",
  "SUM(reply_count) as total_replies,",
  "MAX(like_count) as max_likes,",
  "MAX(reply_count) as max_replies",
  "FROM articles"
].join(" ")).get();
console.log(engStats);

console.log("\n=== 4. HTML 잔여물 검사 (개선 후) ===");
const htmlContent = db.prepare("SELECT COUNT(*) as c FROM articles WHERE content LIKE '%<%>%'").get().c;
const htmlTitle = db.prepare("SELECT COUNT(*) as c FROM articles WHERE title LIKE '%<%>%'").get().c;
const htmlSummary = db.prepare("SELECT COUNT(*) as c FROM articles WHERE summary LIKE '%<%>%'").get().c;
console.log("content:", htmlContent, "(was 2)");
console.log("title:", htmlTitle, "(was 2)");
console.log("summary:", htmlSummary, "(was 47)");

if (htmlContent > 0) {
  const samples = db.prepare("SELECT id, substr(content, instr(content, '<'), 80) as frag FROM articles WHERE content LIKE '%<%>%' LIMIT 3").all();
  console.log("content HTML samples:", samples);
}
if (htmlSummary > 0) {
  const samples = db.prepare("SELECT id, substr(summary, instr(summary, '<'), 80) as frag FROM articles WHERE summary LIKE '%<%>%' LIMIT 3").all();
  console.log("summary HTML samples:", samples);
}

console.log("\n=== 5. 상위 engagement 기사 ===");
const topEng = db.prepare("SELECT id, title, category, like_count, reply_count FROM articles ORDER BY (like_count + reply_count) DESC LIMIT 5").all();
console.log(JSON.stringify(topEng, null, 2));

console.log("\n=== 6. image_url 샘플 ===");
const imgSample = db.prepare("SELECT id, title, image_url FROM articles WHERE image_url IS NOT NULL LIMIT 3").all();
console.log(JSON.stringify(imgSample, null, 2));

console.log("\n=== 7. 총 건수 확인 (변경 없어야 함) ===");
console.log("articles:", db.prepare("SELECT COUNT(*) as c FROM articles").get().c, "(expected 52162)");

db.close();
