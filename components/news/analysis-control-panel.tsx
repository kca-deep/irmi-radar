"use client";

import { useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiBrain01Icon,
  Calendar03Icon,
  FilterIcon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ANALYSIS_PERIOD_PRESETS, CATEGORIES, ANALYSIS_SECONDS_PER_ARTICLE } from "@/lib/constants";
import { CATEGORY_ICON_MAP } from "@/lib/icon-maps";
import { cn } from "@/lib/utils";

import type {
  NewsArticle,
  CategoryKey,
  AnalysisPeriodPreset,
  AnalysisState,
} from "@/lib/types";

interface AnalysisControlPanelProps {
  articles: NewsArticle[];
  selectedPeriod: AnalysisPeriodPreset;
  customStartDate: string;
  customEndDate: string;
  selectedCategories: CategoryKey[];
  analysisState: AnalysisState;
  onPeriodChange: (period: AnalysisPeriodPreset) => void;
  onCustomStartDateChange: (date: string) => void;
  onCustomEndDateChange: (date: string) => void;
  onCategoriesChange: (categories: CategoryKey[]) => void;
  onStartAnalysis: () => void;
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

  // 기사 중 가장 최근 날짜 기준
  const latestDate = articles.reduce((latest, a) => {
    const d = new Date(a.publishedAt);
    return d > latest ? d : latest;
  }, new Date(0));

  const start = new Date(latestDate);
  start.setDate(start.getDate() - presetConfig.days);

  return { start, end: latestDate };
}

export function AnalysisControlPanel({
  articles,
  selectedPeriod,
  customStartDate,
  customEndDate,
  selectedCategories,
  analysisState,
  onPeriodChange,
  onCustomStartDateChange,
  onCustomEndDateChange,
  onCategoriesChange,
  onStartAnalysis,
}: AnalysisControlPanelProps) {
  // 선택된 조건에 해당하는 기사 수 계산
  const targetArticleCount = useMemo(() => {
    const { start, end } = getDateRange(
      selectedPeriod,
      customStartDate,
      customEndDate,
      articles
    );

    return articles.filter((article) => {
      // 카테고리 필터
      if (
        selectedCategories.length > 0 &&
        !selectedCategories.includes(article.category)
      ) {
        return false;
      }

      // 기간 필터
      if (start || end) {
        const articleDate = new Date(article.publishedAt);
        if (start && articleDate < start) return false;
        if (end && articleDate > end) return false;
      }

      return true;
    }).length;
  }, [articles, selectedPeriod, customStartDate, customEndDate, selectedCategories]);

  // 예상 소요 시간
  const estimatedSeconds = Math.ceil(
    targetArticleCount * ANALYSIS_SECONDS_PER_ARTICLE
  );
  const estimatedMinutes = Math.floor(estimatedSeconds / 60);
  const estimatedRemainderSec = estimatedSeconds % 60;
  const estimatedTimeText =
    estimatedMinutes > 0
      ? `약 ${estimatedMinutes}분 ${estimatedRemainderSec > 0 ? `${estimatedRemainderSec}초` : ""}`
      : `약 ${estimatedSeconds}초`;

  // 전체 카테고리 토글
  const isAllCategories = selectedCategories.length === 0;

  function handleCategoryToggle(key: CategoryKey) {
    if (selectedCategories.includes(key)) {
      onCategoriesChange(selectedCategories.filter((c) => c !== key));
    } else {
      onCategoriesChange([...selectedCategories, key]);
    }
  }

  function handleAllCategoryToggle() {
    onCategoriesChange([]);
  }

  const isRunning = analysisState === "running";

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <HugeiconsIcon
          icon={AiBrain01Icon}
          size={20}
          strokeWidth={2}
          className="text-primary"
        />
        <h2 className="text-sm font-semibold text-foreground">
          AI 뉴스 분석
        </h2>
        <span className="text-[10px] text-muted-foreground">
          뉴스 데이터를 AI가 분석하여 민생 위기 신호를 감지합니다
        </span>
      </div>

      {/* 분석 기간 + 카테고리 (1열 표시) */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* 분석 기간 */}
        <div className="flex items-center gap-1.5 shrink-0">
          <HugeiconsIcon
            icon={Calendar03Icon}
            size={14}
            strokeWidth={2}
            className="text-muted-foreground"
          />
          <span className="text-xs font-medium text-foreground">기간</span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {ANALYSIS_PERIOD_PRESETS.map((preset) => (
            <button
              key={preset.key}
              onClick={() => onPeriodChange(preset.key)}
              disabled={isRunning}
              className={cn(
                "px-2 py-0.5 rounded-md text-xs font-medium transition-colors",
                "border border-border/50",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                selectedPeriod === preset.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {preset.label}
            </button>
          ))}
          {selectedPeriod === "custom" && (
            <>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => onCustomStartDateChange(e.target.value)}
                disabled={isRunning}
                className="h-6 text-xs w-[120px]"
              />
              <span className="text-xs text-muted-foreground">~</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => onCustomEndDateChange(e.target.value)}
                disabled={isRunning}
                className="h-6 text-xs w-[120px]"
              />
            </>
          )}
        </div>

        {/* 구분선 */}
        <div className="h-4 w-px bg-border/50 shrink-0" />

        {/* 카테고리 */}
        <div className="flex items-center gap-1.5 shrink-0">
          <HugeiconsIcon
            icon={FilterIcon}
            size={14}
            strokeWidth={2}
            className="text-muted-foreground"
          />
          <span className="text-xs font-medium text-foreground">카테고리</span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={handleAllCategoryToggle}
            disabled={isRunning}
            className={cn(
              "px-2 py-0.5 rounded-md text-xs font-medium transition-colors",
              "border border-border/50",
              "disabled:opacity-50 disabled:cursor-not-allowed",
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
                disabled={isRunning}
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-colors",
                  "border border-border/50",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
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

      {/* 분석 정보 + 시작 버튼 */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/30">
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-xs font-normal gap-1">
            분석 대상
            <span className="font-semibold text-foreground">
              {targetArticleCount.toLocaleString()}건
            </span>
          </Badge>
          {targetArticleCount > 0 && (
            <span className="text-[10px] text-muted-foreground">
              예상 소요: {estimatedTimeText}
            </span>
          )}
        </div>
        <Button
          onClick={onStartAnalysis}
          disabled={isRunning || targetArticleCount === 0}
          className="gap-2"
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
