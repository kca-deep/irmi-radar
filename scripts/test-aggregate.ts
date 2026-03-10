/**
 * aggregate 단계만 테스트 (기사 재분석 없이)
 * 위기신호(AI) + 지역집계 + 대시보드(AI)
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { detectSignals } from "../lib/analysis/signal-detector";
import { aggregateRegions } from "../lib/analysis/region-aggregator";
import { buildDashboard } from "../lib/analysis/dashboard-builder";
import { usageTracker } from "../lib/api/ai-client";

async function main() {
  console.log("\n=== 1. 위기 신호 탐지 (AI) ===\n");
  const signalResult = await detectSignals({ windowDays: 30, rebuild: true });
  console.log(`신호 ${signalResult.signalCount}건 생성:`);
  for (const sig of signalResult.signals) {
    console.log(`\n  [${sig.severity}/${sig.score}] ${sig.title}`);
    console.log(`  설명: ${sig.description}`);
    console.log(`  원인: ${sig.cause}`);
    console.log(`  영향: ${sig.impact}`);
    console.log(`  지역: ${sig.region || "전국"}`);
    console.log(`  대응: ${sig.actionPoints.join(" / ")}`);
    console.log(`  근거기사: ${sig.articleIds.length}건`);
  }

  console.log("\n=== 2. 지역별 집계 ===\n");
  const regions = aggregateRegions();
  const activeRegions = regions.filter((r) => r.score > 0);
  console.log(`전체 ${regions.length}개 시도 중 ${activeRegions.length}곳 데이터 존재:`);
  for (const r of activeRegions) {
    console.log(`  ${r.name}: ${r.score}점 | 물가:${r.categoryPrices} 고용:${r.categoryEmployment} 자영업:${r.categorySelfEmployed} 금융:${r.categoryFinance} 부동산:${r.categoryRealEstate} | ${r.topIssue}`);
  }

  console.log("\n=== 3. 대시보드 빌드 (AI) ===\n");
  const dashboard = await buildDashboard();
  console.log(`종합 점수: ${dashboard.overallScore} (${dashboard.severity})`);
  console.log(`요약: ${dashboard.summary}`);
  console.log(`핵심 위기: ${dashboard.keyRisks.join(" / ")}`);
  console.log(`전망: ${dashboard.outlook}`);
  console.log(`신호: 총 ${dashboard.signalCount}건 (긴급 ${dashboard.criticalCount}, 주의 ${dashboard.warningCount})`);

  // API 사용량 요약
  const usage = usageTracker.getSummary();
  console.log("\n=== 4. API 사용량 요약 ===\n");
  console.log(`총 API 호출: ${usage.totalCalls}회`);
  console.log(`입력 토큰: ${usage.totalInputTokens.toLocaleString()}`);
  console.log(`출력 토큰: ${usage.totalOutputTokens.toLocaleString()}`);
  console.log(`총 토큰: ${usage.totalTokens.toLocaleString()}`);
  console.log(`예상 비용: $${usage.totalCost.toFixed(4)} (약 ${Math.ceil(usage.totalCost * 1400)}원)`);
  console.log("\n호출 상세:");
  for (const c of usage.calls) {
    console.log(`  [${c.provider}/${c.model}] in:${c.inputTokens} out:${c.outputTokens} = $${c.estimatedCost.toFixed(4)}`);
  }

  console.log("\n=== 완료 ===\n");
}

main().catch(console.error);
