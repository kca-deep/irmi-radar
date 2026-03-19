/**
 * 분석 파이프라인 오케스트레이터 (Round-Robin 병렬 배치)
 *
 * 단계별 실행 흐름:
 * 1. collect   - 미분석 기사 확인
 * 2. analysis  - 전 카테고리 Round-Robin 병렬 분석
 * 3. aggregate - 위기 신호 탐지 + 지역 집계 + 종합 대시보드 (AI)
 *
 * Round-Robin: 각 카테고리에서 chunkSize건씩 번갈아 가며 배치를 구성하고,
 * concurrency로 병렬 API 호출. 타임아웃 전에 모든 카테고리를 골고루 분석.
 */

import {
  type ArticleInput,
  getUnanalyzedArticles,
  analyzeWithRetry,
  saveAnalysis,
  runConcurrent,
  analyzeArticles,
} from "./article-analyzer";
import { detectSignals } from "./signal-detector";
import { buildDashboard, type DashboardBuildResult } from "./dashboard-builder";
import { aggregateRegions } from "./region-aggregator";
import { calculateDailyDelta } from "./daily-comparator";
import { getArticlesWithoutThumbnail, fetchAndSaveThumbnails } from "./thumbnail-fetcher";
import { fetchLegislationByKeywords, fetchBillsByKeywords, fetchNarsAnalysesByKeywords } from "@/lib/api/assembly";
import { fetchGovServicesByCategory } from "@/lib/api/gov-service";
import { getDb, initializeSchema } from "@/lib/db/index";
import {
  createAnalysisRun,
  completeAnalysisRun,
  failAnalysisRun,
  saveDashboardSnapshot,
} from "@/lib/db/queries";
import { usageTracker } from "@/lib/api/ai-client";
import { invalidateDataCache } from "@/lib/api/data-source";
import { CATEGORY_LABEL_MAP } from "@/lib/constants";
import type { CategoryKey, AssemblyLegislation, AssemblyBill, GovService, NarsAnalysis, Severity } from "@/lib/types";

// -- 타입 --

/** 파이프라인 취소 에러 */
export class PipelineCancelledError extends Error {
  constructor() {
    super("분석이 취소되었습니다");
    this.name = "PipelineCancelledError";
  }
}

export interface PipelineOptions {
  /** 카테고리당 최대 분석 건수 (기본: 전체) */
  limitPerCategory?: number;
  /** 동시 API 요청 수 (기본: 10) */
  concurrency?: number;
  /** DB 트랜잭션 단위 (기본: 200) */
  batchSize?: number;
  /** 신호 탐지 기간 (일, 기본: 30) */
  signalWindowDays?: number;
  /** 드라이런 (기본: false) */
  dryRun?: boolean;
  /** 분석 대상 카테고리 (미지정 시 전체) */
  categories?: CategoryKey[];
  /** 분석 기간 시작일 (ISO 8601) */
  dateFrom?: string;
  /** 분석 기간 종료일 (ISO 8601) */
  dateTo?: string;
  /** 국회 입법 동향 포함 */
  includeAssembly?: boolean;
  /** 보조금24 정책 포함 */
  includeGovServices?: boolean;
  /** 취소 시그널 */
  signal?: AbortSignal;
  /** 증분 분석 모드: 새 기사만 분석 후 기존 결과에 병합 (기본: false) */
  incremental?: boolean;
}

export interface PipelineCallbacks {
  /** 단계 시작 */
  onStepStart?: (stepId: string, label: string) => void;
  /** 단계 완료 */
  onStepComplete?: (stepId: string, detail: string) => void;
  /** 단계 에러 */
  onStepError?: (stepId: string, error: Error) => void;
  /** 기사 분석 진행 (현재 단계 내) */
  onArticleProgress?: (
    stepId: string,
    processed: number,
    total: number,
    failed: number,
    detail?: string
  ) => void;
}

