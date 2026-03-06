"use client";

import { useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Tick02Icon,
  Loading03Icon,
  Clock01Icon,
  Cancel01Icon,
  DashboardSpeed01Icon,
  AiBrain01Icon,
  Calendar03Icon,
  FilterIcon,
  Building02Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  SEVERITY_LABEL_MAP,
  ANALYSIS_PERIOD_PRESETS,
  CATEGORIES,
  ANALYSIS_SECONDS_PER_ARTICLE,
} from "@/lib/constants";
import { SEVERITY_COLOR_MAP, CATEGORY_ICON_MAP } from "@/lib/icon-maps";
import { cn } from "@/lib/utils";

import type {
  NewsArticle,
  CategoryKey,
  AnalysisPeriodPreset,
  AnalysisProgress,
  AnalysisResult,
  AnalysisState,
  AnalysisStepStatus,
  ExternalDataOptions,
} from "@/lib/types";

interface AnalysisProgressModalProps {
  open: boolean;
  analysisState: AnalysisState;
  progress: AnalysisProgress | null;
  result: AnalysisResult | null;
  articles: NewsArticle[];
  selectedPeriod: AnalysisPeriodPreset;
  customStartDate: string;
  customEndDate: string;
  selectedCategories: CategoryKey[];
  externalData: ExternalDataOptions;
  onPeriodChange: (period: AnalysisPeriodPreset) => void;
  onCustomStartDateChange: (date: string) => void;
  onCustomEndDateChange: (date: string) => void;
  onCategoriesChange: (categories: CategoryKey[]) => void;
  onExternalDataChange: (options: ExternalDataOptions) => void;
  onStartAnalysis: () => void;
  onCancel: () => void;
  onGoToDashboard: () => void;
  onClose: () => void;
}

function getDateRange(
  preset: AnalysisPeriodPreset,
  customStart: string,
  customEnd: string,
  articles: NewsArticle[]
): { start: Date | null; end: Date | null } {
  if (preset === "custom") {
    return {
      start: customStart ? new Date(customStart) : null,
      end: customEnd ? new Date(customEnd) : null,
    };
  }
  if (preset === "all") {
    return { start: null, end: null };
  }
  const presetConfig = ANALYSIS_PERIOD_PRESETS.find((p) => p.key === preset);
  if (!presetConfig?.days) return { start: null, end: null };
  const latestDate = articles.reduce((latest, a) => {
    const d = new Date(a.publishedAt);
    return d > latest ? d : latest;
  }, new Date(0));
  const start = new Date(latestDate);
  start.setDate(start.getDate() - presetConfig.days);
  return { start, end: latestDate };
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
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-safe/20 text-safe">
          <HugeiconsIcon icon={Tick02Icon} size={13} strokeWidth={2.5} />
        </span>
      );
    case "running":
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary">
          <HugeiconsIcon
            icon={Loading03Icon}
            size={13}
            strokeWidth={2}
            className="animate-spin"
          />
        </span>
      );
    case "error":
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-danger/20 text-danger">
          <HugeiconsIcon icon={Cancel01Icon} size={13} strokeWidth={2} />
        </span>
      );
    default:
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      );
  }
}

// ── 메인 모달 ──

