"use client";

import { useMemo, Fragment } from "react";
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
  CoinsIcon,
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
  CATEGORY_LABEL_MAP,
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
  AnalysisStep,
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
  onCategoryToggle: (key: CategoryKey | "all") => void;
  onExternalDataToggle: (key: keyof ExternalDataOptions) => void;
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

function StepIcon({ status, size = "md" }: { status: AnalysisStepStatus; size?: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  const iconSize = size === "sm" ? 11 : 13;

  switch (status) {
    case "completed":
      return (
        <span className={cn("flex items-center justify-center rounded-full bg-safe/20 text-safe", sizeClass)}>
          <HugeiconsIcon icon={Tick02Icon} size={iconSize} strokeWidth={2.5} />
        </span>
      );
    case "running":
      return (
        <span className={cn("flex items-center justify-center rounded-full bg-primary/20 text-primary", sizeClass)}>
          <HugeiconsIcon
            icon={Loading03Icon}
            size={iconSize}
            strokeWidth={2}
            className="animate-spin"
          />
        </span>
      );
    case "error":
      return (
        <span className={cn("flex items-center justify-center rounded-full bg-danger/20 text-danger", sizeClass)}>
          <HugeiconsIcon icon={Cancel01Icon} size={iconSize} strokeWidth={2} />
        </span>
      );
    default:
      return (
        <span className={cn("flex items-center justify-center rounded-full bg-muted text-muted-foreground", sizeClass)}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      );
  }
}

// -- Phase 그룹핑 (카드형 진행 현황) --

const CATEGORY_STEP_IDS = ["prices", "employment", "selfEmployed", "finance", "realEstate"];
const EXTERNAL_STEP_IDS = ["assembly", "govServices"];

interface PhaseGroup {
  id: "collect" | "categorize" | "external" | "aggregate";
  label: string;
  steps: AnalysisStep[];
  status: AnalysisStepStatus;
  progress: number;
  breakdown?: { label: string; count: number | null; unit?: string; isTotal?: boolean }[];
}

function derivePhaseStatus(steps: AnalysisStep[]): AnalysisStepStatus {
  if (steps.some((s) => s.status === "error")) return "error";
  if (steps.some((s) => s.status === "running")) return "running";
  if (steps.every((s) => s.status === "completed")) return "completed";
  return "pending";
}

function calcPhaseProgress(steps: AnalysisStep[]): number {
  if (steps.length === 0) return 0;
  let total = 0;
  for (const step of steps) {
    if (step.status === "completed") {
      total += 100;
    } else if (step.status === "running") {
      const match = step.detail?.match(/^(\d+)\/(\d+)/);
      if (match) {
        total += (parseInt(match[1]) / parseInt(match[2])) * 100;
      } else {
        total += 50;
      }
    }
  }
  return Math.round(total / steps.length);
}

function groupStepsIntoPhases(
  steps: AnalysisStep[],
  articles: NewsArticle[],
  selectedCategories: CategoryKey[],
): PhaseGroup[] {
  const phases: PhaseGroup[] = [];

  const collectStep = steps.find((s) => s.id === "collect");
  if (collectStep) {
    const activeCats = selectedCategories.length > 0
      ? CATEGORIES.filter((c) => selectedCategories.includes(c.key))
      : CATEGORIES;
    const catCounts = activeCats.map((cat) => ({
      label: cat.label,
      count: articles.filter((a) => a.category === cat.key).length as number | null,
    }));
    const total = catCounts.reduce((sum, c) => sum + (c.count ?? 0), 0);
    const breakdown = [...catCounts, { label: "합계", count: total, isTotal: true }];

    phases.push({
      id: "collect",
      label: "데이터 수집",
      steps: [collectStep],
      status: collectStep.status,
      progress: collectStep.status === "completed" ? 100 : collectStep.status === "running" ? 50 : 0,
      breakdown,
    });
  }

  const catSteps = steps.filter((s) => CATEGORY_STEP_IDS.includes(s.id));
  if (catSteps.length > 0) {
    phases.push({
      id: "categorize",
      label: "카테고리별 분석",
      steps: catSteps,
      status: derivePhaseStatus(catSteps),
      progress: calcPhaseProgress(catSteps),
    });
  }

  const extSteps = steps.filter((s) => EXTERNAL_STEP_IDS.includes(s.id));
  if (extSteps.length > 0) {
    // detail 문자열에서 "라벨 N건" 패턴을 파싱, 없으면 placeholder
    const parsed: { label: string; count: number | null }[] = [];
    for (const step of extSteps) {
      if (step.detail) {
        const parts = step.detail.split(/,\s*/);
        for (const part of parts) {
          const match = part.match(/(.+?)\s*(\d+)건/);
          if (match) {
            parsed.push({ label: match[1].trim(), count: parseInt(match[2]) });
          }
        }
      }
    }

    // placeholder: 항상 구조화된 breakdown 표시
    const hasAssembly = extSteps.some((s) => s.id === "assembly");
    const hasGov = extSteps.some((s) => s.id === "govServices");
    const placeholders: { label: string; count: number | null }[] = [];
    if (hasAssembly) {
      placeholders.push(
        { label: "입법예고", count: null },
        { label: "의안", count: null },
        { label: "현안분석", count: null },
      );
    }
    if (hasGov) {
      placeholders.push({ label: "보조금24", count: null });
    }

    // 파싱된 값으로 placeholder 채우기
    const extBreakdown = placeholders.map((ph) => {
      const found = parsed.find((p) => p.label === ph.label);
      return { label: ph.label, count: found?.count ?? ph.count };
    });

    phases.push({
      id: "external",
      label: "외부 API",
      steps: extSteps,
      status: derivePhaseStatus(extSteps),
      progress: calcPhaseProgress(extSteps),
      breakdown: extBreakdown,
    });
  }

  const aggStep = steps.find((s) => s.id === "aggregate");
  if (aggStep) {
    // detail 문자열에서 "라벨 N건/N점" 패턴을 파싱, 없으면 placeholder
    const parsed: { label: string; count: number | null; unit?: string }[] = [];
    if (aggStep.detail) {
      const parts = aggStep.detail.split(/,\s*/);
      for (const part of parts) {
        const match = part.match(/(.+?)\s*(\d+)(건|점|곳)/);
        if (match) {
          parsed.push({ label: match[1].trim(), count: parseInt(match[2]), unit: match[3] });
        }
      }
    }

    // placeholder: 항상 구조화된 breakdown 표시
    const aggBreakdown: { label: string; count: number | null; unit?: string }[] = [
      { label: "뉴스분석", count: null, unit: "건" },
      { label: "위기신호", count: null, unit: "건" },
      { label: "종합점수", count: null, unit: "점" },
    ].map((ph) => {
      const found = parsed.find((p) => p.label === ph.label);
      return found ? { ...ph, count: found.count, unit: found.unit } : ph;
    });

    phases.push({
      id: "aggregate",
      label: "종합 산출",
      steps: [aggStep],
      status: aggStep.status,
      progress: aggStep.status === "completed" ? 100 : aggStep.status === "running" ? 50 : 0,
      breakdown: aggBreakdown,
    });
  }

  return phases;
}

function PhaseCard({ phase }: { phase: PhaseGroup }) {
  const hasSubSteps = phase.id === "categorize";

  return (
    <div
      className={cn(
        "rounded-lg border bg-card shadow-sm p-3 flex flex-col gap-2 min-w-0 overflow-hidden sm:flex-1",
        phase.status === "completed"
          ? "border-safe/40"
          : phase.status === "running"
            ? "border-primary/40 ring-1 ring-primary/20"
            : phase.status === "error"
              ? "border-danger/40"
              : "border-border",
      )}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-[11px] font-semibold truncate",
            phase.status === "running"
              ? "text-primary"
              : "text-foreground",
          )}
        >
          {phase.label}
        </span>
        <StepIcon status={phase.status} size="sm" />
      </div>

      {/* 상세 내용 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {phase.breakdown ? (
          <div className="space-y-0.5">
            {phase.breakdown.map((item) => {
              const isTotalRow = "isTotal" in item && item.isTotal;
              return (
                <div
                  key={item.label}
                  className={cn(
                    "flex items-center justify-between gap-2 text-[10px]",
                    isTotalRow
                      ? "text-foreground font-medium border-t border-border/30 pt-0.5 mt-0.5"
                      : "text-muted-foreground",
                  )}
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    {!isTotalRow && (
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full shrink-0",
                          phase.status === "completed"
                            ? "bg-safe"
                            : phase.status === "running"
                              ? "bg-primary animate-pulse"
                              : "bg-muted-foreground/30",
                        )}
                      />
                    )}
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="tabular-nums shrink-0">
                    {item.count !== null ? `${item.count}${item.unit || "건"}` : "-"}
                  </span>
                </div>
              );
            })}
          </div>
        ) : hasSubSteps ? (
          /* 카테고리별 분석: step 기반 + 합계 */
          <div className="space-y-0.5">
            {phase.steps.map((step) => (
              <div
                key={step.id}
                className={cn(
                  "flex items-center justify-between gap-2 text-[10px]",
                  step.status === "running"
                    ? "text-primary font-medium"
                    : "text-muted-foreground",
                )}
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full shrink-0",
                      step.status === "completed"
                        ? "bg-safe"
                        : step.status === "running"
                          ? "bg-primary animate-pulse"
                          : "bg-muted-foreground/30",
                    )}
                  />
                  <span className="truncate">
                    {CATEGORY_LABEL_MAP[step.id as CategoryKey] || step.label}
                  </span>
                </span>
                <span className="tabular-nums shrink-0">{step.detail || "-"}</span>
              </div>
            ))}
            {/* 합계 행 */}
            {phase.status !== "pending" && (() => {
              const totalAnalyzed = phase.steps.reduce((sum, s) => {
                const m = s.detail?.match(/^(\d+)/);
                return sum + (m ? parseInt(m[1]) : 0);
              }, 0);
              return totalAnalyzed > 0 ? (
                <div className="flex items-center justify-between gap-2 text-[10px] text-foreground font-medium border-t border-border/30 pt-0.5 mt-0.5">
                  <span className="truncate">합계</span>
                  <span className="tabular-nums shrink-0">{totalAnalyzed}건</span>
                </div>
              ) : null;
            })()}
          </div>
        ) : null}
      </div>

      {/* 미니 프로그레스 바 */}
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            phase.status === "completed"
              ? "bg-safe"
              : phase.status === "running"
                ? "bg-primary"
                : phase.status === "error"
                  ? "bg-danger"
                  : "bg-transparent",
          )}
          style={{ width: `${phase.progress}%` }}
        />
      </div>
    </div>
  );
}

