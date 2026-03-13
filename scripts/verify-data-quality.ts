/**
 * 파이프라인 실행 후 데이터 품질 검증 스크립트
 * 단순 건수가 아닌, 데이터 정합성/무결성/교차검증 수행
 */
import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "data", "irmi.db"), { readonly: true });

let passed = 0;
let failed = 0;
const errors: string[] = [];

function ok(label: string) {
  passed++;
  console.log(`  [PASS] ${label}`);
}

function fail(label: string, detail: string) {
  failed++;
  errors.push(`${label}: ${detail}`);
  console.log(`  [FAIL] ${label} -- ${detail}`);
}

function check(label: string, condition: boolean, detail = "") {
  if (condition) ok(label);
  else fail(label, detail || "조건 불일치");
}

// ─── 1. analysis_runs 무결성 ───
console.log("\n=== 1. analysis_runs 무결성 ===");

const runs = db.prepare("SELECT * FROM analysis_runs").all() as any[];
check("analysis_runs 레코드 존재", runs.length > 0, `${runs.length}건`);

for (const run of runs) {
  check(
    `run[${run.id}] status=completed이면 completed_at 존재`,
    run.status !== "completed" || !!run.completed_at,
    `status=${run.status}, completed_at=${run.completed_at}`
  );

  check(
    `run[${run.id}] overall_score 범위 0-100`,
    run.overall_score >= 0 && run.overall_score <= 100,
    `overall_score=${run.overall_score}`
  );

  check(
    `run[${run.id}] overall_severity 유효값`,
    ["critical", "warning", "caution", "safe"].includes(run.overall_severity),
    `overall_severity=${run.overall_severity}`
  );

  // severity와 score 일치 검증
  const expectedSeverity =
    run.overall_score >= 80 ? "critical" :
    run.overall_score >= 60 ? "warning" :
    run.overall_score >= 40 ? "caution" : "safe";
  check(
    `run[${run.id}] severity-score 일치`,
    run.overall_severity === expectedSeverity,
    `score=${run.overall_score} -> expected=${expectedSeverity}, actual=${run.overall_severity}`
  );

  // 가중평균 검증: max*0.35 + top2avg*0.35 + avg*0.30
  const catScores = [run.prices, run.employment, run.self_employed, run.finance, run.real_estate].filter((s: number) => s > 0);
  if (catScores.length > 0) {
    const sorted = [...catScores].sort((a: number, b: number) => b - a);
    const max = sorted[0];
    const top2Avg = sorted.length >= 2 ? (sorted[0] + sorted[1]) / 2 : sorted[0];
    const avg = catScores.reduce((a: number, b: number) => a + b, 0) / catScores.length;
    const expected = Math.round(max * 0.35 + top2Avg * 0.35 + avg * 0.30);
    check(
      `run[${run.id}] overall_score 가중평균 검증`,
      Math.abs(run.overall_score - expected) <= 2,
      `actual=${run.overall_score}, calculated=${expected}, diff=${Math.abs(run.overall_score - expected)}`
    );
  }

  // articles_analyzed vs 실제 analysis 테이블
  const analysisCount = (db.prepare("SELECT COUNT(*) as c FROM analysis").get() as any).c;
  check(
    `run[${run.id}] articles_analyzed vs analysis 테이블`,
    run.articles_analyzed <= analysisCount,
    `articles_analyzed=${run.articles_analyzed}, analysis 테이블=${analysisCount}건`
  );
}

// ─── 2. signals 데이터 품질 ───
console.log("\n=== 2. signals 데이터 품질 ===");

const signals = db.prepare("SELECT * FROM signals").all() as any[];
check("signals 레코드 존재", signals.length > 0, `${signals.length}건`);

const validCategories = ["prices", "employment", "selfEmployed", "finance", "realEstate"];
const runIds = new Set(runs.map((r: any) => r.id));