export interface PipelineResult {
  runId: string;
  totalAnalyzed: number;
  totalFailed: number;
  dashboard: DashboardBuildResult | null;
  signalCount: number;
  regionCount: number;
  elapsedMs: number;
  categoryResults: {
    category: CategoryKey;
    analyzed: number;
    failed: number;
  }[];
}

const ALL_CATEGORIES: CategoryKey[] = [
  "prices", "employment", "selfEmployed", "finance", "realEstate",
];

/** Round-Robin 분석에 할당할 최대 시간 (ms). aggregate에 60초 확보 */
const MAX_ANALYSIS_MS = 240_000; // 4분
/** 라운드당 카테고리별 처리 건수 */
const CHUNK_SIZE = 10;

// -- 메인 파이프라인 --

export async function runPipeline(
  options: PipelineOptions = {},
  callbacks: PipelineCallbacks = {}
): Promise<PipelineResult> {
  const {
    limitPerCategory = Infinity,
    concurrency = 10,
    batchSize = 200,
    signalWindowDays = 30,
    dryRun = false,
    categories,
    dateFrom,
    dateTo,
    includeAssembly = false,
    includeGovServices = false,
    signal,
    incremental = false,
  } = options;

  function checkCancelled() {
    if (signal?.aborted) {
      console.log("[Pipeline] 취소 감지 - 파이프라인 중단");
      throw new PipelineCancelledError();
    }
  }

  const start = Date.now();
  let totalAnalyzed = 0;
  let totalFailed = 0;
  const categoryResults: PipelineResult["categoryResults"] = [];

  // 스키마 보장 (score_history 등 누락 테이블 자동 생성)
  initializeSchema(getDb());

  // 분석 회차 생성
  const runId = createAnalysisRun({
    categories: categories ?? "all",
    dateFrom,
    dateTo,
    limitPerCategory,
    concurrency,
    includeAssembly,
    includeGovServices,
  });

  console.log("[Pipeline] 파이프라인 시작 (runId: " + runId + ")");
  console.log("[Pipeline] 옵션:", {
    categories: categories?.join(", ") || "전체",
    dateFrom: dateFrom || "없음",
    dateTo: dateTo || "없음",
    limitPerCategory,
    concurrency,
    incremental,
    includeAssembly,
    includeGovServices,
  });

  // -- Step 1: collect (데이터 수집 확인) --
  checkCancelled();
  callbacks.onStepStart?.("collect", "데이터 수집");

  // 선택된 카테고리별로 미분석 기사 수 확인
  const activeCats: CategoryKey[] = categories?.length
    ? categories
    : ALL_CATEGORIES;
  let totalUnanalyzed = 0;
  const catUnanalyzed: { cat: CategoryKey; count: number; total: number }[] = [];

  for (const cat of activeCats) {
    const r = await analyzeArticles({ dryRun: true, category: cat, dateFrom, dateTo });
    const count = limitPerCategory !== Infinity ? Math.min(r.total, limitPerCategory) : r.total;
    totalUnanalyzed += count;
    catUnanalyzed.push({ cat, count, total: r.total });
    console.log(`[Pipeline] 미분석 기사 (${cat}): ${count}/${r.total}건${limitPerCategory !== Infinity ? ` (limit: ${limitPerCategory})` : ""}`);
  }
  console.log(`[Pipeline] 미분석 기사 합계: ${totalUnanalyzed}건`);

  // 0건일 때 진단 정보 출력
  if (totalUnanalyzed === 0) {
    const db = getDb();
    const articleCount = (db.prepare("SELECT COUNT(*) as cnt FROM articles").get() as { cnt: number }).cnt;
    const analysisCount = (db.prepare("SELECT COUNT(*) as cnt FROM analysis").get() as { cnt: number }).cnt;
    const range = db.prepare("SELECT MIN(published_at) as min_dt, MAX(published_at) as max_dt FROM articles").get() as { min_dt: string | null; max_dt: string | null };
    console.log(`[Pipeline] [진단] articles: ${articleCount}건, analysis: ${analysisCount}건`);
    console.log(`[Pipeline] [진단] 기사 날짜범위: ${range.min_dt ?? "없음"} ~ ${range.max_dt ?? "없음"}`);
    console.log(`[Pipeline] [진단] 요청 필터: ${dateFrom ?? "없음"} ~ ${dateTo ?? "없음"}`);
    if (articleCount > 0 && analysisCount >= articleCount) {
      console.log("[Pipeline] [진단] 모든 기사가 이미 분석 완료 상태입니다.");
    } else if (articleCount === 0) {
      console.log("[Pipeline] [진단] articles 테이블이 비어있습니다. preprocess-news.ts를 먼저 실행하세요.");
    } else if (range.min_dt && range.max_dt) {
      console.log("[Pipeline] [진단] 기사 날짜범위와 요청 필터가 겹치지 않을 수 있습니다.");
    }
  }

  // 카테고리별 미분석 건수를 detail에 포함 (limit 적용 시 count/total건)
  const collectDetailParts = catUnanalyzed.map(({ cat, count, total }) => {
    const label = CATEGORY_LABEL_MAP[cat];
    return count < total ? `${label} ${count}/${total}건` : `${label} ${total}건`;
  });
  callbacks.onStepComplete?.(
    "collect",
    collectDetailParts.join(" / ")
  );

  if (dryRun) {
    failAnalysisRun(runId);
    return {
      runId,
      totalAnalyzed: 0,
      totalFailed: 0,
      dashboard: null,
      signalCount: 0,
      regionCount: 0,
      elapsedMs: Date.now() - start,
      categoryResults: [],
    };
  }

  // -- Step 2: Round-Robin 병렬 분석 --
  checkCancelled();
  callbacks.onStepStart?.("analysis", "뉴스 분석");

  const activeCategories: CategoryKey[] = categories?.length
    ? categories
    : ALL_CATEGORIES;

  try {
    // 카테고리별 미분석 기사 큐 로드
    const queues = new Map<CategoryKey, ArticleInput[]>();
    let totalTarget = 0;
    const fetchLimit = limitPerCategory === Infinity ? 999999 : limitPerCategory;

    for (const cat of activeCategories) {
      const articles = getUnanalyzedArticles(fetchLimit, cat, dateFrom, dateTo);
      queues.set(cat, articles);
      totalTarget += articles.length;
      console.log(`[Pipeline] 큐 로드: ${cat} - ${articles.length}건${limitPerCategory !== Infinity ? ` (limit: ${limitPerCategory})` : ""}`);
    }

    // 카테고리별 통계
    const stats = new Map<CategoryKey, { analyzed: number; failed: number }>();
    for (const cat of activeCategories) {
      stats.set(cat, { analyzed: 0, failed: 0 });
    }

    const analysisStart = Date.now();
    let rounds = 0;

    // 진행률 보고 헬퍼
    function reportProgress() {
      const processed = totalAnalyzed + totalFailed;
      const parts = activeCategories.map((cat) => {
        const s = stats.get(cat)!;
        return `${CATEGORY_LABEL_MAP[cat]} ${s.analyzed}건`;
      });
      const detail = parts.join(" / ");
      callbacks.onArticleProgress?.("analysis", processed, totalTarget, totalFailed, detail);
    }

    // Round-Robin 루프
    while (true) {
      // 시간 체크 (aggregate 시간 확보)
      const elapsed = Date.now() - analysisStart;
      if (elapsed >= MAX_ANALYSIS_MS) {
        console.log(`[Pipeline] Round-Robin 시간 초과 (${Math.round(elapsed / 1000)}초) - aggregate 진입`);
        break;
      }

      checkCancelled();

      // 배치 구성: 각 카테고리에서 chunkSize건씩
      const batch: { article: ArticleInput; category: CategoryKey }[] = [];
      for (const cat of activeCategories) {
        const queue = queues.get(cat);
        if (!queue || queue.length === 0) continue;
        const chunk = queue.splice(0, CHUNK_SIZE);
        for (const article of chunk) {
          batch.push({ article, category: cat });
        }
      }

      if (batch.length === 0) {
        console.log("[Pipeline] 모든 큐 소진 - Round-Robin 종료");
        break;
      }

      rounds++;

      // 병렬 처리
      const results = await runConcurrent(
        batch,
        (item) => analyzeWithRetry(item.article),
        concurrency,
        signal
      );

      // 결과 저장 + 통계
      for (let i = 0; i < batch.length; i++) {
        const result = results[i];
        const { article, category } = batch[i];
        const catStat = stats.get(category)!;

        if (result instanceof Error) {
          totalFailed++;
          catStat.failed++;
        } else {
          saveAnalysis(article.id, result);
          totalAnalyzed++;
          catStat.analyzed++;
        }
      }

      reportProgress();

      if (rounds % 5 === 0) {
        const sec = Math.round((Date.now() - analysisStart) / 1000);
        console.log(`[Pipeline] Round ${rounds}: 분석 ${totalAnalyzed}건, 실패 ${totalFailed}건 (${sec}초)`);
      }
    }

    // 카테고리별 결과 기록
    for (const cat of activeCategories) {
      const s = stats.get(cat)!;
      categoryResults.push({ category: cat, analyzed: s.analyzed, failed: s.failed });
    }

    // 완료 detail
    const detailParts = activeCategories.map((cat) => {
      const s = stats.get(cat)!;
      return `${CATEGORY_LABEL_MAP[cat]} ${s.analyzed}건`;
    });
    const completionDetail = `${rounds}라운드, ${detailParts.join(" / ")}`;
    console.log(`[Pipeline] Round-Robin 완료: ${completionDetail}`);
    callbacks.onStepComplete?.("analysis", completionDetail);
  } catch (err) {
    if (err instanceof PipelineCancelledError) throw err;
    console.error("[Pipeline] Round-Robin 분석 에러:", (err as Error).message);
    callbacks.onStepError?.("analysis", err as Error);
  }

  // -- 외부 데이터: 국회 입법 동향 --
  if (includeAssembly) {
    checkCancelled();
    callbacks.onStepStart?.("assembly", "국회 입법 동향");
    try {
      const keywords = ["물가", "고용", "자영업", "소상공인", "금융", "부동산", "주거", "임대", "대출", "복지"];
      console.log("[Pipeline] 국회 입법 동향 조회 시작...");
      const [legislation, bills, nars] = await Promise.all([
        fetchLegislationByKeywords(keywords, 10).catch(() => [] as AssemblyLegislation[]),
        fetchBillsByKeywords(keywords, 10).catch(() => [] as AssemblyBill[]),
        fetchNarsAnalysesByKeywords(keywords, 5).catch(() => [] as NarsAnalysis[]),
      ]);

      // DB 저장
      const db = getDb();
      const now = new Date().toISOString();

      if (legislation.length > 0) {
        const insertLeg = db.prepare(`
          INSERT OR REPLACE INTO assembly_legislations
            (bill_id, bill_no, name, proposer, proposer_kind, committee, deadline_dt, link_url, synced_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const txnLeg = db.transaction(() => {
          for (const l of legislation) {
            insertLeg.run(l.billId, l.billNo, l.name, l.proposer, l.proposerKind, l.committee, l.deadlineDt, l.linkUrl, now);
          }
        });
        txnLeg();
      }

      if (bills.length > 0) {
        const insertBill = db.prepare(`
          INSERT OR REPLACE INTO assembly_bills
            (bill_id, bill_no, name, kind, proposer_kind, propose_dt, result, link_url, synced_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const txnBill = db.transaction(() => {
          for (const b of bills) {
            insertBill.run(b.billId, b.billNo, b.name, b.kind, b.proposerKind, b.proposeDt, b.result, b.linkUrl, now);
          }
        });
        txnBill();
      }

      if (nars.length > 0) {
        db.prepare(
          `INSERT OR REPLACE INTO dashboard_cache (key, value, updated_at)
           VALUES ('nars_analyses', ?, datetime('now'))`
        ).run(JSON.stringify(nars));
      }

      const detail = `입법예고 ${legislation.length}건, 의안 ${bills.length}건, 현안분석 ${nars.length}건`;
      console.log(`[Pipeline] 국회 입법 동향 완료 (DB 저장): ${detail}`);
      callbacks.onStepComplete?.("assembly", detail);
    } catch (err) {
      if (err instanceof PipelineCancelledError) throw err;
      console.error("[Pipeline] 국회 입법 동향 에러:", (err as Error).message);
      callbacks.onStepError?.("assembly", err as Error);
    }
  }

  // -- 외부 데이터: 보조금24 정책 --
  if (includeGovServices) {
    checkCancelled();
    callbacks.onStepStart?.("govServices", "보조금24 정책");
    try {
      const targetCategories = categories?.length
        ? categories
        : ALL_CATEGORIES;
      console.log("[Pipeline] 보조금24 정책 조회 시작...");

      const allServices: GovService[] = [];
      for (const cat of targetCategories) {
        const services = await fetchGovServicesByCategory(cat, 5).catch(() => [] as GovService[]);
        allServices.push(...services);
      }

      // DB 저장 (중복 제거)
      if (allServices.length > 0) {
        const db = getDb();
        const now = new Date().toISOString();
        const insertSvc = db.prepare(`
          INSERT OR REPLACE INTO gov_services
            (service_id, service_name, service_purpose, support_type, target_audience,
             selection_criteria, support_content, apply_method, apply_deadline,
             detail_url, org_name, dept_name, contact, service_field, org_type,
             reception_org, view_count, registered_at, modified_at, synced_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const seen = new Set<string>();
        const txn = db.transaction(() => {
          for (const s of allServices) {
            if (seen.has(s.serviceId)) continue;
            seen.add(s.serviceId);
            insertSvc.run(
              s.serviceId, s.serviceName, s.servicePurpose, s.supportType,
              s.targetAudience, s.selectionCriteria, s.supportContent, s.applyMethod,
              s.applyDeadline, s.detailUrl, s.orgName, s.deptName, s.contact,
              s.serviceField, s.orgType, s.receptionOrg, s.viewCount,
              s.registeredAt, s.modifiedAt, now
            );
          }
        });
        txn();
      }

      const detail = `보조금24 ${allServices.length}건`;
      console.log(`[Pipeline] 보조금24 정책 완료 (DB 저장): ${detail}`);
      callbacks.onStepComplete?.("govServices", detail);
    } catch (err) {
      if (err instanceof PipelineCancelledError) throw err;
      console.error("[Pipeline] 보조금24 정책 에러:", (err as Error).message);
      callbacks.onStepError?.("govServices", err as Error);
    }
  }

  // -- 종합 분석: aggregate (위기 신호 탐지 + 지역 집계 + 대시보드 AI) --
  checkCancelled();
  callbacks.onStepStart?.("aggregate", "종합 리스크 산출");

  let dashboard: DashboardBuildResult | null = null;
  let signalCount = 0;
  let regionCount = 0;

  try {
    // 1) 위기 신호 탐지 (AI) - 선택된 카테고리만, run_id 포함
    // 증분 모드에서는 기존 신호를 유지하고 새 신호만 추가 (rebuild=false)
    console.log(`[Pipeline] 위기 신호 탐지 시작... (incremental=${incremental})`);
    const signalResult = await detectSignals({
      windowDays: signalWindowDays,
      rebuild: !incremental,
      categories,
      runId,
    });
    signalCount = signalResult.signalCount;
    console.log(`[Pipeline] 위기 신호 탐지 완료: ${signalCount}건`);

    // 2) 지역별 집계 (run_id 포함)
    console.log("[Pipeline] 지역별 집계 시작...");
    const regions = aggregateRegions(runId);
    regionCount = regions.filter((r) => r.score > 0).length;
    console.log(`[Pipeline] 지역별 집계 완료: ${regionCount}곳`);

    // 3) 대시보드 빌드 (AI) - 선택된 카테고리만, run_id 포함
    console.log("[Pipeline] 대시보드 빌드 시작...");
    dashboard = await buildDashboard({ categories, runId });
    console.log(`[Pipeline] 대시보드 빌드 완료: ${dashboard.overallScore}점 (${dashboard.severity})`);

    callbacks.onStepComplete?.(
      "aggregate",
      `뉴스분석 ${totalAnalyzed}건, 위기신호 ${signalCount}건, 종합점수 ${dashboard.overallScore}점`
    );
  } catch (err) {
    if (err instanceof PipelineCancelledError) throw err;
    console.error("[Pipeline] aggregate 에러:", (err as Error).message);
    callbacks.onStepError?.("aggregate", err as Error);
  }

  // -- Step: thumbnails (og:image 썸네일 추출) --
  checkCancelled();
  callbacks.onStepStart?.("thumbnails", "썸네일 추출");
  try {
    const thumbArticles = getArticlesWithoutThumbnail(200);
    if (thumbArticles.length > 0) {
      console.log(`[Pipeline] 썸네일 추출 시작: ${thumbArticles.length}건`);
      const thumbCount = await fetchAndSaveThumbnails(thumbArticles, 5);
      console.log(`[Pipeline] 썸네일 추출 완료: ${thumbCount}/${thumbArticles.length}건`);
      callbacks.onStepComplete?.("thumbnails", `${thumbCount}건 추출`);
    } else {
      console.log("[Pipeline] 썸네일 추출: 대상 없음");
      callbacks.onStepComplete?.("thumbnails", "대상 없음");
    }
  } catch (err) {
    if (err instanceof PipelineCancelledError) throw err;
    console.error("[Pipeline] 썸네일 추출 에러:", (err as Error).message);
    callbacks.onStepError?.("thumbnails", err as Error);
  }

  // -- Step: compare (전일대비 비교) --
  if (dashboard) {
    checkCancelled();
    callbacks.onStepStart?.("compare", "전일대비 분석");

    try {
      const categoryScores: Record<string, number> = {};
      // dashboard 빌드 결과에서 카테고리 점수 추출 (dashboard_cache에서)
      const db = getDb(true);
      const cached = db.prepare("SELECT value FROM dashboard_cache WHERE key = 'dashboard'").get() as { value: string } | undefined;
      if (cached) {
        const data = JSON.parse(cached.value);
        for (const cat of (data.categories || [])) {
          categoryScores[cat.category] = cat.score;
        }
      }

      const dailyDelta = calculateDailyDelta(
        runId,
        dashboard.overallScore,
        dashboard.severity,
        categoryScores,
      );

      if (dailyDelta) {
        // AI 요약이 있으면 dailyDelta에 추가
        const dashCached = db.prepare("SELECT value FROM dashboard_cache WHERE key = 'dashboard'").get() as { value: string } | undefined;
        if (dashCached) {
          const dashData = JSON.parse(dashCached.value);
          if (dashData.comparisonSummary) {
            dailyDelta.aiSummary = dashData.comparisonSummary;
          }
        }

        // 전일대비 결과를 스냅샷으로 저장
        saveDashboardSnapshot(runId, "daily_delta", JSON.stringify(dailyDelta));

        const dir = dailyDelta.overall.direction === "up" ? "+" : dailyDelta.overall.direction === "down" ? "" : "";
        console.log(`[Pipeline] 전일대비: ${dir}${dailyDelta.overall.delta}점, 신규신호 ${dailyDelta.signals.newCount}건`);
        callbacks.onStepComplete?.("compare", `전일대비 ${dir}${dailyDelta.overall.delta}점`);
      } else {
        console.log("[Pipeline] 전일대비: 이전 분석 데이터 없음 (첫 분석)");
        callbacks.onStepComplete?.("compare", "이전 분석 없음 (첫 분석)");
      }
    } catch (err) {
      console.error("[Pipeline] compare 에러:", (err as Error).message);
      callbacks.onStepError?.("compare", err as Error);
    }
  }

  // -- Finalize: 분석 회차 완료 처리 --
  if (dashboard) {
    const usage = usageTracker.getSummary();
    // 카테고리 점수를 dashboard_cache에서 추출
    const catScoresForRun: Record<string, number> = {};
    try {
      const dbInstance = getDb();
      const dashCached = dbInstance.prepare("SELECT value FROM dashboard_cache WHERE key = 'dashboard'").get() as { value: string } | undefined;
      if (dashCached) {
        const dashData = JSON.parse(dashCached.value);
        for (const cat of (dashData.categories || [])) {
          catScoresForRun[cat.category] = cat.score;
        }
      }
    } catch { /* skip */ }

    completeAnalysisRun(runId, {
      overallScore: dashboard.overallScore,
      overallSeverity: dashboard.severity,
      summary: dashboard.summary,
      prices: catScoresForRun["prices"],
      employment: catScoresForRun["employment"],
      selfEmployed: catScoresForRun["selfEmployed"],
      finance: catScoresForRun["finance"],
      realEstate: catScoresForRun["realEstate"],
      articlesTotal: totalAnalyzed + totalFailed,
      articlesAnalyzed: totalAnalyzed,
      tokenUsage: usage.totalCalls > 0 ? {
        totalCalls: usage.totalCalls,
        totalInputTokens: usage.totalInputTokens,
        totalOutputTokens: usage.totalOutputTokens,
        totalCost: usage.totalCost,
      } : undefined,
    });

    // score_history 보정: buildDashboard에서 저장 실패했을 경우 여기서 재시도
    try {
      const dbForHistory = getDb();
      const runRow = dbForHistory.prepare("SELECT run_date FROM analysis_runs WHERE id = ?").get(runId) as { run_date: string } | undefined;
      const scoreDate = runRow?.run_date || new Date().toISOString().slice(0, 10);
      const existing = dbForHistory.prepare("SELECT date FROM score_history WHERE date = ?").get(scoreDate);
      if (!existing) {
        dbForHistory.prepare(
          `INSERT OR REPLACE INTO score_history
             (date, overall_score, prices, employment, self_employed, finance, real_estate, run_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          scoreDate,
          dashboard.overallScore,
          catScoresForRun["prices"] ?? 0,
          catScoresForRun["employment"] ?? 0,
          catScoresForRun["selfEmployed"] ?? 0,
          catScoresForRun["finance"] ?? 0,
          catScoresForRun["realEstate"] ?? 0,
          runId,
        );
        console.log(`[Pipeline] score_history 보정 저장: ${scoreDate} = ${dashboard.overallScore}점`);
      }
    } catch (err) {
      console.error("[Pipeline] score_history 보정 실패:", (err as Error).message);
    }

    invalidateDataCache();
    console.log(`[Pipeline] 분석 회차 완료 (runId: ${runId})`);
  } else {
    failAnalysisRun(runId);
    console.log(`[Pipeline] 분석 회차 실패 (runId: ${runId})`);
  }

  return {
    runId,
    totalAnalyzed,
    totalFailed,
    dashboard,
    signalCount,
    regionCount,
    elapsedMs: Date.now() - start,
    categoryResults,
  };
}
