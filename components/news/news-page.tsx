"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { News01Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { NewsFilterBar } from "./news-filter-bar";
import { NewsList } from "./news-list";
import { AnalysisControlPanel } from "./analysis-control-panel";
import { AnalysisProgressModal } from "./analysis-progress-modal";
import { NewsDetailModal } from "./news-detail-modal";
import {
  ANALYSIS_STEPS,
  EXTERNAL_ANALYSIS_STEPS,
  ANALYSIS_SECONDS_PER_ARTICLE,
  NEWS_AUTO_LOAD_MAX,
} from "@/lib/constants";

import type {
  NewsArticle,
  CategoryKey,
  AnalysisPeriodPreset,
  AnalysisState,
  AnalysisProgress,
  AnalysisResult,
  AnalysisStep,
  ExternalDataOptions,
} from "@/lib/types";

interface NewsPageProps {
  initialArticles: NewsArticle[];
  totalCount: number;
  pageSize: number;
}

function getFilteredByPeriod(
  articles: NewsArticle[],
  period: AnalysisPeriodPreset,
  customStart: string,
  customEnd: string
): NewsArticle[] {
  if (period === "all") return articles;

  let startDate: Date | null = null;
  let endDate: Date | null = null;

  if (period === "custom") {
    startDate = customStart ? new Date(customStart) : null;
    endDate = customEnd ? new Date(customEnd) : null;
  } else {
    const daysMap: Record<string, number> = {
      "1w": 7,
      "1m": 30,
      "3m": 90,
      "6m": 180,
      "1y": 365,
    };
    const days = daysMap[period];
    if (!days) return articles;

    const latestDate = articles.reduce((latest, a) => {
      const d = new Date(a.publishedAt);
      return d > latest ? d : latest;
    }, new Date(0));

    startDate = new Date(latestDate);
    startDate.setDate(startDate.getDate() - days);
    endDate = latestDate;
  }

  return articles.filter((a) => {
    const d = new Date(a.publishedAt);
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  });
}

