"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { News01Icon } from "@hugeicons/core-free-icons";
import { NewsFilterBar } from "./news-filter-bar";
import { NewsList } from "./news-list";
import { AnalysisControlPanel } from "./analysis-control-panel";
import { AnalysisProgressModal } from "./analysis-progress-modal";
import { NewsDetailModal } from "./news-detail-modal";
import { ANALYSIS_STEPS, ANALYSIS_SECONDS_PER_ARTICLE } from "@/lib/constants";

import type {
  NewsArticle,
  CategoryKey,
  AnalysisPeriodPreset,
  AnalysisState,
  AnalysisProgress,
  AnalysisResult,
  AnalysisStep,
} from "@/lib/types";

interface NewsPageProps {
  articles: NewsArticle[];
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

export function NewsPage({ articles }: NewsPageProps) {
  const router = useRouter();

  // 기존 필터 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<CategoryKey | "all">("all");

  // 분석 제어 상태
  const [analysisPeriod, setAnalysisPeriod] =
    useState<AnalysisPeriodPreset>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [analysisCategories, setAnalysisCategories] = useState<CategoryKey[]>(
    []
  );

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

  // 최종 필터 (검색어 + 카테고리 드롭다운)
  const filteredArticles = useMemo(() => {
    return analysisScopeArticles.filter((article) => {
      // 카테고리 드롭다운 필터 (분석 카테고리와 별개)
      if (category !== "all" && article.category !== category) {
        return false;
      }

      // 검색어 필터
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
  }, [analysisScopeArticles, category, searchQuery]);

  // Mock 분석 시뮬레이션
  const startMockAnalysis = useCallback(() => {
    const totalCount = analysisScopeArticles.length;
    if (totalCount === 0) return;

    cancelledRef.current = false;

    // 초기 단계 설정
    const steps: AnalysisStep[] = ANALYSIS_STEPS.map((s) => ({
      ...s,
      status: "pending" as const,
    }));

    const initialProgress: AnalysisProgress = {
      steps,
      currentStepIndex: 0,
      processedCount: 0,
      totalCount,
      percent: 0,
      elapsedSeconds: 0,
      estimatedRemainingSeconds: Math.ceil(
        totalCount * ANALYSIS_SECONDS_PER_ARTICLE
      ),
    };

    setAnalysisState("running");
    setProgress(initialProgress);
    setResult(null);
    setModalOpen(true);

    let elapsed = 0;
    let currentStep = 0;
    const totalSteps = steps.length;
    const stepDuration = Math.max(
      1,
      Math.ceil((totalCount * ANALYSIS_SECONDS_PER_ARTICLE) / totalSteps)
    );

    timerRef.current = setInterval(() => {
      if (cancelledRef.current) {
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }

      elapsed += 1;

      // 현재 단계 진행률 계산
      const stepElapsed = elapsed - currentStep * stepDuration;
      const stepProgress = Math.min(stepElapsed / stepDuration, 1);

      // 단계 전환
      if (stepProgress >= 1 && currentStep < totalSteps - 1) {
        // 현재 단계 완료
        steps[currentStep] = { ...steps[currentStep], status: "completed" };
        currentStep += 1;
        steps[currentStep] = { ...steps[currentStep], status: "running" };
      } else if (currentStep === 0 && steps[0].status !== "running") {
        steps[0] = { ...steps[0], status: "running" };
      }

      // 전체 진행률
      const overallProgress = Math.min(
        ((currentStep + stepProgress) / totalSteps) * 100,
        99
      );
      const processedCount = Math.floor(
        (overallProgress / 100) * totalCount
      );
      const totalEstimated = totalSteps * stepDuration;
      const remaining = Math.max(0, totalEstimated - elapsed);

      setProgress({
        steps: [...steps],
        currentStepIndex: currentStep,
        processedCount,
        totalCount,
        percent: Math.round(overallProgress),
        elapsedSeconds: elapsed,
        estimatedRemainingSeconds: remaining,
      });

      // 전체 완료
      if (elapsed >= totalEstimated) {
        if (timerRef.current) clearInterval(timerRef.current);

        // 모든 단계 완료 처리
        const completedSteps = steps.map((s) => ({
          ...s,
          status: "completed" as const,
        }));

        setProgress({
          steps: completedSteps,
          currentStepIndex: totalSteps - 1,
          processedCount: totalCount,
          totalCount,
          percent: 100,
          elapsedSeconds: elapsed,
          estimatedRemainingSeconds: 0,
        });

        // 결과 생성 (Mock)
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
  }, [analysisScopeArticles]);

  // 분석 취소
  const handleCancel = useCallback(() => {
    cancelledRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setAnalysisState("idle");
    setModalOpen(false);
    setProgress(null);
  }, []);

  // 모달 닫기
  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setAnalysisState("idle");
  }, []);

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

      {/* 분석 제어 패널 */}
      <AnalysisControlPanel
        articles={articles}
        selectedPeriod={analysisPeriod}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        selectedCategories={analysisCategories}
        analysisState={analysisState}
        onPeriodChange={setAnalysisPeriod}
        onCustomStartDateChange={setCustomStartDate}
        onCustomEndDateChange={setCustomEndDate}
        onCategoriesChange={setAnalysisCategories}
        onStartAnalysis={startMockAnalysis}
      />

      {/* 필터 바 */}
      <NewsFilterBar
        searchQuery={searchQuery}
        category={category}
        onSearchChange={setSearchQuery}
        onCategoryChange={setCategory}
      />

      {/* 결과 정보 */}
      <div className="text-sm text-muted-foreground">
        {filteredArticles.length}건의 뉴스가 검색되었습니다.
      </div>

      {/* 뉴스 목록 */}
      <NewsList articles={filteredArticles} onArticleClick={handleArticleClick} />

      {/* 뉴스 상세 모달 */}
      <NewsDetailModal
        article={selectedArticle}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />

      {/* 분석 진행 모달 */}
      <AnalysisProgressModal
        open={modalOpen}
        analysisState={analysisState}
        progress={progress}
        result={result}
        onCancel={handleCancel}
        onGoToDashboard={handleGoToDashboard}
        onClose={handleCloseModal}
      />
    </div>
  );
}
