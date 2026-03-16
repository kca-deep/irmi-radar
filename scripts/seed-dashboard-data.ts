/**
 * seed-dashboard-data.ts
 *
 * articles / article_comments 테이블 기반으로
 * 대시보드에 필요한 모든 분석 결과 테이블을 생성한다.
 *
 * 대상 테이블:
 *   analysis_runs, analysis, signals, signal_articles,
 *   score_history, dashboard_snapshots, category_details, regions
 *
 * 실행: npx tsx scripts/seed-dashboard-data.ts
 */

import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "irmi.db");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── 상수 ──

const CAT_KEYS = ["prices", "employment", "selfEmployed", "finance", "realEstate"] as const;
type CatKey = (typeof CAT_KEYS)[number];

const CAT_LABELS: Record<CatKey, string> = {
  prices: "물가",
  employment: "고용",
  selfEmployed: "자영업",
  finance: "금융",
  realEstate: "부동산",
};

const REGIONS = [
  { id: "seoul", name: "서울" },
  { id: "gyeonggi", name: "경기" },
  { id: "incheon", name: "인천" },
  { id: "busan", name: "부산" },
  { id: "daegu", name: "대구" },
  { id: "gwangju", name: "광주" },
  { id: "daejeon", name: "대전" },
  { id: "ulsan", name: "울산" },
  { id: "sejong", name: "세종" },
  { id: "gangwon", name: "강원" },
  { id: "chungbuk", name: "충북" },
  { id: "chungnam", name: "충남" },
  { id: "jeonbuk", name: "전북" },
  { id: "jeonnam", name: "전남" },
  { id: "gyeongbuk", name: "경북" },
  { id: "gyeongnam", name: "경남" },
  { id: "jeju", name: "제주" },
];

const IRMI_CATS = "('prices','employment','selfEmployed','finance','realEstate')";

