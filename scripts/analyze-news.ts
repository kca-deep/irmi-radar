#!/usr/bin/env npx tsx
/**
 * AI 뉴스 분석 CLI 스크립트
 *
 * 사용법:
 *   npx tsx scripts/analyze-news.ts [옵션]
 *
 * 옵션:
 *   --limit N          카테고리당 최대 처리 건수 (기본: 전체)
 *   --concurrency N    동시 API 요청 수 (기본: 10)
 *   --batch-size N     DB 트랜잭션 단위 (기본: 200)
 *   --category KEY     특정 카테고리만 (prices|employment|selfEmployed|finance|realEstate)
 *   --dry-run          대상 건수만 확인 (API 호출 없음)
 *   --signal-days N    신호 탐지 기간 (기본: 30일)
 *
 * 예시:
 *   npx tsx scripts/analyze-news.ts --dry-run
 *   npx tsx scripts/analyze-news.ts --limit 100 --concurrency 5
 *   npx tsx scripts/analyze-news.ts --category prices --limit 50
 */

import * as dotenv from "dotenv";
import path from "path";

// .env.local 로드 (프로젝트 루트 기준)
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { runPipeline } from "../lib/analysis/pipeline";
import { analyzeArticles } from "../lib/analysis/article-analyzer";
import type { CategoryKey } from "../lib/types";

// -- CLI 인자 파싱 --

function parseArgs() {
  const args = process.argv.slice(2);
  const opts: Record<string, string | boolean> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--dry-run") {
      opts.dryRun = true;
    } else if (arg.startsWith("--") && i + 1 < args.length) {
      const key = arg.slice(2);
      opts[key] = args[++i];
    }
  }

  return {
    limit: opts.limit ? parseInt(opts.limit as string, 10) : undefined,
    concurrency: opts.concurrency
      ? parseInt(opts.concurrency as string, 10)
      : 10,
    batchSize: opts["batch-size"]
      ? parseInt(opts["batch-size"] as string, 10)
      : 200,
    category: (opts.category as CategoryKey) || undefined,
    dryRun: !!opts.dryRun,
    signalDays: opts["signal-days"]
      ? parseInt(opts["signal-days"] as string, 10)
      : 30,
  };
}

// -- 시간 포맷 --

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m > 0) return `${m}분 ${sec}초`;
  return `${sec}초`;
}

// -- 메인 --

async function main() {
  const opts = parseArgs();

  console.log("========================================");
  console.log("  IRMI AI 뉴스 분석 파이프라인");
  console.log("========================================");
  console.log();

  // 환경 확인
  const provider = process.env.AI_PROVIDER || "openai";
  const model = provider === "anthropic"
    ? (process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6")
    : (process.env.OPENAI_MODEL || "gpt-4.1-nano");
  const hasKey = provider === "anthropic"
    ? !!process.env.ANTHROPIC_API_KEY
    : !!process.env.OPENAI_API_KEY;

  console.log(`  Provider : ${provider}`);
  console.log(`  Model    : ${model}`);
  console.log(`  API Key  : ${hasKey ? "OK" : "MISSING"}`);
  console.log(`  Concurrency : ${opts.concurrency}`);
  console.log(`  Batch Size  : ${opts.batchSize}`);
  if (opts.category) console.log(`  Category : ${opts.category}`);
  if (opts.limit) console.log(`  Limit    : ${opts.limit}/category`);
  if (opts.dryRun) console.log(`  Mode     : DRY RUN`);
  console.log();

  if (!hasKey) {
    console.error("API 키가 설정되지 않았습니다. .env.local을 확인하세요.");
    process.exit(1);
  }

  // 단일 카테고리 모드
  if (opts.category) {
    console.log(`[${opts.category}] 분석 시작...`);
    const result = await analyzeArticles({
      category: opts.category,
      limit: opts.limit,
      concurrency: opts.concurrency,
      batchSize: opts.batchSize,
      dryRun: opts.dryRun,
      onProgress: (processed, total, failed) => {
        const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
        process.stdout.write(
          `\r  [${pct}%] ${processed}/${total} (실패: ${failed})`
        );
      },
    });

    console.log();
    console.log();
    console.log(`  완료: ${result.analyzed}건 분석, ${result.failed}건 실패`);
    console.log(`  소요: ${formatDuration(result.elapsedMs)}`);
    return;
  }

  // 전체 파이프라인 모드
  const result = await runPipeline(
    {
      limitPerCategory: opts.limit,
      concurrency: opts.concurrency,
      batchSize: opts.batchSize,
      signalWindowDays: opts.signalDays,
      dryRun: opts.dryRun,
    },
    {
      onStepStart: (stepId, label) => {
        console.log(`[${stepId}] ${label} 시작...`);
      },
      onStepComplete: (stepId, detail) => {
        // 이전 줄의 progress 덮어쓰기 해제
        process.stdout.write("\r" + " ".repeat(60) + "\r");
        console.log(`[${stepId}] ${detail}`);
      },
      onStepError: (stepId, error) => {
        console.error(`[${stepId}] 에러: ${error.message}`);
      },
      onArticleProgress: (_stepId, processed, total, failed) => {
        const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
        process.stdout.write(
          `\r  [${pct}%] ${processed}/${total} (실패: ${failed})`
        );
      },
    }
  );

  console.log();
  console.log("========================================");
  console.log("  분석 완료");
  console.log("========================================");
  console.log();
  console.log(`  총 분석: ${result.totalAnalyzed.toLocaleString()}건`);
  console.log(`  총 실패: ${result.totalFailed}건`);
  console.log(`  위기 신호: ${result.signalCount}건`);
  if (result.dashboard) {
    console.log(
      `  종합 점수: ${result.dashboard.overallScore}점 (${result.dashboard.severity})`
    );
  }
  console.log(`  소요 시간: ${formatDuration(result.elapsedMs)}`);
  console.log();

  // 카테고리별 요약
  if (result.categoryResults.length > 0) {
    console.log("  카테고리별:");
    for (const cat of result.categoryResults) {
      const failText = cat.failed > 0 ? ` (실패 ${cat.failed})` : "";
      console.log(`    ${cat.category}: ${cat.analyzed}건${failText}`);
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
