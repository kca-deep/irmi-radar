/**
 * POST /api/reporters/insights
 * 기자의 시선 AI 인사이트 생성 (SSE 스트리밍)
 *
 * 사전 계산된 통계 → Claude API 4단계 → RDB 테이블 업데이트
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

        // RDB 테이블에 AI 결과 저장
        try {
          const db = getDb();
          const now = new Date().toISOString();

          // reporter_meta
          db.prepare("INSERT OR REPLACE INTO reporter_meta (key, value) VALUES ('ai_summary', ?)").run(aiSummary);
          db.prepare("INSERT OR REPLACE INTO reporter_meta (key, value) VALUES ('ai_analyzed_at', ?)").run(now);

          // reporter_profiles: surge_reason, ai_profile
          const updateSurge = db.prepare("UPDATE reporter_profiles SET surge_reason = ? WHERE writer = ?");
          for (const s of surgeReasons) updateSurge.run(s.reason, s.name);

          const updateProfile = db.prepare("UPDATE reporter_profiles SET ai_profile = ? WHERE writer = ?");
          for (const p of profileSummaries) updateProfile.run(p.summary, p.name);

          // reporter_convergence: ai_insight
          const updateConv = db.prepare("UPDATE reporter_convergence SET ai_insight = ? WHERE topic = ?");
          for (const ci of convInsights) updateConv.run(ci.insight, ci.topic);
        } catch (e) {
          console.error("[ReporterInsights] RDB 업데이트 실패:", e);
        }

        // 업데이트된 데이터 다시 로드
        const enriched = loadReporterData();

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
