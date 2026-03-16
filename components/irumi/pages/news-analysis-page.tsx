"use client";

/**
 * news-analysis-page.tsx
 * 변환 포인트:
 *   - lucide-react → @hugeicons/react (Search01Icon, PlayIcon 등)
 *   - figma:asset → /images/irumi-logo.svg
 *   - 하드코딩 데이터 제거 → NewsAnalysisData props
 *   - POST /api/analyze (SSE 스트리밍) 연동 예시 포함
 *   - AnalysisProgressModal 연동 (설정 + SSE 진행 + 결과)
 */

import { useState, useCallback, useRef, useEffect, useMemo, type SyntheticEvent } from "react";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Building01Icon,
  Briefcase01Icon,
  ShoppingCart01Icon,
  BankIcon,
  Store01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";

type IconData = typeof Building01Icon;
import type { NewsAnalysisData, NewsArticle } from "@/lib/irumi/types";
import type {
  NewsArticle as ModalNewsArticle,
  CategoryKey,
  Severity,
  AnalysisPeriodPreset,
  AnalysisState,
  AnalysisProgress,
  AnalysisResult,
  AnalysisStep,
  ExternalDataOptions,
} from "@/lib/types";
import {
  ANALYSIS_STEPS,
  EXTERNAL_ANALYSIS_STEPS,
} from "@/lib/constants";
import { NewsDetailModal } from "@/components/news/news-detail-modal";
import { AnalysisProgressModal } from "@/components/news/analysis-progress-modal";

const KOREAN_TO_CATEGORY_KEY: Record<string, CategoryKey> = {
  "물가": "prices",
  "고용": "employment",
  "자영업": "selfEmployed",
  "금융": "finance",
  "부동산": "realEstate",
};

const RISK_TO_SEVERITY: Record<string, Severity> = {
  "긴급": "critical",
  "주의": "warning",
  "관찰": "caution",
  "안전": "safe",
};

function convertToModalArticle(article: NewsArticle): ModalNewsArticle {
  const categoryKey = KOREAN_TO_CATEGORY_KEY[article.category] ?? "finance";
  const severity = RISK_TO_SEVERITY[article.risk] ?? "caution";
  return {
    id: String(article.id),
    title: article.title,
    summary: article.body,
    category: categoryKey,
    categoryLabel: article.category,
    keywords: article.keywords,
    publishedAt: article.date,
    section: article.category,
    content: article.body,
    source: article.reporter || undefined,
    thumbnailUrl: article.thumbnailUrl,
    analysis: {
      riskScore: article.score,
      severity,
      keyFactors: [],
      relatedCategories: [],
      summary: article.body,
    },
  };
}

function convertAllToModalArticles(articles: NewsArticle[]): ModalNewsArticle[] {
  return articles.map(convertToModalArticle);
}

const CATEGORIES = ["전체", "물가", "고용", "자영업", "금융", "부동산"] as const;

const CATEGORY_CONFIG: Record<string, { icon: IconData; iconBg: string; iconColor: string }> = {
  물가:   { icon: ShoppingCart01Icon, iconBg: "#FFF8E1", iconColor: "#F0A000" },
  고용:   { icon: Briefcase01Icon,    iconBg: "#EDF2FF", iconColor: "#4C6EF5" },
  자영업: { icon: Store01Icon,        iconBg: "#F8D7DA", iconColor: "#D94040" },
  금융:   { icon: BankIcon,           iconBg: "#E8F4FE", iconColor: "#1E8BC3" },
  부동산: { icon: Building01Icon,     iconBg: "#EDF7ED", iconColor: "#3A9E42" },
};

const RISK_DOT_COLOR: Record<string, string> = {
  긴급: "#E24B4A",
  주의: "#FF6600",
  관찰: "#FFAA00",
  안전: "#5DAA30",
};