export function NewsPage({ initialArticles, totalCount, pageSize }: NewsPageProps) {
  const router = useRouter();

  // 페이지네이션 상태
  const [articles, setArticles] = useState<NewsArticle[]>(initialArticles);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [autoLoadCount, setAutoLoadCount] = useState(0);
  const [hasMore, setHasMore] = useState(
    initialArticles.length < totalCount
  );
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 기존 필터 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<CategoryKey | "all">("all");

  // 분석 설정 상태
  const [analysisPeriod, setAnalysisPeriod] =
    useState<AnalysisPeriodPreset>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [analysisCategories, setAnalysisCategories] = useState<CategoryKey[]>(
    []
  );
  const [externalData, setExternalData] = useState<ExternalDataOptions>({
    includeAssembly: false,
    includeGovServices: false,
  });

  // 분석 실행 상태
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(
    null
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  // 타이머 정리
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // 추가 데이터 로드
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);

    try {
      const offset = articles.length;
      const res = await fetch(
        `/api/news?limit=${pageSize}&offset=${offset}`
      );
      const json = await res.json();

      if (json.success && json.data) {
        const newArticles = json.data as NewsArticle[];
        if (newArticles.length === 0) {
          setHasMore(false);
        } else {
          setArticles((prev) => [...prev, ...newArticles]);
          const newTotal = offset + newArticles.length;
          const serverTotal = json.meta?.total ?? totalCount;
          setHasMore(newTotal < serverTotal);
          setAutoLoadCount((prev) => prev + 1);
        }
      }
    } catch {
      // 로드 실패 시 자동 로드 중단
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [articles.length, hasMore, isLoadingMore, totalCount, pageSize]);

  // Intersection Observer (자동 로드, 최대 N회)
  useEffect(() => {
    if (autoLoadCount >= NEWS_AUTO_LOAD_MAX || !hasMore) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [autoLoadCount, hasMore, isLoadingMore, loadMore]);

  // 기간/카테고리 필터가 적용된 뉴스 목록 (분석 패널 연동)
  const periodFilteredArticles = useMemo(() => {
    return getFilteredByPeriod(
      articles,
      analysisPeriod,
      customStartDate,
      customEndDate
    );
  }, [articles, analysisPeriod, customStartDate, customEndDate]);

  // 분석 카테고리 필터
  const analysisScopeArticles = useMemo(() => {
    if (analysisCategories.length === 0) return periodFilteredArticles;
    return periodFilteredArticles.filter((a) =>
      analysisCategories.includes(a.category)
    );
  }, [periodFilteredArticles, analysisCategories]);

  // 최종 필터 (검색어 + 카테고리 드롭다운) - 클라이언트 사이드 필터링
  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      if (category !== "all" && article.category !== category) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = article.title.toLowerCase().includes(query);
        const matchSummary = article.summary.toLowerCase().includes(query);
        const matchKeywords = article.keywords.some((kw) =>
          kw.toLowerCase().includes(query)
        );
        if (!matchTitle && !matchSummary && !matchKeywords) {
          return false;
        }
      }

      return true;
    });
  }, [articles, category, searchQuery]);

  // 모달 열기
  const handleOpenModal = useCallback(() => {
    setAnalysisState("idle");
    setProgress(null);
    setResult(null);
    setModalOpen(true);
  }, []);

  // Mock 분석 시뮬레이션
  const startMockAnalysis = useCallback(() => {
    const totalAnalysisCount = analysisScopeArticles.length;
    if (totalAnalysisCount === 0) return;

    cancelledRef.current = false;

    const baseSteps = [...ANALYSIS_STEPS];
    const aggregateIdx = baseSteps.findIndex((s) => s.id === "aggregate");
    const insertAt = aggregateIdx >= 0 ? aggregateIdx : baseSteps.length;
    const externalSteps: Omit<AnalysisStep, "status">[] = [];
    if (externalData.includeAssembly) {
      externalSteps.push(EXTERNAL_ANALYSIS_STEPS.assembly);
    }
    if (externalData.includeGovServices) {
      externalSteps.push(EXTERNAL_ANALYSIS_STEPS.govServices);
    }
    baseSteps.splice(insertAt, 0, ...externalSteps);

    const steps: AnalysisStep[] = baseSteps.map((s) => ({
      ...s,
      status: "pending" as const,
    }));

    const initialProgress: AnalysisProgress = {
      steps,
      currentStepIndex: 0,
      processedCount: 0,
      totalCount: totalAnalysisCount,
      percent: 0,
      elapsedSeconds: 0,
      estimatedRemainingSeconds: Math.ceil(
        totalAnalysisCount * ANALYSIS_SECONDS_PER_ARTICLE
      ),
    };

    setAnalysisState("running");
    setProgress(initialProgress);
    setResult(null);

    let elapsed = 0;
    let currentStep = 0;
    const totalSteps = steps.length;
    const stepDuration = Math.max(
      1,
      Math.ceil(
        (totalAnalysisCount * ANALYSIS_SECONDS_PER_ARTICLE) / totalSteps
      )
    );

    timerRef.current = setInterval(() => {
      if (cancelledRef.current) {
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }

      elapsed += 1;

      const stepElapsed = elapsed - currentStep * stepDuration;
      const stepProgress = Math.min(stepElapsed / stepDuration, 1);

      if (stepProgress >= 1 && currentStep < totalSteps - 1) {
        steps[currentStep] = { ...steps[currentStep], status: "completed" };
        currentStep += 1;
        steps[currentStep] = { ...steps[currentStep], status: "running" };
      } else if (currentStep === 0 && steps[0].status !== "running") {
        steps[0] = { ...steps[0], status: "running" };
      }

      const overallProgress = Math.min(
        ((currentStep + stepProgress) / totalSteps) * 100,
        99
      );
      const processedCount = Math.floor(
        (overallProgress / 100) * totalAnalysisCount
      );
      const totalEstimated = totalSteps * stepDuration;
      const remaining = Math.max(0, totalEstimated - elapsed);

      setProgress({
        steps: [...steps],
        currentStepIndex: currentStep,
        processedCount,
        totalCount: totalAnalysisCount,
        percent: Math.round(overallProgress),
        elapsedSeconds: elapsed,
        estimatedRemainingSeconds: remaining,
      });

      if (elapsed >= totalEstimated) {
        if (timerRef.current) clearInterval(timerRef.current);

        const completedSteps = steps.map((s) => ({
          ...s,
          status: "completed" as const,
        }));

        setProgress({
          steps: completedSteps,
          currentStepIndex: totalSteps - 1,
          processedCount: totalAnalysisCount,
          totalCount: totalAnalysisCount,
          percent: 100,
          elapsedSeconds: elapsed,
          estimatedRemainingSeconds: 0,
        });

        const mockResult: AnalysisResult = {
          overallScore: 67,
          severity: "warning",
          signalCount: 12,
          elapsedSeconds: elapsed,
        };

        setTimeout(() => {
          setAnalysisState("completed");
          setResult(mockResult);
        }, 500);
      }
    }, 1000);
  }, [analysisScopeArticles, externalData]);

  // 분석 취소
  const handleCancel = useCallback(() => {
    cancelledRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setAnalysisState("idle");
    setProgress(null);
  }, []);

  // 모달 닫기
  const handleCloseModal = useCallback(() => {
    if (analysisState === "running") return;
    setModalOpen(false);
    setAnalysisState("idle");
  }, [analysisState]);

  // 대시보드 이동
  const handleGoToDashboard = useCallback(() => {
    setModalOpen(false);
    router.push("/");
  }, [router]);

  // 뉴스 카드 클릭
  const handleArticleClick = useCallback((article: NewsArticle) => {
    setSelectedArticle(article);
    setDetailOpen(true);
  }, []);

  const showManualLoadMore =
    hasMore && autoLoadCount >= NEWS_AUTO_LOAD_MAX;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
          <HugeiconsIcon
            icon={News01Icon}
            size={20}
            strokeWidth={2}
            className="text-primary"
          />
          뉴스 분석
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          AI가 뉴스 데이터를 분석하여 민생 위기 신호를 감지합니다.
        </p>
      </div>

      {/* 분석 제어 카드 */}
      <AnalysisControlPanel
        totalArticleCount={totalCount}
        analysisState={analysisState}
        onOpenModal={handleOpenModal}
      />

      {/* 필터 바 */}
      <NewsFilterBar
        searchQuery={searchQuery}
        category={category}
        totalCount={filteredArticles.length}
        onSearchChange={setSearchQuery}
        onCategoryChange={setCategory}
      />

      {/* 뉴스 목록 */}
      <NewsList
        articles={filteredArticles}
        onArticleClick={handleArticleClick}
      />

      {/* 로딩 인디케이터 */}
      {isLoadingMore && (
        <div className="flex items-center justify-center py-6">
          <HugeiconsIcon
            icon={Loading03Icon}
            size={20}
            strokeWidth={2}
            className="animate-spin text-muted-foreground"
          />
          <span className="ml-2 text-xs text-muted-foreground">
            더 불러오는 중...
          </span>
        </div>
      )}

      {/* 자동 로드 센티널 (자동 로드 횟수 내에서만 활성) */}
      {hasMore && autoLoadCount < NEWS_AUTO_LOAD_MAX && (
        <div ref={sentinelRef} className="h-1" />
      )}

      {/* 더보기 버튼 (자동 로드 횟수 초과 시) */}
      {showManualLoadMore && !isLoadingMore && (
        <div className="flex justify-center py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMore}
            className="text-xs"
          >
            더보기 ({articles.length.toLocaleString()} /{" "}
            {totalCount.toLocaleString()})
          </Button>
        </div>
      )}

      {/* 전체 로드 완료 */}
      {!hasMore && articles.length > pageSize && (
        <p className="text-center text-[10px] text-muted-foreground py-4">
          전체 {articles.length.toLocaleString()}건 로드 완료
        </p>
      )}

      {/* 뉴스 상세 모달 */}
      <NewsDetailModal
        article={selectedArticle}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />

      {/* 분석 모달 (설정 + 진행 + 결과 통합) */}
      <AnalysisProgressModal
        open={modalOpen}
        analysisState={analysisState}
        progress={progress}
        result={result}
        articles={articles}
        selectedPeriod={analysisPeriod}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        selectedCategories={analysisCategories}
        externalData={externalData}
        onPeriodChange={setAnalysisPeriod}
        onCustomStartDateChange={setCustomStartDate}
        onCustomEndDateChange={setCustomEndDate}
        onCategoriesChange={setAnalysisCategories}
        onExternalDataChange={setExternalData}
        onStartAnalysis={startMockAnalysis}
        onCancel={handleCancel}
        onGoToDashboard={handleGoToDashboard}
        onClose={handleCloseModal}
      />
    </div>
  );
}