export function AnalysisProgressModal({
  open,
  analysisState,
  progress,
  result,
  articles,
  selectedPeriod,
  customStartDate,
  customEndDate,
  selectedCategories,
  externalData,
  onPeriodChange,
  onCustomStartDateChange,
  onCustomEndDateChange,
  onCategoriesChange,
  onExternalDataChange,
  onStartAnalysis,
  onCancel,
  onGoToDashboard,
  onClose,
}: AnalysisProgressModalProps) {
  const isCompleted = analysisState === "completed" && result;
  const isRunning = analysisState === "running";
  const isIdle = analysisState === "idle";
  const isActive = isRunning || isCompleted;

  const severityColor = result ? SEVERITY_COLOR_MAP[result.severity] : "primary";
  const severityLabel = result ? SEVERITY_LABEL_MAP[result.severity] : "";

  // 분석 대상 기사 수
  const targetArticleCount = useMemo(() => {
    const { start, end } = getDateRange(
      selectedPeriod,
      customStartDate,
      customEndDate,
      articles
    );
    return articles.filter((article) => {
      if (
        selectedCategories.length > 0 &&
        !selectedCategories.includes(article.category)
      ) return false;
      if (start || end) {
        const d = new Date(article.publishedAt);
        if (start && d < start) return false;
        if (end && d > end) return false;
      }
      return true;
    }).length;
  }, [articles, selectedPeriod, customStartDate, customEndDate, selectedCategories]);

  const estimatedSeconds = Math.ceil(targetArticleCount * ANALYSIS_SECONDS_PER_ARTICLE);
  const estimatedMinutes = Math.floor(estimatedSeconds / 60);
  const estimatedRemainderSec = estimatedSeconds % 60;
  const estimatedTimeText =
    estimatedMinutes > 0
      ? `약 ${estimatedMinutes}분 ${estimatedRemainderSec > 0 ? `${estimatedRemainderSec}초` : ""}`
      : `약 ${estimatedSeconds}초`;

  const isAllCategories = selectedCategories.length === 0;
  const periodLabel = ANALYSIS_PERIOD_PRESETS.find((p) => p.key === selectedPeriod)?.label ?? "";

  function handleCategoryToggle(key: CategoryKey) {
    if (selectedCategories.includes(key)) {
      onCategoriesChange(selectedCategories.filter((c) => c !== key));
    } else {
      onCategoriesChange([...selectedCategories, key]);
    }
  }

  // 설정 요약 텍스트 (진행/완료 시 표시)
  const settingSummaryParts: string[] = [];
  settingSummaryParts.push(periodLabel || "전체 기간");
  if (isAllCategories) {
    settingSummaryParts.push("전체 카테고리");
  } else {
    const labels = selectedCategories.map(
      (k) => CATEGORIES.find((c) => c.key === k)?.label ?? k
    );
    settingSummaryParts.push(labels.join(", "));
  }
  if (externalData.includeAssembly) settingSummaryParts.push("국회 입법 동향");
  if (externalData.includeGovServices) settingSummaryParts.push("보조금24 정책");

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !isRunning) onClose(); }}>
      <DialogContent
        showCloseButton={!isRunning}
        className="sm:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <HugeiconsIcon
              icon={isCompleted ? Tick02Icon : AiBrain01Icon}
              size={18}
              strokeWidth={2}
              className={cn(
                isCompleted ? "text-safe" : "text-primary",
                isRunning && "animate-pulse"
              )}
            />
            AI 뉴스 분석
          </DialogTitle>
          <DialogDescription>
            {isIdle
              ? "분석 조건을 설정한 후 시작하세요."
              : isCompleted
                ? "분석이 완료되었습니다."
                : "AI가 뉴스 기사를 분석하고 있습니다."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* ── 설정 영역 ── */}
          {isIdle ? (
            <>
              {/* 분석 기간 */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={Calendar03Icon} size={14} strokeWidth={2} className="text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">분석 기간</span>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {ANALYSIS_PERIOD_PRESETS.map((preset) => (
                    <button
                      key={preset.key}
                      onClick={() => onPeriodChange(preset.key)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-medium transition-colors border border-border/50",
                        selectedPeriod === preset.key
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                {selectedPeriod === "custom" && (
                  <div className="flex items-center gap-2">
                    <Input type="date" value={customStartDate} onChange={(e) => onCustomStartDateChange(e.target.value)} className="h-7 text-xs w-[130px]" />
                    <span className="text-xs text-muted-foreground">~</span>
                    <Input type="date" value={customEndDate} onChange={(e) => onCustomEndDateChange(e.target.value)} className="h-7 text-xs w-[130px]" />
                  </div>
                )}
              </div>

              {/* 카테고리 */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={FilterIcon} size={14} strokeWidth={2} className="text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">분석 카테고리</span>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    onClick={() => onCategoriesChange([])}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium transition-colors border border-border/50",
                      isAllCategories
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    전체
                  </button>
                  {CATEGORIES.map((cat) => {
                    const isSelected = selectedCategories.includes(cat.key);
                    const icon = CATEGORY_ICON_MAP[cat.key];
                    return (
                      <button
                        key={cat.key}
                        onClick={() => handleCategoryToggle(cat.key)}
                        className={cn(
                          "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border border-border/50",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <HugeiconsIcon icon={icon} size={12} strokeWidth={2} />
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 외부 데이터 연계 */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={Building02Icon} size={14} strokeWidth={2} className="text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">외부 데이터 연계</span>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    onClick={() => onExternalDataChange({ ...externalData, includeAssembly: !externalData.includeAssembly })}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border border-border/50",
                      externalData.includeAssembly
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    국회 입법 동향
                  </button>
                  <button
                    onClick={() => onExternalDataChange({ ...externalData, includeGovServices: !externalData.includeGovServices })}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border border-border/50",
                      externalData.includeGovServices
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    보조금24 정책 정보
                  </button>
                </div>
                {(externalData.includeAssembly || externalData.includeGovServices) && (
                  <p className="text-[11px] text-muted-foreground">
                    선택한 외부 데이터가 AI 분석 컨텍스트에 포함됩니다
                  </p>
                )}
              </div>
            </>
          ) : (
            /* 진행/완료 시 설정 요약 (접힌 상태) */
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/30 bg-muted/30 px-3 py-2">
              <span className="text-[11px] font-medium text-muted-foreground shrink-0">분석 조건</span>
              <div className="flex flex-wrap items-center gap-1">
                {settingSummaryParts.map((part, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && (
                      <HugeiconsIcon icon={ArrowRight01Icon} size={10} strokeWidth={2} className="text-border" />
                    )}
                    <Badge variant="secondary" className="text-[11px] font-normal py-0">
                      {part}
                    </Badge>
                  </span>
                ))}
              </div>
              <Badge variant="secondary" className="text-[11px] font-normal py-0 ml-auto">
                {targetArticleCount.toLocaleString()}건
              </Badge>
            </div>
          )}

          {/* ── 진행률 + 단계 ── */}
          {isActive && progress && (
            <>
              {/* 진행률 바 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-1">
                    <span
                      className={cn(
                        "text-2xl font-bold tabular-nums",
                        isCompleted ? "text-safe" : "text-primary"
                      )}
                    >
                      {progress.percent}%
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {progress.processedCount.toLocaleString()} / {progress.totalCount.toLocaleString()}건
                  </span>
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
              </div>

              {/* 단계별 진행 현황 (가로) */}
              <div className="rounded-lg border border-border/30 bg-background px-4 py-3">
                <div className="text-xs font-medium text-muted-foreground mb-3">
                  단계별 진행 현황
                </div>
                <div className="flex items-start">
                  {progress.steps.map((step, idx) => (
                    <div key={step.id} className="flex items-start flex-1 min-w-0">
                      <div className="flex flex-col items-center gap-1.5 w-full min-w-0 px-0.5">
                        <StepIcon status={step.status} />
                        <span
                          className={cn(
                            "text-[11px] text-center leading-snug break-keep",
                            step.status === "running"
                              ? "font-semibold text-foreground"
                              : step.status === "completed"
                                ? "font-medium text-safe"
                                : "text-muted-foreground"
                          )}
                        >
                          {step.label}
                        </span>
                      </div>
                      {idx < progress.steps.length - 1 && (
                        <div className="mt-3 mx-0.5 shrink-0 w-4">
                          <div
                            className={cn(
                              "h-px w-full",
                              step.status === "completed" ? "bg-safe/50" : "bg-border"
                            )}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 시간 정보 */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <HugeiconsIcon icon={Clock01Icon} size={13} strokeWidth={2} />
                  {isCompleted ? "소요" : "경과"}: {formatTime(progress.elapsedSeconds)}
                </span>
                {isRunning && progress.estimatedRemainingSeconds > 0 && (
                  <span>예상 잔여: {formatTime(progress.estimatedRemainingSeconds)}</span>
                )}
              </div>
            </>
          )}

          {/* ── 완료 결과 요약 ── */}
          {isCompleted && result && (
            <div className="flex items-center gap-3 rounded-lg border border-border/30 bg-background px-4 py-3">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs text-muted-foreground">종합 리스크</span>
                <span className={cn("text-lg font-bold", `text-${severityColor}`)}>
                  {result.overallScore}점
                </span>
                <span
                  className={cn(
                    "text-[11px] font-medium px-1.5 py-0.5 rounded",
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

          {/* ── 에러 ── */}
          {analysisState === "error" && (
            <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-center">
              <p className="text-xs text-danger font-medium mb-1">
                분석 중 오류가 발생했습니다
              </p>
              <p className="text-[11px] text-muted-foreground">
                잠시 후 다시 시도해 주세요
              </p>
            </div>
          )}

          {/* ── 하단 영역 ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/30">
            {/* 좌측: 분석 대상 정보 (설정 모드) */}
            {isIdle && (
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-xs font-normal gap-1">
                  분석 대상
                  <span className="font-semibold text-foreground">
                    {targetArticleCount.toLocaleString()}건
                  </span>
                </Badge>
                {targetArticleCount > 0 && (
                  <span className="text-[11px] text-muted-foreground">
                    예상 소요: {estimatedTimeText}
                  </span>
                )}
              </div>
            )}

            {/* 좌측: 빈 공간 (진행/완료/에러 모드) */}
            {!isIdle && <div />}

            {/* 우측: 액션 버튼 */}
            <div className="flex items-center gap-2">
              {isIdle && (
                <>
                  <Button variant="outline" size="sm" onClick={onClose}>
                    취소
                  </Button>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={onStartAnalysis}
                    disabled={targetArticleCount === 0}
                  >
                    <HugeiconsIcon icon={AiBrain01Icon} size={14} strokeWidth={2} />
                    분석 시작
                  </Button>
                </>
              )}
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
              {analysisState === "error" && (
                <Button variant="outline" size="sm" onClick={onClose}>
                  닫기
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