function NewsArticleCard({
  card,
  cat,
  isUrgent,
  dotColor,
  onClick,
}: {
  card: NewsArticle;
  cat: { icon: IconData; iconBg: string; iconColor: string };
  isUrgent: boolean;
  dotColor: string;
  onClick: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const thumbnailUrl = !imgError ? card.thumbnailUrl : undefined;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-[14px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col cursor-pointer hover:shadow-[0_6px_20px_rgba(0,0,0,0.10)] hover:-translate-y-[2px] transition-all duration-200 overflow-hidden"
    >
      {/* 썸네일 */}
      {thumbnailUrl && (
        <div className="w-full aspect-[16/9] bg-[#F0F0F0] overflow-hidden shrink-0">
          <img
            src={thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e: SyntheticEvent<HTMLImageElement>) => {
              setImgError(true);
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      )}

      <div className="p-[16px] flex flex-col flex-1" style={{ gap: "9px" }}>
        {/* 카테고리 + 위험도 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-[32px] h-[32px] rounded-[9px] flex items-center justify-center shrink-0" style={{ backgroundColor: cat.iconBg }}>
              <HugeiconsIcon icon={cat.icon} size={16} color={cat.iconColor} strokeWidth={1.5} />
            </div>
            <span className="text-[11px] font-[600] text-[#555555] ml-[7px]">{card.category}</span>
          </div>
          <div className="flex items-center gap-[5px]">
            <div className="flex flex-col items-center gap-[2px]">
              <div className="relative flex items-center justify-center w-[7px] h-[7px]">
                {isUrgent && <div className="absolute w-[7px] h-[7px] rounded-full bg-[#E24B4A] animate-ping" style={{ animationDuration: "1.5s", opacity: 0.6 }} />}
                <div className="relative z-10 w-[7px] h-[7px] rounded-full" style={{ backgroundColor: dotColor }} />
              </div>
              <span className="text-[8.5px] font-[600] text-[#AAAAAA]">{card.risk}</span>
            </div>
          </div>
        </div>

        {/* 제목 */}
        <h3 className="font-[700] text-[#1A1A1A] leading-[1.5] line-clamp-2 text-[15px]">{card.title}</h3>

        {/* 본문 */}
        <p className="text-[#888888] leading-[1.6] text-[12px]"
          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}
        >
          {card.body}
        </p>

        {/* 키워드 태그 */}
        <div className="mt-auto flex gap-[5px] flex-wrap">
          {card.keywords.map((kw) => (
            <span key={kw} className="text-[10px] text-[#888888] bg-[#F5F5F5] px-[9px] py-[3px] rounded-[20px]">
              {kw}
            </span>
          ))}
        </div>

        {/* 하단 */}
        <div className="pt-[8px] border-t-[0.5px] border-[#F5F5F5] flex items-center justify-between">
          <span className="text-[10px] text-[#BBBBBB]">{card.date}</span>
          <span className="text-[10px] font-[700] text-[#FF6600]">상세 →</span>
        </div>
      </div>
    </div>
  );
}

interface NewsAnalysisPageProps {
  data: NewsAnalysisData;
}

export function NewsAnalysisPage({ data }: NewsAnalysisPageProps) {
  const [activeCategory, setActiveCategory] = useState("전체");
  const [keyword, setKeyword] = useState("");
  const [isAnalyzedOnly, setIsAnalyzedOnly] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<ModalNewsArticle | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // -- 분석 모달 설정 상태 --
  const [analysisPeriod, setAnalysisPeriod] = useState<AnalysisPeriodPreset>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [analysisCategories, setAnalysisCategories] = useState<CategoryKey[]>([]);
  const [externalData, setExternalData] = useState<ExternalDataOptions>({
    includeAssembly: false,
    includeGovServices: false,
  });
  const [limitPerCategory, setLimitPerCategory] = useState<number | undefined>(10);

  // -- 분석 실행 상태 --
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // 타이머/정리
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // 모달용 기사 목록 변환 (irumi -> lib/types NewsArticle)
  const modalArticles = useMemo(
    () => convertAllToModalArticles(data.articles),
    [data.articles]
  );

  // 분석 카테고리 토글
  const handleAnalysisCategoryToggle = useCallback((key: CategoryKey | "all") => {
    if (key === "all") {
      setAnalysisCategories([]);
    } else {
      setAnalysisCategories((prev) =>
        prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
      );
    }
  }, []);

  // 외부 데이터 토글
  const handleExternalDataToggle = useCallback((key: keyof ExternalDataOptions) => {
    setExternalData((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // 카테고리당 분석 건수 제한
  const handleLimitPerCategoryChange = useCallback((limit: number | undefined) => {
    setLimitPerCategory(limit);
  }, []);

  // 선택된 카테고리에 맞는 분석 단계 구성
  const buildAnalysisSteps = useCallback((): Omit<AnalysisStep, "status">[] => {
    const result = [...ANALYSIS_STEPS];
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
  }, [externalData]);

  // 모달 열기
  const handleOpenModal = useCallback(() => {
    setAnalysisState("idle");
    setProgress(null);
    setAnalysisResult(null);
    setModalOpen(true);
  }, []);

  // 실제 분석 (SSE 스트리밍)
  const startRealAnalysis = useCallback(async () => {
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
    setAnalysisResult(null);

    const controller = new AbortController();
    abortRef.current = controller;
    const startTime = Date.now();

    try {
      const requestBody = {
        categories: analysisCategories.length > 0 ? analysisCategories : undefined,
        period: analysisPeriod,
        customStartDate: analysisPeriod === "custom" ? customStartDate : undefined,
        customEndDate: analysisPeriod === "custom" ? customEndDate : undefined,
        limitPerCategory: limitPerCategory || undefined,
        includeAssembly: externalData.includeAssembly || undefined,
        includeGovServices: externalData.includeGovServices || undefined,
      };

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
            const detail = (parsed.detail as string) || `${processed}/${total}건`;
            setProgress((prev) => {
              if (!prev) return prev;
              const newSteps = prev.steps.map((s) =>
                s.id === stepId ? { ...s, detail } : s
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
              setAnalysisResult({
                overallScore: parsed.overallScore as number,
                severity: parsed.severity as "critical" | "warning" | "caution" | "safe",
                signalCount: parsed.signalCount as number,
                elapsedSeconds: (parsed.elapsedSeconds as number) || elapsed,
                tokenUsage: tokenUsage ?? undefined,
              });
            }, 500);
          } else if (eventType === "cancelled") {
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
      setAnalysisState("error");
    } finally {
      abortRef.current = null;
    }
  }, [analysisCategories, analysisPeriod, customStartDate, customEndDate, limitPerCategory, externalData, buildAnalysisSteps]);

  // 분석 시작
  const handleStartAnalysis = useCallback(() => {
    startRealAnalysis();
  }, [startRealAnalysis]);

  // 분석 취소
  const handleCancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setAnalysisState("idle");
    setProgress(null);
  }, []);

  // 모달 닫기
  const handleCloseModal = useCallback(() => {
    if (analysisState === "running") return;
    setModalOpen(false);
    setAnalysisState("idle");
    // 분석 완료 후 닫으면 페이지 새로고침
    if (analysisState === "completed") {
      window.location.reload();
    }
  }, [analysisState]);

  // 대시보드 이동
  const handleGoToDashboard = useCallback(() => {
    setModalOpen(false);
    window.location.href = "/irumi";
  }, []);

  const handleReset = async () => {
    if (!window.confirm("AI 분석 결과를 모두 초기화하시겠습니까?\n(원본 뉴스 데이터는 유지됩니다)")) return;
    setIsResetting(true);
    try {
      const res = await fetch("/api/analyze/reset", { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        window.location.reload();
      } else {
        alert(json.error || "초기화에 실패했습니다");
        setIsResetting(false);
      }
    } catch {
      alert("초기화 요청 중 오류가 발생했습니다");
      setIsResetting(false);
    }
  };

  const filteredArticles = data.articles.filter((card) => {
    const matchCat     = activeCategory === "전체" || card.category === activeCategory;
    const matchKeyword = keyword === "" ||
      card.title.includes(keyword) ||
      card.keywords.some((k) => k.includes(keyword));
    return matchCat && matchKeyword;
  });

  return (
    <div className="pb-10">
      {/* 1행: 액션 헤더 */}
      <div className="flex items-center justify-between mt-[12px] mb-[12px]">
        <div className="text-[#AAAAAA] text-[14px]">
          뉴스 기사를 AI로 분석하고 위험도를 확인하세요
        </div>
        <div className="flex items-center gap-[8px]">
          <button
            onClick={handleReset}
            disabled={isResetting || analysisState === "running"}
            className="bg-card border-none rounded-[8px] shadow-[0_1px_6px_rgba(0,0,0,0.08)] px-[14px] py-[7px] text-[#888888] cursor-pointer hover:bg-muted transition-colors text-[14px]"
          >
            {isResetting ? "초기화 중..." : "분석 초기화"}
          </button>
          <button
            onClick={handleOpenModal}
            disabled={analysisState === "running" || isResetting}
            className="flex items-center gap-[5px] bg-[#FF6600] border-none rounded-[8px] px-[16px] py-[7px] text-white font-[700] cursor-pointer hover:bg-[#E65C00] transition-colors text-[14px]"
          >
            {analysisState === "running" ? (
              <>
                <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                분석 중...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                AI 분석 시작하기
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2행: 분석 결과 요약 스트립 */}
      <div className="rounded-[10px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] flex items-center gap-[24px] mb-[12px] relative overflow-hidden px-[20px] py-[6px] bg-[#fff8f2c9]">
        <div className="flex items-baseline gap-[5px]">
          <span className="text-[13px] text-[#888888]">분석 완료</span>
          <span className="font-[700] text-foreground text-[16px]">{data.stats.total}건</span>
        </div>
        <div className="w-[0.5px] h-[18px] bg-[#66666666]" />
        <div className="flex items-center gap-[6px]">
          <div className="w-[7px] h-[7px] rounded-full bg-[#E24B4A] shrink-0" />
          <div className="flex items-baseline gap-[5px]">
            <span className="text-[13px] text-[#888888]">긴급</span>
            <span className="font-[700] text-[#5e5a5a] text-[16px]">{data.stats.urgent}건</span>
          </div>
        </div>
        <div className="w-[0.5px] h-[18px] bg-[#66666633]" />
        <div className="flex items-center gap-[6px]">
          <div className="w-[7px] h-[7px] rounded-full bg-[#FF6600] shrink-0" />
          <div className="flex items-baseline gap-[5px]">
            <span className="text-[13px] text-[#888888]">주의</span>
            <span className="font-[700] text-[#5e5a5a] text-[16px]">{data.stats.caution}건</span>
          </div>
        </div>
        <div className="w-[0.5px] h-[18px] bg-[#66666633]" />
        <div className="flex items-center gap-[6px]">
          <div className="w-[7px] h-[7px] rounded-full bg-[#FFAA00] shrink-0" />
          <div className="flex items-baseline gap-[5px]">
            <span className="text-[13px] text-[#888888]">관찰</span>
            <span className="font-[700] text-[#5e5a5a] text-[16px]">{data.stats.watch}건</span>
          </div>
        </div>
        <div className="ml-auto shrink-0 w-[36px] h-[36px] pointer-events-none select-none">
          <img src="/images/mk-logo.png" alt="" className="w-full h-full object-contain" style={{ filter: "grayscale(1) brightness(0.75)", opacity: 0.12 }} />
        </div>
      </div>

      {/* 3행: 검색/필터 바 */}
      <div className="h-[44px] bg-card rounded-[10px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] px-[16px] flex items-center gap-[8px] mb-[14px]">
        <div className="flex items-center gap-[8px]">
          <HugeiconsIcon icon={Search01Icon} size={14} color="#CCCCCC" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="기사 검색..."
            className="border-none outline-none text-[11px] text-[#333333] placeholder:text-[#CCCCCC] w-[150px] bg-transparent"
          />
        </div>
        <div className="w-[0.5px] h-[18px] bg-[#EEEEEE]" />
        <div className="flex gap-[2px]">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-[11px] px-[11px] py-[5px] rounded-[8px] border-none cursor-pointer transition-colors ${
                activeCategory === cat
                  ? "bg-[#F5F5F5] text-foreground font-[700]"
                  : "bg-transparent text-[#BBBBBB] hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="w-[0.5px] h-[18px] bg-[#EEEEEE]" />
        <div
          className="flex items-center gap-[6px] cursor-pointer"
          onClick={() => setIsAnalyzedOnly(!isAnalyzedOnly)}
        >
          <div className={`w-[28px] h-[16px] rounded-[8px] relative transition-colors ${isAnalyzedOnly ? "bg-[#E8521A]" : "bg-[#CCCCCC]"}`}>
            <div className={`absolute top-[2px] w-[12px] h-[12px] rounded-full bg-white transition-all ${isAnalyzedOnly ? "right-[2px]" : "left-[2px]"}`} />
          </div>
          <span className="text-[11px] text-[#888888]">분석 완료만</span>
        </div>
      </div>

      {/* 기사 카드 그리드 */}
      <div className="grid grid-cols-3 gap-[10px]">
        {filteredArticles.map((card) => {
          const cat       = CATEGORY_CONFIG[card.category] ?? CATEGORY_CONFIG["금융"];
          const isUrgent  = card.risk === "긴급";
          const dotColor  = RISK_DOT_COLOR[card.risk] ?? "#AAAAAA";

          return (
            <NewsArticleCard
              key={card.id}
              card={card}
              cat={cat}
              isUrgent={isUrgent}
              dotColor={dotColor}
              onClick={() => {
                setSelectedArticle(convertToModalArticle(card));
                setDetailOpen(true);
              }}
            />
          );
        })}
      </div>

      {/* 더보기 */}
      {data.stats.remaining > 0 && (
        <div className="mt-[12px] flex justify-center">
          <button className="flex flex-col items-center justify-center text-[#CCCCCC] hover:text-[#FF6600] transition-colors group border-none bg-transparent cursor-pointer">
            <span className="text-[10px] font-[600] mb-[2px]">{data.stats.remaining}건 남음</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-[20px] h-[20px] group-hover:translate-y-[2px] transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
          </button>
        </div>
      )}

      <div className="mt-[16px]">
        <p className="text-[11px] text-[#CCCCCC]">데이터 출처: 한국은행, 통계청, 매일경제 및 이르미 자체 AI 분석 모델</p>
      </div>

      <NewsDetailModal
        article={selectedArticle}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />

      <AnalysisProgressModal
        open={modalOpen}
        analysisState={analysisState}
        progress={progress}
        result={analysisResult}
        articles={modalArticles}
        selectedPeriod={analysisPeriod}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        selectedCategories={analysisCategories}
        externalData={externalData}
        limitPerCategory={limitPerCategory}
        onPeriodChange={setAnalysisPeriod}
        onCustomStartDateChange={setCustomStartDate}
        onCustomEndDateChange={setCustomEndDate}
        onCategoryToggle={handleAnalysisCategoryToggle}
        onExternalDataToggle={handleExternalDataToggle}
        onLimitPerCategoryChange={handleLimitPerCategoryChange}
        onStartAnalysis={handleStartAnalysis}
        onCancel={handleCancel}
        onGoToDashboard={handleGoToDashboard}
        onClose={handleCloseModal}
      />
    </div>
  );
}