for (const sig of signals) {
  check(
    `signal[${sig.id}] run_id FK 무결성`,
    runIds.has(sig.run_id),
    `run_id=${sig.run_id} not in analysis_runs`
  );

  check(
    `signal[${sig.id}] category 유효값`,
    validCategories.includes(sig.category),
    `category=${sig.category}`
  );

  check(
    `signal[${sig.id}] title 비어있지 않음`,
    !!sig.title && sig.title.length > 0,
    `title="${sig.title}"`
  );

  check(
    `signal[${sig.id}] score 범위 0-100`,
    sig.score >= 0 && sig.score <= 100,
    `score=${sig.score}`
  );

  // severity-score 일치
  const expectedSev =
    sig.score >= 80 ? "critical" :
    sig.score >= 60 ? "warning" :
    sig.score >= 40 ? "caution" : "safe";
  check(
    `signal[${sig.id}] severity-score 일치`,
    sig.severity === expectedSev,
    `score=${sig.score} -> expected=${expectedSev}, actual=${sig.severity}`
  );
}

// 같은 run_id 내 id 중복 검사
const sigDupes = db.prepare(
  "SELECT run_id, id, COUNT(*) as cnt FROM signals GROUP BY run_id, id HAVING cnt > 1"
).all() as any[];
check("signals PK 중복 없음", sigDupes.length === 0, `중복: ${JSON.stringify(sigDupes)}`);

// ─── 3. signal_articles 무결성 ───
console.log("\n=== 3. signal_articles 무결성 ===");

const saCount = (db.prepare("SELECT COUNT(*) as c FROM signal_articles").get() as any).c;
check("signal_articles 레코드 존재", saCount > 0, `${saCount}건`);

// 고아 레코드: signal_id+run_id가 signals에 없는 것
const orphanSA = db.prepare(`
  SELECT sa.signal_id, sa.run_id FROM signal_articles sa
  LEFT JOIN signals s ON sa.signal_id = s.id AND sa.run_id = s.run_id
  WHERE s.id IS NULL
`).all() as any[];
check("signal_articles 고아 레코드 없음", orphanSA.length === 0, `고아: ${orphanSA.length}건`);

// article_id가 articles에 존재하는지
const orphanArticles = db.prepare(`
  SELECT sa.article_id FROM signal_articles sa
  LEFT JOIN articles a ON sa.article_id = a.id
  WHERE a.id IS NULL
`).all() as any[];
check("signal_articles article_id FK 무결성", orphanArticles.length === 0, `고아: ${orphanArticles.length}건`);

// ─── 4. regions 데이터 품질 ───
console.log("\n=== 4. regions 데이터 품질 ===");

const EXPECTED_REGIONS = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];

for (const run of runs) {
  const regionRows = db.prepare("SELECT * FROM regions WHERE run_id = ?").all(run.id) as any[];
  check(
    `run[${run.id}] regions 17개 시도 존재`,
    regionRows.length === 17,
    `실제=${regionRows.length}개`
  );

  const regionNames = new Set(regionRows.map((r: any) => r.name));
  for (const name of EXPECTED_REGIONS) {
    check(
      `run[${run.id}] 지역 "${name}" 존재`,
      regionNames.has(name),
      `누락`
    );
  }

  for (const r of regionRows) {
    check(
      `region[${r.name}] score 범위 0-100`,
      r.score >= 0 && r.score <= 100,
      `score=${r.score}`
    );

    check(
      `region[${r.name}] run_id FK 무결성`,
      runIds.has(r.run_id),
      `run_id=${r.run_id}`
    );
  }
}

// ─── 5. category_details 품질 ───
console.log("\n=== 5. category_details 품질 ===");

