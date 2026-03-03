"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Tick02Icon,
  Loading03Icon,
  Clock01Icon,
  Cancel01Icon,
  DashboardSpeed01Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SEVERITY_LABEL_MAP } from "@/lib/constants";
import { SEVERITY_COLOR_MAP } from "@/lib/icon-maps";
import { cn } from "@/lib/utils";

import type {
  AnalysisProgress,
  AnalysisResult,
  AnalysisState,
  AnalysisStepStatus,
} from "@/lib/types";

interface AnalysisProgressModalProps {
  open: boolean;
  analysisState: AnalysisState;
  progress: AnalysisProgress | null;
  result: AnalysisResult | null;
  onCancel: () => void;
  onGoToDashboard: () => void;
  onClose: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}분 ${s.toString().padStart(2, "0")}초`;
  return `${s}초`;
}

function StepIcon({ status }: { status: AnalysisStepStatus }) {
  switch (status) {
    case "completed":
      return (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-safe/20 text-safe">
          <HugeiconsIcon icon={Tick02Icon} size={12} strokeWidth={2.5} />
        </span>
      );
    case "running":
      return (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary">
          <HugeiconsIcon
            icon={Loading03Icon}
            size={12}
            strokeWidth={2}
            className="animate-spin"
          />
        </span>
      );
    case "error":
      return (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-danger/20 text-danger">
          <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={2} />
        </span>
      );
    default:
      return (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      );
  }
}

function StepStatusLabel({ status }: { status: AnalysisStepStatus }) {
  const map: Record<AnalysisStepStatus, { text: string; className: string }> = {
    completed: { text: "완료", className: "text-safe" },
    running: { text: "진행중", className: "text-primary" },
    error: { text: "실패", className: "text-danger" },
    pending: { text: "대기", className: "text-muted-foreground" },
  };
  const config = map[status];
  return (
    <span className={cn("text-[10px] font-medium", config.className)}>
      {config.text}
    </span>
  );
}

export function AnalysisProgressModal({
  open,
  analysisState,
  progress,
  result,
  onCancel,
  onGoToDashboard,
  onClose,
}: AnalysisProgressModalProps) {
  const isCompleted = analysisState === "completed" && result;
  const isRunning = analysisState === "running";

  // 완료 시 등급 색상
  const severityColor = result
    ? SEVERITY_COLOR_MAP[result.severity]
    : "primary";
  const severityLabel = result ? SEVERITY_LABEL_MAP[result.severity] : "";

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <HugeiconsIcon
              icon={isCompleted ? Tick02Icon : Loading03Icon}
              size={18}
              strokeWidth={2}
              className={cn(
                isCompleted ? "text-safe" : "text-primary animate-spin"
              )}
            />
            AI 뉴스 분석
          </DialogTitle>
          <DialogDescription>
            {isCompleted
              ? "분석이 완료되었습니다."
              : "AI가 뉴스 기사를 분석하고 있습니다. 잠시 기다려 주세요."}
          </DialogDescription>
        </DialogHeader>

        {/* 통합 모달: 진행 + 결과 */}
        {(isRunning || isCompleted) && progress && (
          <div className="space-y-4">
            {/* 전체 진행률 */}
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="flex items-baseline gap-1">
                <span
                  className={cn(
                    "text-4xl font-bold tabular-nums",
                    isCompleted ? "text-safe" : "text-primary"
                  )}
                >
                  {progress.percent}
                </span>
                <span className="text-sm font-semibold text-muted-foreground">%</span>
              </div>
              <div className="relative w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
                    isCompleted ? "bg-safe" : "bg-primary"
                  )}
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <span className="text-[11px] text-muted-foreground">
                {progress.processedCount.toLocaleString()} / {progress.totalCount.toLocaleString()}건 분석 완료
              </span>
            </div>

            {/* 단계별 진행 현황 */}
            <div className="space-y-1 rounded-lg border border-border/30 bg-background p-3">
              <div className="text-[10px] font-medium text-muted-foreground mb-2">
                단계별 진행 현황
              </div>
              {progress.steps.map((step, idx) => (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-center justify-between py-1.5",
                    idx < progress.steps.length - 1 &&
                      "border-b border-border/20"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <StepIcon status={step.status} />
                    <span
                      className={cn(
                        "text-xs",
                        step.status === "running"
                          ? "font-medium text-foreground"
                          : step.status === "completed"
                            ? "text-muted-foreground"
                            : "text-muted-foreground/60"
                      )}
                    >
                      {idx + 1}. {step.label}
                    </span>
                  </div>
                  <StepStatusLabel status={step.status} />
                </div>
              ))}
            </div>

            {/* 시간 정보 (진행중/완료 공통) */}
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <HugeiconsIcon icon={Clock01Icon} size={12} strokeWidth={2} />
                {isCompleted ? "소요" : "경과"}: {formatTime(progress.elapsedSeconds)}
              </span>
              {isRunning && progress.estimatedRemainingSeconds > 0 && (
                <span>
                  예상 잔여: {formatTime(progress.estimatedRemainingSeconds)}
                </span>
              )}
            </div>

            {/* 완료 시 결과 요약 */}
            {isCompleted && result && (
              <div className="flex items-center gap-3 rounded-lg border border-border/30 bg-background px-4 py-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs text-muted-foreground">종합 리스크</span>
                  <span
                    className={cn(
                      "text-lg font-bold",
                      `text-${severityColor}`
                    )}
                  >
                    {result.overallScore}점
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded",
                      `bg-${severityColor}/15 text-${severityColor}`
                    )}
                  >
                    {severityLabel}
                  </span>
                </div>
                <div className="h-4 w-px bg-border/50" />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">위기 신호</span>
                  <span className="text-sm font-semibold text-foreground">
                    {result.signalCount}건
                  </span>
                </div>
              </div>
            )}

            {/* 하단 버튼 */}
            <div className="flex justify-end gap-2 pt-1">
              {isRunning && (
                <Button variant="outline" size="sm" onClick={onCancel}>
                  <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
                  분석 취소
                </Button>
              )}
              {isCompleted && (
                <>
                  <Button variant="outline" size="sm" onClick={onGoToDashboard}>
                    <HugeiconsIcon icon={DashboardSpeed01Icon} size={14} strokeWidth={2} />
                    대시보드 보기
                  </Button>
                  <Button size="sm" onClick={onClose}>
                    결과 확인
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* 에러 상태 */}
        {analysisState === "error" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-center">
              <p className="text-xs text-danger font-medium mb-1">
                분석 중 오류가 발생했습니다
              </p>
              <p className="text-[10px] text-muted-foreground">
                잠시 후 다시 시도해 주세요
              </p>
            </div>
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={onClose}>
                닫기
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
