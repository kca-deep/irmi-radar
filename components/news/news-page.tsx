"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { News01Icon, Loading03Icon, AiBrain01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { NewsFilterBar } from "./news-filter-bar";
import { NewsList } from "./news-list";
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
  initialAnalyzedOnly?: boolean;
}

const SEARCH_DEBOUNCE_MS = 300;

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

export function NewsPage({ initialArticles, totalCount, pageSize, initialAnalyzedOnly = false }: NewsPageProps) {
  const router = useRouter();

  // 페이지네이션 상태
  const [articles, setArticles] = useState<NewsArticle[]>(initialArticles);
  const [serverTotal, setServerTotal] = useState(totalCount);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [autoLoadCount, setAutoLoadCount] = useState(0);
  const [hasMore, setHasMore] = useState(
    initialArticles.length < totalCount
  );
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 필터 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState<CategoryKey | "all">("all");
  const [analyzedOnly, setAnalyzedOnly] = useState(initialAnalyzedOnly);

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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 타이머 정리
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // 검색어 debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // API URL 생성 헬퍼
  const buildApiUrl = useCallback(
    (offset: number) => {
      const params = new URLSearchParams();
      params.set("limit", String(pageSize));
      params.set("offset", String(offset));
      if (debouncedSearch.trim()) {
        params.set("keyword", debouncedSearch.trim());
      }
      if (category !== "all") {
        params.set("category", category);
      }
      if (analyzedOnly) {
        params.set("analyzedOnly", "true");
      }
      return `/api/news?${params.toString()}`;
    },
    [pageSize, debouncedSearch, category, analyzedOnly]
  );

  // 필터 변경 시 서버에서 새로 로드
  useEffect(() => {
    // 초기 렌더링 시에는 서버 컴포넌트 결과 사용
    const isInitialState =
      debouncedSearch === "" &&
      category === "all" &&
      analyzedOnly === initialAnalyzedOnly;
    if (isInitialState) {
      setArticles(initialArticles);
      setServerTotal(totalCount);
      setHasMore(initialArticles.length < totalCount);
      setAutoLoadCount(0);
      return;
    }

    let cancelled = false;
    setIsFiltering(true);

    const url = buildApiUrl(0);
    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success && json.data) {
          const newArticles = json.data as NewsArticle[];
          const total = json.meta?.total ?? 0;
          setArticles(newArticles);
          setServerTotal(total);
          setHasMore(newArticles.length < total);
          setAutoLoadCount(0);
        }
      })
      .catch(() => {
        if (cancelled) return;
      })
      .finally(() => {
        if (!cancelled) setIsFiltering(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, category, analyzedOnly, buildApiUrl, initialArticles, totalCount, initialAnalyzedOnly]);

  // 추가 데이터 로드
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);

    try {
      const offset = articles.length;
      const url = buildApiUrl(offset);
      const res = await fetch(url);
      const json = await res.json();

      if (json.success && json.data) {
        const newArticles = json.data as NewsArticle[];
        if (newArticles.length === 0) {
          setHasMore(false);
        } else {
          setArticles((prev) => [...prev, ...newArticles]);
          const newTotal = offset + newArticles.length;
          const total = json.meta?.total ?? serverTotal;
          setServerTotal(total);
          setHasMore(newTotal < total);
          setAutoLoadCount((prev) => prev + 1);
        }
      }
    } catch {
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [articles.length, hasMore, isLoadingMore, serverTotal, buildApiUrl]);

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

  // 분석 카테고리 토글 (functional updater로 stale closure 방지)
  const handleAnalysisCategoryToggle = useCallback((key: CategoryKey | "all") => {
    if (key === "all") {
      setAnalysisCategories([]);
    } else {
      setAnalysisCategories((prev) =>
        prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
      );
    }
  }, []);

  // 외부 데이터 토글 (functional updater로 stale closure 방지)
  const handleExternalDataToggle = useCallback((key: keyof ExternalDataOptions) => {
    setExternalData((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // 모달 열기
  const handleOpenModal = useCallback(() => {
    setAnalysisState("idle");
    setProgress(null);
    setResult(null);
    setModalOpen(true);
  }, []);

  // 선택된 카테고리에 맞는 분석 단계 구성
  const buildAnalysisSteps = useCallback((): Omit<AnalysisStep, "status">[] => {
    // 선택된 카테고리만 필터링 (미선택 시 전체)
    const baseSteps = ANALYSIS_STEPS.filter((s) => {
      if (!("category" in s) || !s.category) return true; // collect, aggregate는 항상 포함
      if (analysisCategories.length === 0) return true; // 전체 카테고리
      return analysisCategories.includes(s.category as CategoryKey);
    });

    const result = [...baseSteps];
    const aggregateIdx = result.findIndex((s) => s.id === "aggregate");
    const insertAt = aggregateIdx >= 0 ? aggregateIdx : result.length;
    const externalSteps: Omit<AnalysisStep, "status">[] = [];
    if (externalData.includeAssembly) {
      externalSteps.push(EXTERNAL_ANALYSIS_STEPS.assembly);
    }
    if (externalData.includeGovServices) {
      externalSteps.push(EXTERNAL_ANALYSIS_STEPS.govServices);
    }
    result.splice(insertAt, 0, ...externalSteps);
    return result;
  }, [analysisCategories, externalData]);

  // Mock 분석 시뮬레이션
  const startMockAnalysis = useCallback(() => {
    const totalAnalysisCount = analysisScopeArticles.length;
    if (totalAnalysisCount === 0) return;

    cancelledRef.current = false;

    const baseSteps = buildAnalysisSteps();

    const steps: AnalysisStep[] = baseSteps.map((s) => ({
      ...s,
      status: "pending" as const,
    }));

    const totalSteps = steps.length;
    const initialProgress: AnalysisProgress = {
      steps,
      currentStepIndex: 0,
      completedSteps: 0,
      totalSteps,
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
    const stepDuration = Math.max(
      1,
      Math.ceil(
        (totalAnalysisCount * ANALYSIS_SECONDS_PER_ARTICLE) / totalSteps
      )
    );

    // Mock 단계별 데이터 건수
    const mockDetailCounts: Record<string, number> = {
      collect: totalAnalysisCount,
      prices: Math.ceil(totalAnalysisCount * 0.25),
      employment: Math.ceil(totalAnalysisCount * 0.2),
      selfEmployed: Math.ceil(totalAnalysisCount * 0.15),
      finance: Math.ceil(totalAnalysisCount * 0.2),
      realEstate: Math.ceil(totalAnalysisCount * 0.2),
      assembly: 23,
      govServices: 10,
      aggregate: 0,
    };

    timerRef.current = setInterval(() => {
      if (cancelledRef.current) {
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }

      elapsed += 1;

      let stepElapsed = elapsed - currentStep * stepDuration;
      let stepProgress = Math.min(stepElapsed / stepDuration, 1);

      if (stepProgress >= 1 && currentStep < totalSteps - 1) {
        const count = mockDetailCounts[steps[currentStep].id] ?? 0;
        steps[currentStep] = {
          ...steps[currentStep],
          status: "completed",
          detail: count > 0 ? `${count}건` : undefined,
        };
        currentStep += 1;
        steps[currentStep] = { ...steps[currentStep], status: "running" };
        stepElapsed = elapsed - currentStep * stepDuration;
        stepProgress = Math.min(stepElapsed / stepDuration, 1);
      } else if (currentStep === 0 && steps[0].status !== "running") {
        steps[0] = { ...steps[0], status: "running" };
      }

      const overallProgress = Math.min(
        ((currentStep + stepProgress) / totalSteps) * 100,
        99
      );
      const totalEstimated = totalSteps * stepDuration;
      const remaining = Math.max(0, totalEstimated - elapsed);

      setProgress({
        steps: [...steps],
        currentStepIndex: currentStep,
        completedSteps: currentStep,
        totalSteps,
        percent: Math.round(overallProgress),
        elapsedSeconds: elapsed,
        estimatedRemainingSeconds: remaining,
      });

      if (elapsed >= totalEstimated) {
        if (timerRef.current) clearInterval(timerRef.current);

        const doneSteps = steps.map((s) => ({
          ...s,
          status: "completed" as const,
          detail: s.detail || (mockDetailCounts[s.id] > 0 ? `${mockDetailCounts[s.id]}건` : undefined),
        }));

        setProgress({
          steps: doneSteps,
          currentStepIndex: totalSteps - 1,
          completedSteps: totalSteps,
          totalSteps,
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
  }, [analysisScopeArticles, buildAnalysisSteps]);

  // 실제 분석 (SSE 스트리밍)
  const startRealAnalysis = useCallback(async () => {
    // 분석 단계 구성 (선택된 카테고리만)
    const steps: AnalysisStep[] = buildAnalysisSteps().map((s) => ({
      ...s,
      status: "pending" as const,
    }));

    setAnalysisState("running");
    setProgress({
      steps,
      currentStepIndex: 0,
      completedSteps: 0,
      totalSteps: steps.length,
      percent: 0,
      elapsedSeconds: 0,
      estimatedRemainingSeconds: 0,
    });
    setResult(null);

    const controller = new AbortController();
    abortRef.current = controller;
    const startTime = Date.now();

    try {
      const requestBody = {
        categories: analysisCategories.length > 0 ? analysisCategories : undefined,
        period: analysisPeriod,
        customStartDate: analysisPeriod === "custom" ? customStartDate : undefined,
        customEndDate: analysisPeriod === "custom" ? customEndDate : undefined,
        includeAssembly: externalData.includeAssembly || undefined,
        includeGovServices: externalData.includeGovServices || undefined,
      };
      console.log("[Analysis] 분석 요청:", requestBody);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE 이벤트 파싱 ("\n\n" 구분)
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          if (!part.trim()) continue;

          let eventType = "";
          let eventData = "";

          for (const line of part.split("\n")) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7);
            } else if (line.startsWith("data: ")) {
              eventData = line.slice(6);
            }
          }

          if (!eventType || !eventData) continue;

          let parsed: Record<string, unknown>;
          try {
            parsed = JSON.parse(eventData);
          } catch {
            continue;
          }

          const elapsed = Math.round((Date.now() - startTime) / 1000);
          console.log(`[Analysis] SSE ${eventType}:`, parsed, `(${elapsed}s)`);

          if (eventType === "step-start") {
            const stepId = parsed.stepId as string;
            setProgress((prev) => {
              if (!prev) return prev;
              const newSteps = prev.steps.map((s) =>
                s.id === stepId ? { ...s, status: "running" as const } : s
              );
              const idx = newSteps.findIndex((s) => s.id === stepId);
              return {
                ...prev,
                steps: newSteps,
                currentStepIndex: idx >= 0 ? idx : prev.currentStepIndex,
                elapsedSeconds: elapsed,
              };
            });
          } else if (eventType === "step-complete") {
            const stepId = parsed.stepId as string;
            const percent = (parsed.percent as number) || 0;
            const detail = parsed.detail as string | undefined;
            const serverCompleted = (parsed.currentStepIndex as number) || 0;
            const serverTotal = (parsed.totalSteps as number) || 0;
            setProgress((prev) => {
              if (!prev) return prev;
              const newSteps = prev.steps.map((s) =>
                s.id === stepId ? { ...s, status: "completed" as const, detail } : s
              );
              return {
                ...prev,
                steps: newSteps,
                completedSteps: serverCompleted || prev.completedSteps + 1,
                totalSteps: serverTotal || prev.totalSteps,
                percent,
                elapsedSeconds: elapsed,
              };
            });
          } else if (eventType === "progress") {
            const percent = (parsed.percent as number) || 0;
            const processed = (parsed.processed as number) || 0;
            const total = (parsed.total as number) || 0;
            const stepId = parsed.stepId as string;
            setProgress((prev) => {
              if (!prev) return prev;
              // 현재 진행 중인 단계에 진행 건수 업데이트
              const newSteps = prev.steps.map((s) =>
                s.id === stepId
                  ? { ...s, detail: `${processed}/${total}건` }
                  : s
              );
              return {
                ...prev,
                steps: newSteps,
                percent,
                elapsedSeconds: elapsed,
              };
            });
          } else if (eventType === "step-error") {
            const stepId = parsed.stepId as string;
            const message = parsed.message as string | undefined;
            setProgress((prev) => {
              if (!prev) return prev;
              const newSteps = prev.steps.map((s) =>
                s.id === stepId ? { ...s, status: "error" as const, detail: message } : s
              );
              return { ...prev, steps: newSteps, elapsedSeconds: elapsed };
            });
          } else if (eventType === "complete") {
            setProgress((prev) => {
              const doneSteps = (prev?.steps ?? steps).map((s) => ({
                ...s,
                status: "completed" as const,
              }));
              const total = doneSteps.length;
              return {
                steps: doneSteps,
                currentStepIndex: total - 1,
                completedSteps: total,
                totalSteps: total,
                percent: 100,
                elapsedSeconds: elapsed,
                estimatedRemainingSeconds: 0,
              };
            });
            setTimeout(() => {
              setAnalysisState("completed");
              const tokenUsage = parsed.tokenUsage as AnalysisResult["tokenUsage"] | undefined;
              setResult({
                overallScore: parsed.overallScore as number,
                severity: parsed.severity as "critical" | "warning" | "caution" | "safe",
                signalCount: parsed.signalCount as number,
                elapsedSeconds: (parsed.elapsedSeconds as number) || elapsed,
                tokenUsage: tokenUsage ?? undefined,
              });
            }, 500);
          } else if (eventType === "cancelled") {
            console.log("[Analysis] 서버에서 취소 확인");
            setAnalysisState("idle");
            setProgress(null);
          } else if (eventType === "error") {
            setAnalysisState("error");
            setProgress((prev) =>
              prev ? { ...prev, elapsedSeconds: elapsed } : prev
            );
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setAnalysisState("idle");
        setProgress(null);
        return;
      }
      console.error("Analysis error:", err);
      // 실제 API 실패 시 mock fallback
      setAnalysisState("idle");
      setProgress(null);
      startMockAnalysis();
    } finally {
      abortRef.current = null;
    }
  }, [analysisCategories, analysisPeriod, customStartDate, customEndDate, externalData, buildAnalysisSteps, startMockAnalysis]);

  // 분석 시작 (real -> mock fallback)
  const handleStartAnalysis = useCallback(() => {
    startRealAnalysis();
  }, [startRealAnalysis]);

  // 분석 취소
  const handleCancel = useCallback(() => {
    // SSE 스트림 취소
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    // Mock 타이머 취소
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
      <div className="flex items-center justify-between">
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
        <Button
          onClick={handleOpenModal}
          disabled={analysisState === "running"}
          className="gap-2 shrink-0"
          size="sm"
        >
          {analysisState === "running" ? (
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

      {/* 필터 바 */}
      <NewsFilterBar
        searchQuery={searchQuery}
        category={category}
        totalCount={serverTotal}
        analyzedOnly={analyzedOnly}
        onSearchChange={setSearchQuery}
        onCategoryChange={setCategory}
        onAnalyzedOnlyChange={setAnalyzedOnly}
      />

      {/* 필터링 중 로딩 */}
      {isFiltering && (
        <div className="flex items-center justify-center py-6">
          <HugeiconsIcon
            icon={Loading03Icon}
            size={20}
            strokeWidth={2}
            className="animate-spin text-muted-foreground"
          />
          <span className="ml-2 text-xs text-muted-foreground">
            검색 중...
          </span>
        </div>
      )}

      {/* 뉴스 목록 */}
      {!isFiltering && (
        <NewsList
          articles={articles}
          onArticleClick={handleArticleClick}
        />
      )}

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
      {hasMore && autoLoadCount < NEWS_AUTO_LOAD_MAX && !isFiltering && (
        <div ref={sentinelRef} className="h-1" />
      )}

      {/* 더보기 버튼 (자동 로드 횟수 초과 시) */}
      {showManualLoadMore && !isLoadingMore && !isFiltering && (
        <div className="flex justify-center py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMore}
            className="text-xs"
          >
            더보기 ({articles.length.toLocaleString()} /{" "}
            {serverTotal.toLocaleString()})
          </Button>
        </div>
      )}

      {/* 전체 로드 완료 */}
      {!hasMore && articles.length > pageSize && !isFiltering && (
        <p className="text-center text-[10px] text-muted-foreground py-4">
          전체 {articles.length.toLocaleString()}건 로드 완료
        </p>
      )}

      {/* 검색 결과 없음 */}
      {!isFiltering && articles.length === 0 && (debouncedSearch || category !== "all") && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <HugeiconsIcon icon={News01Icon} size={32} strokeWidth={1.5} className="mb-3 opacity-40" />
          <p className="text-sm font-medium">검색 결과가 없습니다</p>
          <p className="text-xs mt-1">다른 검색어나 카테고리를 시도해 보세요</p>
        </div>
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
        onCategoryToggle={handleAnalysisCategoryToggle}
        onExternalDataToggle={handleExternalDataToggle}
        onStartAnalysis={handleStartAnalysis}
        onCancel={handleCancel}
        onGoToDashboard={handleGoToDashboard}
        onClose={handleCloseModal}
      />
    </div>
  );
}