for (const run of runs) {
  const cats = db.prepare("SELECT * FROM category_details WHERE run_id = ?").all(run.id) as any[];
  check(
    `run[${run.id}] 5대 카테고리 모두 존재`,
    cats.length === 5,
    `실제=${cats.length}개: ${cats.map((c: any) => c.category).join(", ")}`
  );

  const catNames = new Set(cats.map((c: any) => c.category));
  for (const vc of validCategories) {
    check(`category_details "${vc}" 존재`, catNames.has(vc), "누락");
  }

  for (const c of cats) {
    check(
      `cat[${c.category}] score 범위 0-100`,
      c.score >= 0 && c.score <= 100,
      `score=${c.score}`
    );

    check(
      `cat[${c.category}] critical+warning <= article_count`,
      c.critical_count + c.warning_count <= c.article_count,
      `critical=${c.critical_count}, warning=${c.warning_count}, total=${c.article_count}`
    );

    check(
      `cat[${c.category}] trend 유효값`,
      ["rising", "stable", "falling"].includes(c.trend),
      `trend=${c.trend}`
    );

    // key_issues JSON 유효성
    if (c.key_issues) {
      try {
        const parsed = JSON.parse(c.key_issues);
        check(`cat[${c.category}] key_issues 유효 JSON 배열`, Array.isArray(parsed), `type=${typeof parsed}`);
      } catch {
        fail(`cat[${c.category}] key_issues JSON 파싱`, c.key_issues?.slice(0, 50));
      }
    }

    // analysis 테이블과 교차 검증: 실제 평균 점수와 비교
    const dbCatKey = c.category === "selfEmployed" ? "selfEmployed" : c.category;
    const realAvg = db.prepare(`
      SELECT ROUND(AVG(an.risk_score), 1) as avg_score, COUNT(*) as cnt
      FROM articles a
      INNER JOIN analysis an ON a.id = an.article_id
      WHERE a.category = ?
    `).get(dbCatKey) as any;

    if (realAvg && realAvg.cnt > 0) {
      check(
        `cat[${c.category}] score vs analysis 평균 (오차 <=1)`,
        Math.abs(c.score - realAvg.avg_score) <= 1,
        `category_details=${c.score}, analysis AVG=${realAvg.avg_score}, diff=${Math.abs(c.score - realAvg.avg_score).toFixed(1)}`
      );

      check(
        `cat[${c.category}] article_count vs analysis 건수`,
        c.article_count === realAvg.cnt,
        `category_details=${c.article_count}, analysis=${realAvg.cnt}`
      );
    }
  }
}

// ─── 6. dashboard_snapshots 품질 ───
console.log("\n=== 6. dashboard_snapshots 품질 ===");

for (const run of runs) {
  const snap = db.prepare(
    "SELECT data FROM dashboard_snapshots WHERE run_id = ? AND cache_key = 'dashboard'"
  ).get(run.id) as any;

  check(`run[${run.id}] dashboard 스냅샷 존재`, !!snap, "스냅샷 없음");

  if (snap) {
    let dashData: any;
    try {
      dashData = JSON.parse(snap.data);
      ok(`run[${run.id}] dashboard JSON 파싱 성공`);
    } catch {
      fail(`run[${run.id}] dashboard JSON 파싱`, "파싱 실패");
      continue;
    }

    check(
      `run[${run.id}] snapshot.overallScore == runs.overall_score`,
      dashData.overallScore === run.overall_score,
      `snapshot=${dashData.overallScore}, runs=${run.overall_score}`
    );

    check(
      `run[${run.id}] snapshot.categories 5개`,
      Array.isArray(dashData.categories) && dashData.categories.length === 5,
      `실제=${dashData.categories?.length}`
    );

    // signals 통계 교차 검증
    const sigStats = db.prepare(`
      SELECT COUNT(*) as total,
        COUNT(CASE WHEN severity='critical' THEN 1 END) as crit,
        COUNT(CASE WHEN severity='warning' THEN 1 END) as warn
      FROM signals WHERE run_id = ?
    `).get(run.id) as any;

    check(
      `run[${run.id}] snapshot.signals.total == DB signals count`,
      dashData.signals?.total === sigStats.total,
      `snapshot=${dashData.signals?.total}, DB=${sigStats.total}`
    );

    check(
      `run[${run.id}] snapshot.signals.critical == DB critical count`,
      dashData.signals?.critical === sigStats.crit,
      `snapshot=${dashData.signals?.critical}, DB=${sigStats.crit}`
    );
  }

  // crisis_chain 스냅샷
  const chainSnap = db.prepare(
    "SELECT data FROM dashboard_snapshots WHERE run_id = ? AND cache_key = 'crisis_chain'"
  ).get(run.id) as any;
  if (chainSnap) {
    try {
      const chainData = JSON.parse(chainSnap.data);
      check(`run[${run.id}] crisis_chain nodes 존재`, Array.isArray(chainData.nodes) && chainData.nodes.length > 0, `${chainData.nodes?.length}개`);
      ok(`run[${run.id}] crisis_chain JSON 유효`);
    } catch {
      fail(`run[${run.id}] crisis_chain JSON 파싱`, "파싱 실패");
    }
  }

  // daily_delta 스냅샷 (첫 분석이면 없을 수 있음)
  const deltaSnap = db.prepare(
    "SELECT data FROM dashboard_snapshots WHERE run_id = ? AND cache_key = 'daily_delta'"
  ).get(run.id) as any;
  if (deltaSnap) {
    try {
      JSON.parse(deltaSnap.data);
      ok(`run[${run.id}] daily_delta JSON 유효`);
    } catch {
      fail(`run[${run.id}] daily_delta JSON 파싱`, "파싱 실패");
    }
  } else {
    console.log(`  [INFO] run[${run.id}] daily_delta 스냅샷 없음 (첫 분석이면 정상)`);
  }
}

