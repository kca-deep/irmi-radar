import Database from "better-sqlite3";
import path from "path";
const db = new Database(path.join(process.cwd(), "data", "irmi.db"), { readonly: true });

console.log("=== analysis_runs 전체 컬럼 ===");
const run = db.prepare("SELECT * FROM analysis_runs").get() as any;
console.log(JSON.stringify(run, null, 2));

console.log("\n=== category_details (같은 run_id) ===");
const cats = db.prepare("SELECT category, score FROM category_details WHERE run_id = ?").all(run.id) as any[];
console.log(JSON.stringify(cats, null, 2));

console.log("\n=== score_history ===");
const sh = db.prepare("SELECT * FROM score_history").get() as any;
console.log(JSON.stringify(sh, null, 2));

db.close();