function severityOf(score: number): string {
  if (score >= 80) return "critical";
  if (score >= 60) return "warning";
  if (score >= 40) return "caution";
  return "safe";
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ── 기준 날짜 ──

const { latest } = db.prepare(
  `SELECT MAX(published_at) as latest FROM articles WHERE category IN ${IRMI_CATS}`
).get() as { latest: string };

const latestDate = latest.split(" ")[0];
const latestPlus1 = addDays(latestDate, 1);
const recent7Start = addDays(latestDate, -6);
const recent30Start = addDays(latestDate, -29);
const baseline90Start = addDays(latestDate, -89);

console.log(`[seed] 기준일: ${latestDate}`);

// ── 기준선 통계 ──

const baselineRows = db.prepare(
  `SELECT category,
          COUNT(*) * 1.0 / MAX(1, JULIANDAY(?) - JULIANDAY(?)) as avg_daily,
          COUNT(*) as total
   FROM articles
   WHERE category IN ${IRMI_CATS}
     AND published_at >= ? AND published_at < ?
   GROUP BY category`
).all(latestPlus1, baseline90Start, baseline90Start, latestPlus1) as {
  category: string; avg_daily: number; total: number;
}[];
const baselineMap = new Map(baselineRows.map((b) => [b.category, b.avg_daily]));

// ── 최근 7일 일별 기사수 ──

const recentDaily = db.prepare(
  `SELECT DATE(published_at) as date, category, COUNT(*) as count
   FROM articles
   WHERE category IN ${IRMI_CATS}
     AND published_at >= ? AND published_at < ?
   GROUP BY DATE(published_at), category
   ORDER BY date ASC`
).all(recent7Start, latestPlus1) as { date: string; category: string; count: number }[];

// 이전 7일
const prev7Start = addDays(latestDate, -13);
const prev7End = recent7Start;
const prevDaily = db.prepare(
  `SELECT DATE(published_at) as date, category, COUNT(*) as count
   FROM articles
   WHERE category IN ${IRMI_CATS}
     AND published_at >= ? AND published_at < ?
   GROUP BY DATE(published_at), category
   ORDER BY date ASC`
).all(prev7Start, prev7End) as { date: string; category: string; count: number }[];

// 댓글 참여도
const commentRows = db.prepare(
  `SELECT category, SUM(reply_count) as comment_count
   FROM articles
   WHERE category IN ${IRMI_CATS}
     AND published_at >= ? AND published_at < ?
     AND reply_count > 0
   GROUP BY category`
).all(recent30Start, latestPlus1) as { category: string; comment_count: number }[];
const commentMap = new Map(commentRows.map((c) => [c.category, c.comment_count]));
const totalComments = commentRows.reduce((s, c) => s + c.comment_count, 0);

// ── 카테고리별 위기지수 계산 ──

function sumByCat(rows: { category: string; count: number }[], cat: string): number {
  return rows.filter((r) => r.category === cat).reduce((s, r) => s + r.count, 0);
}

interface CatRisk {
  score: number;
  trend: "rising" | "stable" | "falling";
  articleCount: number;
  keyIssues: string[];
}

const catRisks: Record<string, CatRisk> = {};
const scores: number[] = [];

for (const cat of CAT_KEYS) {
  const recentSum = sumByCat(recentDaily, cat);
  const prevSum = sumByCat(prevDaily, cat);
  const recentAvg = recentSum / 7;
  const baselineAvg = baselineMap.get(cat) ?? 1;

  const anomaly = (recentAvg - baselineAvg) / Math.max(1, baselineAvg);
  let score = Math.round(50 + anomaly * 50);

  const catComments = commentMap.get(cat) ?? 0;
  const commentRatio = totalComments > 0 ? catComments / totalComments : 0.2;
  if (commentRatio > 0.2) {
    score += Math.round((commentRatio - 0.2) * 50);
  }
  score = Math.max(0, Math.min(100, score));
  scores.push(score);

  const prevAvg = prevSum / 7;
  const trendPct = prevAvg > 0 ? (recentAvg - prevAvg) / prevAvg : 0;
  const trend = trendPct > 0.1 ? "rising" : trendPct < -0.1 ? "falling" : "stable";

  // keyIssues: 상위 참여 기사 제목
  const topArts = db.prepare(
    `SELECT title FROM articles
     WHERE category = ? AND published_at >= ? AND published_at < ?
       AND (COALESCE(reply_count, 0) + COALESCE(like_count, 0)) > 0
     ORDER BY (COALESCE(reply_count, 0) + COALESCE(like_count, 0)) DESC
     LIMIT 3`
  ).all(cat, recent7Start, latestPlus1) as { title: string }[];

  const keyIssues = topArts.map((a) => {
    const t = a.title.replace(/\[.*?\]/g, "").replace(/\u2026/g, "").trim();
    return t.length > 30 ? t.slice(0, 28) + ".." : t;
  });

  catRisks[cat] = { score, trend, articleCount: recentSum, keyIssues };
}

// 종합 점수
const totalArticles = Object.values(catRisks).reduce((s, c) => s + c.articleCount, 0);
const overallScore = totalArticles > 0
  ? Math.round(CAT_KEYS.reduce((s, cat) => s + catRisks[cat].score * catRisks[cat].articleCount / totalArticles, 0))
  : 50;
const overallSeverity = severityOf(overallScore);

console.log(`[seed] 종합 점수: ${overallScore} (${overallSeverity})`);
for (const cat of CAT_KEYS) {
  console.log(`  ${CAT_LABELS[cat]}: ${catRisks[cat].score}점, ${catRisks[cat].trend}, ${catRisks[cat].articleCount}건`);
}

// ── DB 기록 시작 (트랜잭션) ──

const seed = db.transaction(() => {
  const RUN_ID = "seed_" + latestDate.replace(/-/g, "");
  const RUN_DATE = latestDate;

  // 1. analysis_runs
  db.prepare("DELETE FROM analysis_runs WHERE id = ?").run(RUN_ID);
  db.prepare(
    `INSERT INTO analysis_runs
       (id, run_date, started_at, completed_at, status,
        overall_score, overall_severity, summary,
        prices, employment, self_employed, finance, real_estate,
        articles_total, articles_analyzed)
     VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    RUN_ID, RUN_DATE,
    `${latestDate}T00:00:00Z`,
    `${latestDate}T23:59:59Z`,
    overallScore, overallSeverity,
    `최근 7일간 민생 관련 뉴스 ${totalArticles}건을 분석한 결과, 종합 민생위기 지수는 ${overallScore}점(${overallSeverity === "warning" ? "주의" : overallSeverity === "critical" ? "긴급" : overallSeverity === "caution" ? "관찰" : "안전"})입니다.`,
    catRisks.prices.score, catRisks.employment.score,
    catRisks.selfEmployed.score, catRisks.finance.score, catRisks.realEstate.score,
    totalArticles, totalArticles,
  );
  console.log(`[seed] analysis_runs: ${RUN_ID}`);

  // 2. category_details
  db.prepare("DELETE FROM category_details WHERE run_id = ?").run(RUN_ID);
  for (const cat of CAT_KEYS) {
    const r = catRisks[cat];
    const sev = severityOf(r.score);
    db.prepare(
      `INSERT INTO category_details
         (run_id, category, score, trend, article_count, critical_count, warning_count, key_issues, top_keywords)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      RUN_ID, cat, r.score, r.trend, r.articleCount,
      sev === "critical" ? r.articleCount : 0,
      sev === "warning" ? r.articleCount : 0,
      JSON.stringify(r.keyIssues),
      null,
    );
  }
  console.log("[seed] category_details: 5 rows");

  // 3. signals (상위 참여 기사 30개 -> 신호)
  db.prepare("DELETE FROM signals WHERE run_id = ?").run(RUN_ID);
  db.prepare("DELETE FROM signal_articles WHERE run_id = ?").run(RUN_ID);

  const topEngagement = db.prepare(
    `SELECT id, title, summary, category, category_label, published_at, reply_count, like_count,
            (COALESCE(reply_count, 0) + COALESCE(like_count, 0)) as engagement
     FROM articles
     WHERE category IN ${IRMI_CATS}
       AND published_at >= ? AND published_at < ?
       AND (COALESCE(reply_count, 0) + COALESCE(like_count, 0)) > 0
     ORDER BY engagement DESC
     LIMIT 30`
  ).all(recent30Start, latestPlus1) as {
    id: string; title: string; summary: string | null; category: string;
    category_label: string | null; published_at: string;
    reply_count: number; like_count: number; engagement: number;
  }[];

  const insertSignal = db.prepare(
    `INSERT INTO signals
       (id, run_id, title, description, severity, score, category, category_label,
        region, detected_at, evidence, cause, impact, action_points)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertSigArt = db.prepare(
    `INSERT OR IGNORE INTO signal_articles (signal_id, run_id, article_id) VALUES (?, ?, ?)`
  );

  for (const art of topEngagement) {
    const catScore = catRisks[art.category as CatKey]?.score ?? 50;
    const severity = severityOf(catScore);
    const signalId = `sig_${art.id}`;
    const desc = art.summary
      ? (art.summary.length > 200 ? art.summary.slice(0, 198) + ".." : art.summary)
      : art.title;

    insertSignal.run(
      signalId, RUN_ID, art.title, desc,
      severity, catScore,
      art.category, art.category_label ?? CAT_LABELS[art.category as CatKey] ?? "",
      null, art.published_at,
      JSON.stringify([`댓글 ${art.reply_count}건, 반응 ${art.like_count}건`]),
      `${CAT_LABELS[art.category as CatKey] ?? art.category} 분야 주요 이슈`,
      `댓글 ${art.reply_count}건의 높은 관심`,
      JSON.stringify(["관련 동향 모니터링", "정책 대응 검토"]),
    );
    insertSigArt.run(signalId, RUN_ID, art.id);
  }
  console.log(`[seed] signals: ${topEngagement.length} rows`);

  // 4. analysis (상위 참여 기사에 대한 분석 결과)
  const insertAnalysis = db.prepare(
    `INSERT OR IGNORE INTO analysis
       (article_id, risk_score, severity, key_factors, impact_region, ai_summary, analyzed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  // 최근 30일 참여도 높은 기사 200개에 분석 생성
  const analyzableArticles = db.prepare(
    `SELECT id, title, summary, category, published_at, reply_count, like_count
     FROM articles
     WHERE category IN ${IRMI_CATS}
       AND published_at >= ? AND published_at < ?
       AND (COALESCE(reply_count, 0) + COALESCE(like_count, 0)) > 0
     ORDER BY (COALESCE(reply_count, 0) + COALESCE(like_count, 0)) DESC
     LIMIT 200`
  ).all(recent30Start, latestPlus1) as {
    id: string; title: string; summary: string | null;
    category: string; published_at: string;
    reply_count: number; like_count: number;
  }[];

  let analysisCount = 0;
  for (const art of analyzableArticles) {
    const catScore = catRisks[art.category as CatKey]?.score ?? 50;
    // 기사별 risk_score: 카테고리 점수 +/- 참여도 보정
    const engagement = (art.reply_count ?? 0) + (art.like_count ?? 0);
    const engBoost = Math.min(20, Math.round(engagement / 20));
    const riskScore = Math.max(0, Math.min(100, catScore + engBoost));
    const severity = severityOf(riskScore);

    insertAnalysis.run(
      art.id, riskScore, severity,
      JSON.stringify([CAT_LABELS[art.category as CatKey] ?? art.category]),
      null,
      art.summary ?? art.title,
      art.published_at,
    );
    analysisCount++;
  }
  console.log(`[seed] analysis: ${analysisCount} rows`);

  // 5. score_history (최근 30일)
  db.prepare("DELETE FROM score_history").run();

  const daily30 = db.prepare(
    `SELECT DATE(published_at) as date, category, COUNT(*) as count
     FROM articles
     WHERE category IN ${IRMI_CATS}
       AND published_at >= ? AND published_at < ?
     GROUP BY DATE(published_at), category
     ORDER BY date ASC`
  ).all(recent30Start, latestPlus1) as { date: string; category: string; count: number }[];

  const dates30 = [...new Set(daily30.map((r) => r.date))].sort();
  const insertHistory = db.prepare(
    `INSERT OR REPLACE INTO score_history
       (date, overall_score, prices, employment, self_employed, finance, real_estate, run_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const d of dates30) {
    const dayRows = daily30.filter((r) => r.date === d);
    let dayTotal = 0;
    let dayWeighted = 0;
    const dayCatScores: Record<string, number> = {};

    for (const cat of CAT_KEYS) {
      const dayCount = dayRows.find((r) => r.category === cat)?.count ?? 0;
      const bAvg = baselineMap.get(cat) ?? 1;
      const anom = (dayCount - bAvg) / Math.max(1, bAvg);
      const s = Math.max(0, Math.min(100, Math.round(50 + anom * 50)));
      dayCatScores[cat] = s;
      dayTotal += dayCount;
      dayWeighted += s * dayCount;
    }

    const dayOverall = dayTotal > 0 ? Math.round(dayWeighted / dayTotal) : 50;
    insertHistory.run(
      d, dayOverall,
      dayCatScores["prices"] ?? 50,
      dayCatScores["employment"] ?? 50,
      dayCatScores["selfEmployed"] ?? 50,
      dayCatScores["finance"] ?? 50,
      dayCatScores["realEstate"] ?? 50,
      RUN_ID,
    );
  }
  console.log(`[seed] score_history: ${dates30.length} rows`);

  // 6. regions (17개 시도 - 기사 region 컬럼 기반)
  db.prepare("DELETE FROM regions WHERE run_id = ?").run(RUN_ID);

  const insertRegion = db.prepare(
    `INSERT INTO regions
       (run_id, id, name, score, trend,
        category_prices, category_employment, category_self_employed,
        category_finance, category_real_estate, top_issue, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  // 지역별 기사수 (region 컬럼이 NULL인 경우가 많으므로 시뮬레이션)
  for (const region of REGIONS) {
    // 지역별 약간의 변동을 주어 시뮬레이션
    const regionSeed = region.name.charCodeAt(0) + region.name.charCodeAt(1);
    const variation = ((regionSeed % 30) - 15);
    const regionScore = Math.max(10, Math.min(90, overallScore + variation));
    const trend = variation > 5 ? "rising" : variation < -5 ? "falling" : "stable";

    // 카테고리별 점수도 변동
    const catScoresRegion: Record<string, number> = {};
    for (const cat of CAT_KEYS) {
      const catVar = ((regionSeed + cat.charCodeAt(0)) % 20) - 10;
      catScoresRegion[cat] = Math.max(5, Math.min(95, catRisks[cat].score + catVar));
    }

    // 해당 지역 관련 최고 참여 기사
    const topIssue = db.prepare(
      `SELECT title FROM articles
       WHERE category IN ${IRMI_CATS}
         AND published_at >= ? AND published_at < ?
         AND (COALESCE(reply_count, 0) + COALESCE(like_count, 0)) > 0
       ORDER BY (COALESCE(reply_count, 0) + COALESCE(like_count, 0)) DESC
       LIMIT 1 OFFSET ?`
    ).get(recent7Start, latestPlus1, REGIONS.indexOf(region)) as { title: string } | undefined;

    insertRegion.run(
      RUN_ID, region.id, region.name,
      regionScore, trend,
      catScoresRegion["prices"], catScoresRegion["employment"],
      catScoresRegion["selfEmployed"], catScoresRegion["finance"],
      catScoresRegion["realEstate"],
      topIssue?.title?.slice(0, 50) ?? null,
      `${latestDate}T23:59:59Z`,
    );
  }
  console.log(`[seed] regions: ${REGIONS.length} rows`);

  // 7. dashboard_snapshots (대시보드 캐시)
  db.prepare("DELETE FROM dashboard_snapshots WHERE run_id = ?").run(RUN_ID);

  // dashboard 스냅샷 (loadDashboard가 기대하는 형식)
  const dashboardPayload = {
    updatedAt: `${latestDate}T23:59:59Z`,
    overallScore,
    categories: CAT_KEYS.map((cat) => ({
      category: cat,
      label: CAT_LABELS[cat],
      score: catRisks[cat].score,
      trend: catRisks[cat].trend,
      keyIssues: catRisks[cat].keyIssues,
      articleCount: catRisks[cat].articleCount,
    })),
    signals: {
      total: topEngagement.length,
      critical: topEngagement.filter((a) => severityOf(catRisks[a.category as CatKey]?.score ?? 50) === "critical").length,
      warning: topEngagement.filter((a) => severityOf(catRisks[a.category as CatKey]?.score ?? 50) === "warning").length,
    },
    summary: `최근 7일간 민생 관련 뉴스 ${totalArticles}건을 분석한 결과, 종합 민생위기 지수는 ${overallScore}점입니다.`,
    keyRisks: CAT_KEYS
      .sort((a, b) => catRisks[b].score - catRisks[a].score)
      .slice(0, 3)
      .map((cat) => `${CAT_LABELS[cat]} 분야 위기지수 ${catRisks[cat].score}점 (기사 ${catRisks[cat].articleCount}건)`),
    outlook: catRisks.prices.score >= 60
      ? `${CAT_LABELS.prices} 분야 기사량이 평소 대비 증가하고 있어 관련 정책 동향과 민생 영향을 모니터링할 필요가 있습니다.`
      : "현재 전반적으로 안정적인 수준이나 지속적인 모니터링이 필요합니다.",
  };

  db.prepare(
    `INSERT INTO dashboard_snapshots (run_id, cache_key, data) VALUES (?, 'dashboard', ?)`
  ).run(RUN_ID, JSON.stringify(dashboardPayload));

  // dashboard_cache도 동일 데이터 저장 (레거시 호환)
  db.prepare(
    `INSERT OR REPLACE INTO dashboard_cache (key, value, updated_at)
     VALUES ('dashboard', ?, datetime('now'))`
  ).run(JSON.stringify(dashboardPayload));

  // crisis_chain 스냅샷 (카테고리간 연쇄 관계)
  const crisisChainPayload = {
    nodes: CAT_KEYS.map((cat) => ({
      id: cat,
      label: CAT_LABELS[cat],
      score: catRisks[cat].score,
    })),
    edges: [
      { from: "prices", to: "selfEmployed", label: "원가 상승 -> 자영업 타격", strength: catRisks.prices.score >= 60 ? "strong" : "moderate" },
      { from: "prices", to: "finance", label: "물가 상승 -> 가계부채 증가", strength: "moderate" },
      { from: "employment", to: "finance", label: "고용 불안 -> 소득 감소", strength: catRisks.employment.score >= 60 ? "strong" : "moderate" },
      { from: "finance", to: "realEstate", label: "금리 부담 -> 부동산 시장", strength: "moderate" },
      { from: "realEstate", to: "finance", label: "부동산 하락 -> 가계자산 감소", strength: "weak" },
      { from: "selfEmployed", to: "employment", label: "폐업 증가 -> 실업 증가", strength: "moderate" },
    ],
    chains: [
      {
        id: "chain_1",
        name: "물가-자영업 연쇄",
        description: "물가 상승이 원가 부담을 높여 자영업 경영난 심화",
        path: ["prices", "selfEmployed"],
        currentlyActive: catRisks.prices.score >= 55 && catRisks.selfEmployed.score >= 40,
      },
      {
        id: "chain_2",
        name: "고용-금융-부동산 연쇄",
        description: "고용 불안이 소득 감소를 유발하고 가계부채와 부동산 시장에 영향",
        path: ["employment", "finance", "realEstate"],
        currentlyActive: catRisks.employment.score >= 50,
      },
    ],
  };

  db.prepare(
    `INSERT INTO dashboard_snapshots (run_id, cache_key, data) VALUES (?, 'crisis_chain', ?)`
  ).run(RUN_ID, JSON.stringify(crisisChainPayload));

  db.prepare(
    `INSERT OR REPLACE INTO dashboard_cache (key, value, updated_at)
     VALUES ('crisis_chain', ?, datetime('now'))`
  ).run(JSON.stringify(crisisChainPayload));

  // daily_delta 스냅샷
  const prevOverall = dates30.length >= 8
    ? (() => {
        const d = dates30[dates30.length - 8];
        const row = db.prepare("SELECT overall_score FROM score_history WHERE date = ?").get(d) as { overall_score: number } | undefined;
        return row?.overall_score ?? overallScore;
      })()
    : overallScore;

  const dailyDeltaPayload = {
    previousDate: dates30.length >= 2 ? dates30[dates30.length - 2] : null,
    previousRunId: null,
    overall: {
      delta: overallScore - prevOverall,
      direction: overallScore > prevOverall ? "up" : overallScore < prevOverall ? "down" : "unchanged",
      severityChanged: severityOf(overallScore) !== severityOf(prevOverall),
      previousSeverity: severityOf(prevOverall),
    },
    categories: Object.fromEntries(CAT_KEYS.map((cat) => {
      const prevCatDate = dates30.length >= 8 ? dates30[dates30.length - 8] : null;
      let prevCatScore = catRisks[cat].score;
      if (prevCatDate) {
        const col = cat === "selfEmployed" ? "self_employed" : cat === "realEstate" ? "real_estate" : cat;
        const row = db.prepare(`SELECT ${col} FROM score_history WHERE date = ?`).get(prevCatDate) as Record<string, number> | undefined;
        if (row) prevCatScore = row[col] ?? catRisks[cat].score;
      }
      const delta = catRisks[cat].score - prevCatScore;
      return [cat, {
        delta,
        direction: delta > 0 ? "up" : delta < 0 ? "down" : "unchanged",
        previousScore: prevCatScore,
      }];
    })),
    signals: {
      totalDelta: 0,
      newCount: topEngagement.length,
      resolvedCount: 0,
      upgradedCount: 0,
      downgradedCount: 0,
    },
    aiSummary: null,
  };

  db.prepare(
    `INSERT INTO dashboard_snapshots (run_id, cache_key, data) VALUES (?, 'daily_delta', ?)`
  ).run(RUN_ID, JSON.stringify(dailyDeltaPayload));

  // API usage (시뮬레이션)
  db.prepare(
    `INSERT OR REPLACE INTO dashboard_cache (key, value, updated_at)
     VALUES ('api_usage', ?, datetime('now'))`
  ).run(JSON.stringify({
    totalCalls: analyzableArticles.length,
    totalInputTokens: analyzableArticles.length * 1500,
    totalOutputTokens: analyzableArticles.length * 500,
    totalTokens: analyzableArticles.length * 2000,
    totalCost: analyzableArticles.length * 0.003,
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
  }));

  console.log("[seed] dashboard_snapshots + dashboard_cache: done");

  return RUN_ID;
});

// ── 실행 ──

try {
  const runId = seed();
  console.log(`\n[seed] 완료! run_id: ${runId}`);

  // 검증
  const stats = {
    analysis_runs: (db.prepare("SELECT COUNT(*) as c FROM analysis_runs").get() as { c: number }).c,
    analysis: (db.prepare("SELECT COUNT(*) as c FROM analysis").get() as { c: number }).c,
    signals: (db.prepare("SELECT COUNT(*) as c FROM signals").get() as { c: number }).c,
    signal_articles: (db.prepare("SELECT COUNT(*) as c FROM signal_articles").get() as { c: number }).c,
    score_history: (db.prepare("SELECT COUNT(*) as c FROM score_history").get() as { c: number }).c,
    category_details: (db.prepare("SELECT COUNT(*) as c FROM category_details").get() as { c: number }).c,
    regions: (db.prepare("SELECT COUNT(*) as c FROM regions").get() as { c: number }).c,
    dashboard_snapshots: (db.prepare("SELECT COUNT(*) as c FROM dashboard_snapshots").get() as { c: number }).c,
    dashboard_cache: (db.prepare("SELECT COUNT(*) as c FROM dashboard_cache").get() as { c: number }).c,
  };
  console.log("\n[seed] DB 테이블 상태:");
  for (const [table, count] of Object.entries(stats)) {
    console.log(`  ${table}: ${count} rows`);
  }
} catch (err) {
  console.error("[seed] 실패:", err);
  process.exit(1);
} finally {
  db.close();
}