// ─── 7. score_history 정합성 ───
console.log("\n=== 7. score_history 정합성 ===");

const historyRows = db.prepare("SELECT * FROM score_history").all() as any[];
check("score_history 레코드 존재", historyRows.length > 0, `${historyRows.length}건`);

for (const h of historyRows) {
  if (h.run_id) {
    check(
      `history[${h.date}] run_id FK 무결성`,
      runIds.has(h.run_id),
      `run_id=${h.run_id}`
    );

    // analysis_runs와 교차 검증
    const matchRun = runs.find((r: any) => r.id === h.run_id);
    if (matchRun) {
      check(
        `history[${h.date}] overall_score == runs.overall_score`,
        h.overall_score === matchRun.overall_score,
        `history=${h.overall_score}, runs=${matchRun.overall_score}`
      );

      // 카테고리 점수 교차 검증
      const catDetails = db.prepare("SELECT * FROM category_details WHERE run_id = ?").all(h.run_id) as any[];
      for (const cd of catDetails) {
        const histKey = cd.category === "selfEmployed" ? "self_employed" :
                        cd.category === "realEstate" ? "real_estate" : cd.category;
        const histVal = h[histKey];
        if (histVal !== undefined) {
          check(
            `history[${h.date}] ${cd.category} == category_details.score`,
            Math.abs(histVal - cd.score) <= 0.1,
            `history=${histVal}, category_details=${cd.score}`
          );
        }
      }
    }
  }
}

// ─── 8. dashboard_cache 레거시 호환 ───
console.log("\n=== 8. dashboard_cache 레거시 호환 ===");

const legacyDash = db.prepare("SELECT value FROM dashboard_cache WHERE key = 'dashboard'").get() as any;
if (legacyDash) {
  try {
    const ld = JSON.parse(legacyDash.value);
    ok("dashboard_cache[dashboard] JSON 유효");

    // 최신 snapshot과 일치하는지
    const latestRun = runs.find((r: any) => r.status === "completed");
    if (latestRun) {
      const snap = db.prepare(
        "SELECT data FROM dashboard_snapshots WHERE run_id = ? AND cache_key = 'dashboard'"
      ).get(latestRun.id) as any;
      if (snap) {
        check(
          "dashboard_cache == 최신 dashboard_snapshot (동일 데이터)",
          legacyDash.value === snap.data,
          `cache len=${legacyDash.value.length}, snapshot len=${snap.data.length}`
        );
      }
    }
  } catch {
    fail("dashboard_cache[dashboard] JSON 파싱", "실패");
  }
} else {
  fail("dashboard_cache[dashboard] 존재", "레거시 캐시 누락");
}

// ─── 결과 요약 ───
console.log("\n" + "=".repeat(50));
console.log(`검증 완료: PASS ${passed}건, FAIL ${failed}건`);
if (errors.length > 0) {
  console.log("\n실패 항목:");
  for (const e of errors) {
    console.log(`  - ${e}`);
  }
}
console.log("=".repeat(50));

db.close();
process.exit(failed > 0 ? 1 : 0);
