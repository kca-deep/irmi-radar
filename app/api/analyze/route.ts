import { errorResponse } from "@/lib/api/response";
import { runPipeline, PipelineCancelledError } from "@/lib/analysis/pipeline";
import { getSeverityByScore } from "@/lib/constants";
import { usageTracker } from "@/lib/api/ai-client";
import type { CategoryKey, AnalysisPeriodPreset } from "@/lib/types";

export const maxDuration = 300; // 5분 타임아웃

interface AnalyzeRequest {
  categories?: CategoryKey[];
  period?: AnalysisPeriodPreset;
  customStartDate?: string;
  customEndDate?: string;
  limitPerCategory?: number;
  concurrency?: number;
  includeAssembly?: boolean;
  includeGovServices?: boolean;
}

// period -> dateFrom/dateTo 변환
function getDateRange(
  period?: AnalysisPeriodPreset,
  customStart?: string,
  customEnd?: string
): { dateFrom?: string; dateTo?: string } {
  if (!period || period === "all") return {};

  if (period === "custom") {
    return {
      dateFrom: customStart || undefined,
      dateTo: customEnd || undefined,
    };
  }

  const daysMap: Record<string, number> = {
    "1w": 7,
    "1m": 30,
    "3m": 90,
    "6m": 180,
    "1y": 365,
  };

  const days = daysMap[period];
  if (!days) return {};

  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - days);

  return {
    dateFrom: from.toISOString(),
    dateTo: now.toISOString(),
  };
}

// 동시 분석 방지
let isAnalyzing = false;

/**
 * POST /api/analyze
 * SSE 스트리밍으로 분석 파이프라인 실행 및 실시간 진행률 전달
 */
export async function POST(request: Request) {
  if (isAnalyzing) {
    return errorResponse("이미 분석이 진행 중입니다", 409);
  }

  let body: AnalyzeRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const { categories, period, customStartDate, customEndDate, limitPerCategory, concurrency, includeAssembly, includeGovServices } = body;
  const { dateFrom, dateTo } = getDateRange(period, customStartDate, customEndDate);

  console.log("\n[Analyze] ========== 분석 요청 ==========");
  console.log("[Analyze] 카테고리:", categories?.join(", ") || "전체");
  console.log("[Analyze] 기간:", period || "all", dateFrom ? `(${dateFrom} ~ ${dateTo})` : "");
  console.log("[Analyze] 외부 데이터:", { includeAssembly: !!includeAssembly, includeGovServices: !!includeGovServices });
  console.log("[Analyze] ================================\n");

  isAnalyzing = true;

  const abortController = new AbortController();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // SSE 이벤트 발행 헬퍼
      function sendEvent(event: string, data: Record<string, unknown>) {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // 스트림이 이미 닫힌 경우 무시
        }
      }

      // 전체 단계 수 계산 (collect + analysis + 외부데이터 + aggregate + thumbnails + compare)
      const externalStepCount = (includeAssembly ? 1 : 0) + (includeGovServices ? 1 : 0);
      const totalSteps = 1 + 1 + externalStepCount + 1 + 1 + 1; // collect + analysis + external + aggregate + thumbnails + compare
      let completedSteps = 0;

      // 토큰 사용량 추적 초기화
      usageTracker.reset();

      try {
        const result = await runPipeline(
          {
            categories,
            dateFrom,
            dateTo,
            limitPerCategory,
            concurrency: concurrency ?? 10,
            batchSize: 200,
            signalWindowDays: 30,
            includeAssembly: !!includeAssembly,
            includeGovServices: !!includeGovServices,
            signal: abortController.signal,
          },
          {
            onStepStart: (stepId, label) => {
              console.log(`[Pipeline] >> 시작: ${label} (${stepId})`);
              sendEvent("step-start", {
                stepId,
                label,
                currentStepIndex: completedSteps,
                totalSteps,
              });
            },
            onStepComplete: (stepId, detail) => {
              completedSteps += 1;
              const percent = Math.round((completedSteps / totalSteps) * 100);
              console.log(`[Pipeline] << 완료: ${stepId} - ${detail} (${percent}%)`);
              sendEvent("step-complete", {
                stepId,
                detail,
                currentStepIndex: completedSteps,
                totalSteps,
                percent: Math.min(percent, 99),
              });
            },
            onStepError: (stepId, error) => {
              console.error(`[Pipeline] !! 에러: ${stepId} - ${error.message}`);
              sendEvent("step-error", {
                stepId,
                message: error.message,
              });
            },
            onArticleProgress: (stepId, processed, total, failed, detail) => {
              const stepProgress = total > 0 ? processed / total : 0;
              const overallPercent = Math.round(
                ((completedSteps + stepProgress) / totalSteps) * 100
              );
              if (processed % 10 === 0 || processed === total) {
                console.log(`[Pipeline] .. 진행: ${stepId} ${processed}/${total}건 (실패: ${failed}) - 전체 ${overallPercent}%`);
              }
              sendEvent("progress", {
                stepId,
                processed,
                total,
                failed,
                detail,
                completedSteps,
                totalSteps,
                percent: Math.min(overallPercent, 99),
              });
            },
          }
        );

        console.log("\n[Analyze] ========== 분석 완료 ==========");
        console.log("[Analyze] 총 분석:", result.totalAnalyzed, "건");
        console.log("[Analyze] 총 실패:", result.totalFailed, "건");
        console.log("[Analyze] 신호 수:", result.signalCount, "건");
        console.log("[Analyze] 종합 점수:", result.dashboard?.overallScore ?? 0);
        console.log("[Analyze] 등급:", result.dashboard?.severity ?? "N/A");
        console.log("[Analyze] 소요 시간:", Math.round(result.elapsedMs / 1000), "초");
        console.log("[Analyze] ================================\n");

        const usage = usageTracker.getSummary();
        const lastCall = usage.calls.length > 0 ? usage.calls[usage.calls.length - 1] : null;

        sendEvent("complete", {
          runId: result.runId,
          overallScore: result.dashboard?.overallScore ?? 0,
          severity: result.dashboard?.severity ?? getSeverityByScore(0),
          signalCount: result.signalCount,
          totalAnalyzed: result.totalAnalyzed,
          totalFailed: result.totalFailed,
          elapsedSeconds: Math.round(result.elapsedMs / 1000),
          tokenUsage: {
            totalCalls: usage.totalCalls,
            totalInputTokens: usage.totalInputTokens,
            totalOutputTokens: usage.totalOutputTokens,
            totalTokens: usage.totalTokens,
            totalCost: usage.totalCost,
            provider: lastCall?.provider ?? "",
            model: lastCall?.model ?? "",
          },
        });
      } catch (err) {
        if (err instanceof PipelineCancelledError) {
          console.log("[Analyze] 분석이 취소되었습니다");
          sendEvent("cancelled", { message: "분석이 취소되었습니다" });
        } else {
          const message = err instanceof Error ? err.message : "분석 중 오류가 발생했습니다";
          console.error(`[Analyze] !! 치명적 에러: ${message}`);
          sendEvent("error", { message });
        }
      } finally {
        isAnalyzing = false;
        controller.close();
      }
    },
    cancel() {
      console.log("[Analyze] SSE 스트림 취소 - AbortController abort 호출");
      abortController.abort();
      isAnalyzing = false;
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
