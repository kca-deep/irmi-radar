"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiBrain01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

import type { AnalysisState } from "@/lib/types";

interface AnalysisControlPanelProps {
  totalArticleCount: number;
  analysisState: AnalysisState;
  onOpenModal: () => void;
}

export function AnalysisControlPanel({
  totalArticleCount,
  analysisState,
  onOpenModal,
}: AnalysisControlPanelProps) {
  const isRunning = analysisState === "running";

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <HugeiconsIcon
              icon={AiBrain01Icon}
              size={20}
              strokeWidth={2}
              className="text-primary"
            />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">
              AI 뉴스 분석
            </h2>
            <p className="text-[11px] text-muted-foreground truncate">
              {totalArticleCount.toLocaleString()}건의 뉴스 데이터를 AI가
              분석하여 민생 위기 신호를 감지합니다
            </p>
          </div>
        </div>
        <Button
          onClick={onOpenModal}
          disabled={isRunning}
          className="gap-2 shrink-0"
          size="sm"
        >
          {isRunning ? (
            <>
              <HugeiconsIcon
                icon={Loading03Icon}
                size={14}
                strokeWidth={2}
                className="animate-spin"
              />
              분석 진행 중...
            </>
          ) : (
            <>
              <HugeiconsIcon icon={AiBrain01Icon} size={14} strokeWidth={2} />
              AI 분석 시작하기
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
