/**
 * POST /api/reporters/insights
 * 기자의 시선 AI 인사이트 생성 (SSE 스트리밍)
 *
 * 사전 계산된 통계 → Claude API 4단계 → reporter_cache 업데이트
 */

import { errorResponse } from "@/lib/api/response";
import { getDb } from "@/lib/db";
import { usageTracker } from "@/lib/api/ai-client";
import { loadReporterData } from "@/lib/irumi/reporters-query";
import {
  generateBannerInsight,
  generateConvergenceInsights,
  generateSurgeReasons,
  generateProfileSummaries,
} from "@/lib/irumi/reporters-ai";
import type { ReporterData } from "@/lib/irumi/types";

export const maxDuration = 120;

let isRunning = false;

export async function POST() {
  if (isRunning) {
    return errorResponse("이미 AI 인사이트 생성이 진행 중입니다", 409);
  }

  isRunning = true;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: Record<string, unknown>) {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // stream closed
        }
      }

      const totalSteps = 4;
      let completed = 0;

      usageTracker.reset();

      try {
        // 기존 통계 데이터 로드
        const data: ReporterData = loadReporterData();
        const surging = data.leaderboard.filter((r) => r.surgeRatio >= 2);

        // Step 1: 인사이트 배너
        send("step-start", {
          stepId: "banner",
          label: "인사이트 배너 생성",
          currentStepIndex: completed,
          totalSteps,
        });
        const aiSummary = await generateBannerInsight(data);
        completed++;
        send("step-complete", {
          stepId: "banner",
          detail: `${aiSummary.slice(0, 40)}...`,
          currentStepIndex: completed,
          totalSteps,
          percent: Math.round((completed / totalSteps) * 100),
        });

        // Step 2: 교차취재 해석
        send("step-start", {
          stepId: "convergence",
          label: "교차취재 위기 해석",
          currentStepIndex: completed,
          totalSteps,
        });
        const convInsights = await generateConvergenceInsights(data.convergence);
        completed++;
        send("step-complete", {
          stepId: "convergence",
          detail: `${convInsights.length}건 해석 완료`,
          currentStepIndex: completed,
          totalSteps,
          percent: Math.round((completed / totalSteps) * 100),
        });

        // Step 3: 급증 원인 분석
        send("step-start", {
          stepId: "surge",
          label: "출고 급증 원인 분석",
          currentStepIndex: completed,
          totalSteps,
        });
        const surgeReasons = await generateSurgeReasons(surging);
        completed++;
        send("step-complete", {
          stepId: "surge",
          detail: `${surgeReasons.length}명 분석 완료`,
          currentStepIndex: completed,
          totalSteps,
          percent: Math.round((completed / totalSteps) * 100),
        });

        // Step 4: 기자 프로파일 요약
        send("step-start", {
          stepId: "profile",
          label: "기자 프로파일 AI 요약",
          currentStepIndex: completed,
          totalSteps,
        });
        const profileSummaries = await generateProfileSummaries(
          data.leaderboard
        );
        completed++;
        send("step-complete", {
          stepId: "profile",
          detail: `${profileSummaries.length}명 요약 완료`,
          currentStepIndex: completed,
          totalSteps,
          percent: 100,
        });

        // 결과 병합
        const enriched: ReporterData = {
          ...data,
          aiSummary,
          aiAnalyzedAt: new Date().toISOString(),
          convergence: data.convergence.map((c) => {
            const found = convInsights.find((ci) => ci.topic === c.topic);
            return found ? { ...c, aiInsight: found.insight } : c;
          }),
          leaderboard: data.leaderboard.map((r) => {
            const surge = surgeReasons.find((s) => s.name === r.name);
            const profile = profileSummaries.find((p) => p.name === r.name);
            return {
              ...r,
              ...(surge ? { surgeReason: surge.reason } : {}),
              ...(profile ? { aiProfileSummary: profile.summary } : {}),
            };
          }),
        };

        // reporter_cache 업데이트
        try {
          const db = getDb();
          db.prepare(
            "INSERT OR REPLACE INTO reporter_cache (cache_key, data, computed_at) VALUES (?, ?, datetime('now'))"
          ).run("reporters", JSON.stringify(enriched));
        } catch (e) {
          console.error("[ReporterInsights] cache 업데이트 실패:", e);
        }

        const usage = usageTracker.getSummary();

        send("complete", {
          aiSummary,
          convergenceCount: convInsights.length,
          surgeCount: surgeReasons.length,
          profileCount: profileSummaries.length,
          enrichedData: enriched,
          tokenUsage: {
            totalCalls: usage.totalCalls,
            totalTokens: usage.totalTokens,
            totalCost: usage.totalCost,
          },
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "AI 인사이트 생성 중 오류 발생";
        console.error("[ReporterInsights] 에러:", message);
        send("error", { message });
      } finally {
        isRunning = false;
        controller.close();
      }
    },
    cancel() {
      isRunning = false;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