// -- 메인 모달 --

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
  onCategoryToggle,
  onExternalDataToggle,
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

  // 분석 대상 기사 수 (설정 화면용)
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

  const isAllCategories = selectedCategories.length === 0;
  const periodLabel = ANALYSIS_PERIOD_PRESETS.find((p) => p.key === selectedPeriod)?.label ?? "";

  function handleCategoryToggle(key: CategoryKey) {
    onCategoryToggle(key);
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

  // Phase 그룹핑
  const phases = useMemo(() => {
    if (!progress) return [];
    return groupStepsIntoPhases(progress.steps, articles, selectedCategories);
  }, [progress, articles, selectedCategories]);

  // Phase 기반 진행률 텍스트
  const phaseProgressText = progress && phases.length > 0
    ? `${phases.filter((p) => p.status === "completed").length} / ${phases.length} 단계`
    : "";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !isRunning) onClose(); }}>
      <DialogContent
        showCloseButton={!isRunning}
        className="sm:max-w-4xl"
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
          {/* -- 설정 영역 -- */}
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
                    onClick={() => onCategoryToggle("all")}
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
                    onClick={() => onExternalDataToggle("includeAssembly")}
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
                    onClick={() => onExternalDataToggle("includeGovServices")}
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
            </div>
          )}

          {/* -- 진행률 + 단계 -- */}
          {isActive && progress && (
            <>
              {/* 진행률 바 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={cn(
                        "text-2xl font-bold tabular-nums",
                        isCompleted ? "text-safe" : "text-primary"
                      )}
                    >
                      {progress.percent}%
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {phaseProgressText}
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

              {/* 단계별 진행 현황 (카드형) */}
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-stretch overflow-hidden">
                {phases.map((phase, idx) => (
                  <Fragment key={phase.id}>
                    {idx > 0 && (
                      <div className="hidden sm:flex items-center shrink-0 px-0.5">
                        <svg
                          width="16"
                          height="24"
                          viewBox="0 0 16 24"
                          fill="none"
                          className={cn(
                            phases[idx - 1].status === "completed"
                              ? "text-safe/60"
                              : "text-border",
                          )}
                        >
                          <path
                            d="M4 4L12 12L4 20"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}
                    <PhaseCard phase={phase} />
                  </Fragment>
                ))}
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

          {/* -- 완료 결과 요약 -- */}
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

          {/* -- 토큰 사용량 -- */}
          {isCompleted && result?.tokenUsage && result.tokenUsage.totalCalls > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-muted/40 px-4 py-2.5 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <HugeiconsIcon icon={CoinsIcon} size={13} strokeWidth={2} className="text-muted-foreground" />
                API 사용량
              </span>
              <span>
                호출 <span className="font-semibold text-foreground tabular-nums">{result.tokenUsage.totalCalls}</span>회
              </span>
              <span>
                토큰 <span className="font-semibold text-foreground tabular-nums">{result.tokenUsage.totalTokens.toLocaleString()}</span>
                <span className="ml-0.5 text-[10px]">
                  (in:{result.tokenUsage.totalInputTokens.toLocaleString()} / out:{result.tokenUsage.totalOutputTokens.toLocaleString()})
                </span>
              </span>
              <span>
                비용 <span className="font-semibold text-foreground tabular-nums">${result.tokenUsage.totalCost.toFixed(4)}</span>
                <span className="ml-0.5 text-[10px]">
                  (약 {Math.ceil(result.tokenUsage.totalCost * 1400).toLocaleString()}원)
                </span>
              </span>
              {result.tokenUsage.model && (
                <span className="text-[10px]">
                  {result.tokenUsage.provider}/{result.tokenUsage.model}
                </span>
              )}
            </div>
          )}

          {/* -- 에러 -- */}
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

          {/* -- 하단 영역 -- */}
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
