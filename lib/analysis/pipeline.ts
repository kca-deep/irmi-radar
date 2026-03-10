/**
 * 분석 파이프라인 오케스트레이터
 *
 * 단계별 실행 흐름:
 * 1. collect      - 미분석 기사 확인
 * 2. prices       - 물가 카테고리 기사 분석
 * 3. employment   - 고용 카테고리 기사 분석
 * 4. selfEmployed - 자영업 카테고리 기사 분석
 * 5. finance      - 금융 카테고리 기사 분석
 * 6. realEstate   - 부동산 카테고리 기사 분석
 * 7. aggregate    - 위기 신호 탐지 + 지역 집계 + 종합 대시보드 (AI)
 *
 * ANALYSIS_STEPS 상수와 1:1 매핑
 */

import { analyzeArticles } from "./article-analyzer";
import { detectSignals } from "./signal-detector";
import { buildDashboard, type DashboardBuildResult } from "./dashboard-builder";
import { aggregateRegions } from "./region-aggregator";
import { fetchLegislationByKeywords, fetchBillsByKeywords, fetchNarsAnalysesByKeywords } from "@/lib/api/assembly";
import { fetchGovServicesByCategory } from "@/lib/api/gov-service";
import { getDb, initializeSchema } from "@/lib/db/index";
import type { CategoryKey, AssemblyLegislation, AssemblyBill, GovService, NarsAnalysis } from "@/lib/types";

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
    failed: number
  ) => void;
}

export interface PipelineResult {
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

const CATEGORY_STEPS: { stepId: string; label: string; category: CategoryKey }[] = [
  { stepId: "prices", label: "물가 분석", category: "prices" },
  { stepId: "employment", label: "고용 분석", category: "employment" },
  { stepId: "selfEmployed", label: "자영업 분석", category: "selfEmployed" },
  { stepId: "finance", label: "금융 분석", category: "finance" },
  { stepId: "realEstate", label: "부동산 분석", category: "realEstate" },
];

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

  console.log("[Pipeline] 파이프라인 시작");
  console.log("[Pipeline] 옵션:", {
    categories: categories?.join(", ") || "전체",
    dateFrom: dateFrom || "없음",
    dateTo: dateTo || "없음",
    limitPerCategory,
    concurrency,
    includeAssembly,
    includeGovServices,
  });

  // -- Step 1: collect (데이터 수집 확인) --
  checkCancelled();
  callbacks.onStepStart?.("collect", "데이터 수집");

  // 선택된 카테고리별로 미분석 기사 수 확인
  let totalUnanalyzed = 0;
  if (categories?.length) {
    for (const cat of categories) {
      const r = await analyzeArticles({ dryRun: true, category: cat, dateFrom, dateTo });
      totalUnanalyzed += r.total;
      console.log(`[Pipeline] 미분석 기사 (${cat}): ${r.total}건`);
    }
  } else {
    const r = await analyzeArticles({ dryRun: true, dateFrom, dateTo });
    totalUnanalyzed = r.total;
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

  callbacks.onStepComplete?.(
    "collect",
    `미분석 기사 ${totalUnanalyzed.toLocaleString()}건 확인`
  );

  if (dryRun) {
    return {
      totalAnalyzed: 0,
      totalFailed: 0,
      dashboard: null,
      signalCount: 0,
      regionCount: 0,
      elapsedMs: Date.now() - start,
      categoryResults: [],
    };
  }

  // -- Step 2~6: 카테고리별 기사 분석 --
  const activeSteps = categories?.length
    ? CATEGORY_STEPS.filter((s) => categories.includes(s.category))
    : CATEGORY_STEPS;

  for (const step of activeSteps) {
    checkCancelled();
    console.log(`[Pipeline] 카테고리 분석 시작: ${step.label} (${step.category})`);
    callbacks.onStepStart?.(step.stepId, step.label);

    try {
      const result = await analyzeArticles({
        category: step.category,
        limit: limitPerCategory === Infinity ? undefined : limitPerCategory,
        concurrency,
        batchSize,
        dateFrom,
        dateTo,
        signal,
        onProgress: (processed, total, failed) => {
          callbacks.onArticleProgress?.(step.stepId, processed, total, failed);
        },
      });

      totalAnalyzed += result.analyzed;
      totalFailed += result.failed;
      categoryResults.push({
        category: step.category,
        analyzed: result.analyzed,
        failed: result.failed,
      });

      console.log(`[Pipeline] 카테고리 분석 완료: ${step.category} - ${result.analyzed}건 분석, ${result.failed}건 실패 (${result.elapsedMs}ms)`);

      callbacks.onStepComplete?.(
        step.stepId,
        `${result.analyzed}건` +
          (result.failed > 0 ? ` (${result.failed}건 실패)` : "")
      );
    } catch (err) {
      if (err instanceof PipelineCancelledError) throw err;
      console.error(`[Pipeline] 카테고리 분석 에러: ${step.category}`, (err as Error).message);
      callbacks.onStepError?.(step.stepId, err as Error);
      categoryResults.push({
        category: step.category,
        analyzed: 0,
        failed: 0,
      });
    }
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
        : CATEGORY_STEPS.map((s) => s.category);
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
    // 1) 위기 신호 탐지 (AI) - 선택된 카테고리만
    console.log("[Pipeline] 위기 신호 탐지 시작...");
    const signalResult = await detectSignals({
      windowDays: signalWindowDays,
      rebuild: true,
      categories,
    });
    signalCount = signalResult.signalCount;
    console.log(`[Pipeline] 위기 신호 탐지 완료: ${signalCount}건`);

    // 2) 지역별 집계
    console.log("[Pipeline] 지역별 집계 시작...");
    const regions = aggregateRegions();
    regionCount = regions.filter((r) => r.score > 0).length;
    console.log(`[Pipeline] 지역별 집계 완료: ${regionCount}곳`);

    // 3) 대시보드 빌드 (AI) - 선택된 카테고리만
    console.log("[Pipeline] 대시보드 빌드 시작...");
    dashboard = await buildDashboard({ categories });
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

  return {
    totalAnalyzed,
    totalFailed,
    dashboard,
    signalCount,
    regionCount,
    elapsedMs: Date.now() - start,
    categoryResults,
  };
}
