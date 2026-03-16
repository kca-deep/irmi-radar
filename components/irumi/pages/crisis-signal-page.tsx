"use client";

/**
 * crisis-signal-page.tsx
 * 변환 포인트:
 *   - import mapSvg from "...?raw" (Vite 전용) 제거
 *     → useEffect로 public/korea-map.svg 를 fetch()
 *     → 한국 지도 SVG를 public/ 폴더에 복사해두세요: public/korea-map.svg
 *   - figma:asset 이미지 → /images/irumi-logo.svg
 *   - lucide-react → @hugeicons/react
 *   - 하드코딩 데이터 제거 → CrisisSignalData props
 */

import React, { useState, useMemo, useEffect } from "react";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Building01Icon,
  Briefcase01Icon,
  ShoppingCart01Icon,
  BankIcon,
  Store01Icon,
} from "@hugeicons/core-free-icons";

type IconData = typeof Building01Icon;
import { CrisisSignalCard } from "@/components/irumi/crisis-signal-card";
import { SignalDetailDialog } from "@/components/signals/signal-detail-dialog";
import type { CrisisSignalData, CrisisSignalItem } from "@/lib/irumi/types";
import type { Signal, CategoryKey } from "@/lib/types";

// ── CrisisSignalItem -> Signal 변환 ─────────────────────────
const RISK_TO_SEVERITY: Record<string, Signal["severity"]> = {
  "긴급": "critical",
  "주의": "warning",
  "관찰": "caution",
  "안전": "safe",
};

const CATEGORY_TO_KEY: Record<string, CategoryKey> = {
  "물가": "prices",
  "고용": "employment",
  "자영업": "selfEmployed",
  "금융": "finance",
  "부동산": "realEstate",
};

function convertToSignal(item: CrisisSignalItem): Signal {
  const categoryName = item.category.replace(/[^가-힣a-zA-Z]/g, "").trim();
  return {
    id: String(item.id),
    title: item.title,
    description: item.summary ?? "",
    severity: RISK_TO_SEVERITY[item.risk] ?? "caution",
    score: 0,
    category: CATEGORY_TO_KEY[categoryName] ?? "prices",
    categoryLabel: categoryName,
    region: item.region ?? "",
    relatedArticleIds: [],
    detectedAt: item.date,
    evidence: [],
    analysis: { cause: "", impact: "", actionPoints: [] },
  };
}

// ── 상수 ──────────────────────────────────────────────────
const CATEGORIES = ["전체", "물가", "고용", "자영업", "금융", "부동산"] as const;
const BAR_LABELS = ["물", "자", "부", "고", "금"];

const CATEGORY_ICONS: Record<string, IconData> = {
  부동산: Building01Icon,
  고용:   Briefcase01Icon,
  물가:   ShoppingCart01Icon,
  금융:   BankIcon,
  자영업: Store01Icon,
};

const SCORE_LABELS = [
  { label: "물가",   color: "var(--irumi-urgent)"  },
  { label: "자영업", color: "var(--irumi-brand)"   },
  { label: "부동산", color: "var(--irumi-watch)"   },
  { label: "고용",   color: "var(--irumi-safe)"    },
  { label: "금융",   color: "#84CC16"               },
];

const CATEGORY_BAR_INDEX: Record<string, number> = {
  물가: 0, 자영업: 1, 부동산: 2, 고용: 3, 금융: 4,
};

function getBarColor(score: number): string {
  if (score >= 80) return "var(--irumi-urgent)";
  if (score >= 60) return "var(--irumi-brand)";
  if (score >= 40) return "var(--irumi-watch)";
  return "var(--irumi-safe)";
}

// ── 컴포넌트 ───────────────────────────────────────────────
interface CrisisSignalPageProps {
  data: CrisisSignalData;
}

export function CrisisSignalPage({ data }: CrisisSignalPageProps) {
  const { signals, regions, nationalCompositeScore } = data;

  const [mapSvg, setMapSvg] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState("전체");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [filterRegion, setFilterRegion] = useState("전체");
  const [filterRisk, setFilterRisk] = useState("전체");
  const [visibleCount, setVisibleCount] = useState(4);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // ── 지도 SVG 로드 (public/korea-map.svg) ─────────────────
  useEffect(() => {
    fetch("/korea-map.svg")
      .then((r) => r.text())
      .then(setMapSvg)
      .catch(() => setMapSvg(""));
  }, []);

  const currentRegion = selectedRegion
    ? regions.find((r) => r.id === selectedRegion)
    : null;
  const currentScores = currentRegion?.bars ?? [72, 67, 58, 45, 41];

  const regionOptions = [
    "전체",
    ...Array.from(new Set([
      ...regions.map((r) => r.name),
      ...(signals.map((s) => s.region).filter(Boolean) as string[]),
    ])),
  ];
  const riskOptions = ["전체", "긴급", "주의", "관찰", "안전"];

  const filteredSignals = signals.filter((s) => {
    const matchCat    = activeCategory === "전체" || s.category.includes(activeCategory);
    const matchRegion = filterRegion   === "전체" || s.region === filterRegion;
    const matchRisk   = filterRisk     === "전체" || s.risk   === filterRisk;
    return matchCat && matchRegion && matchRisk;
  });
  const displayedSignals = filteredSignals.slice(0, visibleCount);

  const emergencyCount = signals.filter((s) => s.risk === "긴급").length;
  const cautionCount   = signals.filter((s) => s.risk === "주의").length;
  const watchCount     = signals.filter((s) => s.risk === "관찰").length;

  // ── 동적 헤드라인 ─────────────────────────────────────────
  const riskOrder = ["긴급", "주의", "관찰", "안전"];
  const riskColorMap: Record<string, string> = {
    긴급: "#E24B4A",
    주의: "#FF6600",
    관찰: "#FFAA00",
  };
  const parseDate = (d: string) => {
    const [m, day] = d.replace("일", "").split("월 ").map(Number);
    return m * 100 + day;
  };
  const latestDate = signals.reduce(
    (max, s) => (parseDate(s.date) > parseDate(max) ? s.date : max),
    signals[0]?.date ?? ""
  );
  const latestSignals   = signals.filter((s) => s.date === latestDate);
  const topRisk         = riskOrder.find((r) => latestSignals.some((s) => s.risk === r)) ?? "관찰";
  const topSignals      = latestSignals.filter((s) => s.risk === topRisk);
  const headlineRegions = [...new Set(topSignals.map((s) => s.region).filter(Boolean))].join("·");
  const headlineCategories = [...new Set(topSignals.map((s) => s.category.replace(/^\S+\s*/, "")))].join("·");
  const headlineLabel   = [headlineRegions, headlineCategories].filter(Boolean).join(" ");
  const headlineColor   = riskColorMap[topRisk] ?? "#E8521A";

  // ── 지도 SVG 색상 주입 ────────────────────────────────────
  const coloredMapSvg = useMemo(() => {
    if (!mapSvg) return "";
    const styleRules = regions
      .map((region) => {
        const avg = Math.round(region.bars.reduce((a, b) => a + b, 0) / region.bars.length);
        const color = getBarColor(avg).replace("var(--irumi-urgent)", "#E24B4A")
          .replace("var(--irumi-brand)", "#FF6600")
          .replace("var(--irumi-watch)", "#FFAA00")
          .replace("var(--irumi-safe)", "#5DAA30");
        const isDimmed = selectedRegion !== null && selectedRegion !== region.id;
        const alpha = isDimmed ? "20" : "50";
        return `[id="${region.name}"] { fill: ${color}${alpha}; }`;
      })
      .join(" ");
    return mapSvg.replace("</svg>", `<style>${styleRules}</style></svg>`);
  }, [mapSvg, regions, selectedRegion]);

  const avgScore = selectedRegion
    ? Math.round(currentScores.reduce((a, b) => a + b, 0) / currentScores.length)
    : nationalCompositeScore;

  const cardGradient =
    avgScore >= 80 ? "linear-gradient(135deg, #F05858 0%, #E24B4A 100%)" :
    avgScore >= 60 ? "linear-gradient(135deg, #FF7722 0%, #FF6600 100%)" :
    avgScore >= 40 ? "linear-gradient(135deg, #FFB300 0%, #E89A00 100%)" :
                    "linear-gradient(135deg, #5FA82A 0%, #4A9020 100%)";

  return (
    <>
    <div className="px-[0px] pt-[0px] pb-[10px]">
      {/* 헤더 */}
      <div className="mt-[16px] mb-[20px] flex flex-col">
        <div className="flex items-center">
          <h1 className="text-[22px] font-[900] tracking-[-0.5px] text-[#1A1A1A]">
            <span style={{ color: headlineColor }}>{headlineLabel}</span>, 지금 가장 위험해요.
          </h1>
          <div className="ml-auto flex items-center gap-[10px]">
            <span className="text-[13px] font-[700] text-[#555555] mr-[6px]">위기 신호 요약</span>
            <div className="flex items-center gap-[6px] bg-[#FEF0F0] text-[#E24B4A] px-[14px] py-[8px] rounded-[10px] border border-[#FEE2E2] shadow-sm">
              <span className="w-[8px] h-[8px] rounded-full bg-[#E24B4A] animate-pulse" />
              <span className="text-[14px] font-[800]">긴급 {emergencyCount}</span>
            </div>
            <div className="flex items-center gap-[6px] bg-[#FFF3EC] text-[#FF6600] px-[14px] py-[8px] rounded-[10px] border border-[#FFEDD5] shadow-sm">
              <span className="w-[8px] h-[8px] rounded-full bg-[#FF6600]" />
              <span className="text-[14px] font-[800]">주의 {cautionCount}</span>
            </div>
            <div className="flex items-center gap-[6px] bg-[#FFF8E0] text-[#FFAA00] px-[14px] py-[8px] rounded-[10px] border border-[#FFE88A] shadow-sm">
              <span className="w-[8px] h-[8px] rounded-full bg-[#FFAA00]" />
              <span className="text-[14px] font-[800]">관찰 {watchCount}</span>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-[#AAAAAA] mt-[4px]">
          감지된 위기 신호와 지역별 위험도를 확인하세요
        </p>
      </div>

      {/* 필터 바 */}
      <div className="h-[52px] bg-white rounded-[14px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] px-[20px] flex items-center gap-[6px] mb-[20px] relative overflow-hidden">
        {CATEGORIES.map((category) => {
          const Icon = CATEGORY_ICONS[category] ?? null;
          return (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`text-[13px] px-[14px] py-[6px] rounded-[8px] border-none cursor-pointer transition-colors flex items-center gap-[6px] ${
                activeCategory === category
                  ? "bg-[#FF6600] text-white font-[700]"
                  : "bg-transparent text-[#666666] hover:bg-[#F5F5F5] hover:text-[#1A1A1A]"
              }`}
            >
              {Icon && <HugeiconsIcon icon={Icon} size={14} strokeWidth={2} />}
              <span>{category}</span>
            </button>
          );
        })}

        <div className="w-[1px] h-[20px] bg-[#EEEEEE] mx-[10px]" />

        {/* 지역 필터 */}
        <div className="relative">
          <select
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
            className={`appearance-none border rounded-[8px] text-[13px] py-[6px] pl-[14px] pr-[32px] outline-none cursor-pointer transition-colors ${
              filterRegion !== "전체"
                ? "bg-[#FF6600] text-white font-[700] border-[#FF6600]"
                : "bg-[#F5F5F5] text-[#555555] border-transparent"
            }`}
          >
            {regionOptions.map((r) => (
              <option key={r} value={r}>{r === "전체" ? "지역 전체" : r}</option>
            ))}
          </select>
          <svg className={`absolute right-[10px] top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${filterRegion !== "전체" ? "text-white" : "text-[#555]"}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
        </div>

        {/* 등급 필터 */}
        <div className="relative ml-1">
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className={`appearance-none border rounded-[8px] text-[13px] py-[6px] pl-[14px] pr-[32px] outline-none cursor-pointer transition-colors ${
              filterRisk !== "전체"
                ? "bg-[#FF6600] text-white font-[700] border-[#FF6600]"
                : "bg-[#F5F5F5] text-[#555555] border-transparent"
            }`}
          >
            {riskOptions.map((r) => (
              <option key={r} value={r}>{r === "전체" ? "등급 전체" : r}</option>
            ))}
          </select>
          <svg className={`absolute right-[10px] top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${filterRisk !== "전체" ? "text-white" : "text-[#555]"}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
        </div>

        {(filterRegion !== "전체" || filterRisk !== "전체") && (
          <button
            onClick={() => { setFilterRegion("전체"); setFilterRisk("전체"); }}
            className="ml-2 text-[12px] text-[#AAAAAA] hover:text-[#FF6600] transition-colors px-[8px] py-[6px] rounded-[6px] hover:bg-[#FFF3EC]"
          >
            ✕ 초기화
          </button>
        )}

        {/* 로고 워터마크 */}
        <div className="ml-auto pointer-events-none select-none w-[36px] h-[36px] shrink-0">
          <img src="/images/irumi-logo.svg" alt="" className="w-full h-full object-contain" style={{ filter: "grayscale(1) brightness(0.75)", opacity: 0.12 }} />
        </div>
      </div>

      {/* 메인 레이아웃 */}
      <div className="grid grid-cols-[660px_1fr] gap-[20px]">
        {/* 좌: 지도 */}
        <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-[24px] flex flex-col h-full">
          <div className="flex items-center justify-between mb-[16px]">
            <div className="flex items-center gap-[8px]">
              <div className="w-[6px] h-[6px] bg-[#FF6600] rounded-full" />
              <h2 className="text-[16px] font-[700] text-[#1A1A1A]">지역별 위험도</h2>
            </div>
            <div className="text-[12px] text-[#AAAAAA]">지역 클릭 시 세부 확인</div>
          </div>

          <div className="bg-[#FAFAFA] rounded-[14px] overflow-hidden flex-shrink-0 cursor-pointer border border-[#EEEEEE] h-[560px] flex items-center justify-center">
            <div className="relative h-full" style={{ aspectRatio: "4 / 5" }}>
              {coloredMapSvg ? (
                <div
                  className="absolute inset-0 pointer-events-none [&>svg]:w-full [&>svg]:h-full [&>svg]:block"
                  dangerouslySetInnerHTML={{ __html: coloredMapSvg }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-[var(--irumi-text-3)] text-[13px]">
                  지도 로딩 중…
                </div>
              )}

              {/* 지역 마커 */}
              {regions.map((region) => (
                <div
                  key={`marker-${region.id}`}
                  onClick={() => setSelectedRegion(region.id === selectedRegion ? null : region.id)}
                  className="absolute flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 z-10"
                  style={{
                    left: `${region.x}%`,
                    top:  `${region.y}%`,
                    opacity: selectedRegion === null || selectedRegion === region.id ? 1 : 0.25,
                  }}
                >
                  <div
                    className="absolute w-[36px] h-[36px] rounded-full opacity-20 blur-[5px]"
                    style={{ backgroundColor: region.color }}
                  />
                  <div className="bg-white/95 backdrop-blur-[2px] border border-white/60 shadow-[0_3px_8px_rgba(0,0,0,0.12)] px-[8px] py-[3px] rounded-[5px] text-[11px] font-[700] text-[#333333] whitespace-nowrap z-10">
                    {region.name}
                  </div>
                </div>
              ))}

              {/* 지역별 바 차트 */}
              {regions.map((region) => {
                const barIdx = CATEGORY_BAR_INDEX[activeCategory];
                const barsToShow =
                  activeCategory === "전체"
                    ? region.bars.map((score, i) => ({ score, label: BAR_LABELS[i] }))
                    : [{ score: region.bars[barIdx], label: BAR_LABELS[barIdx] }];
                return (
                  <div
                    key={`bars-${region.id}`}
                    className="absolute flex items-end gap-[2px] -translate-x-1/2 transition-opacity duration-300 z-20 pointer-events-none"
                    style={{
                      left:    `${region.x}%`,
                      bottom:  `calc(${100 - region.y}% + 20px)`,
                      opacity: selectedRegion === null || selectedRegion === region.id ? 1 : 0.1,
                    }}
                  >
                    {barsToShow.map(({ score, label }, i) => {
                      const h = (score / 100) * 40;
                      const color = getBarColor(score)
                        .replace("var(--irumi-urgent)", "#E24B4A")
                        .replace("var(--irumi-brand)", "#FF6600")
                        .replace("var(--irumi-watch)", "#FFAA00")
                        .replace("var(--irumi-safe)", "#5DAA30");
                      return (
                        <div key={i} className="flex flex-col items-center">
                          <span className="text-[9px] font-[900] mb-[2px]" style={{ color }}>{label}</span>
                          <div className="w-[6px] rounded-t-[2px]" style={{ height: `${h}px`, backgroundColor: color, opacity: 0.9 }} />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 범례 */}
          <div className="flex flex-col gap-[8px] mt-[16px]">
            <div className="flex items-center gap-[8px]">
              <span className="text-[11px] text-[#AAAAAA] font-[600] shrink-0">막대 순서</span>
              <span className="text-[11px] text-[#BBBBBB]">물 · 자 · 부 · 고 · 금&nbsp;&nbsp;(고정)</span>
            </div>
            <div className="flex items-center gap-[14px]">
              <div className="flex items-center gap-[6px]">
                <span className="text-[11px] text-[#AAAAAA] font-[600]">막대 색</span>
                {[
                  { name: "안전", color: "#5DAA30" },
                  { name: "관찰", color: "#FFAA00" },
                  { name: "주의", color: "#FF6600" },
                  { name: "긴급", color: "#E24B4A" },
                ].map((item) => (
                  <div key={item.name} className="flex items-center gap-[3px]">
                    <div className="w-[8px] h-[8px] rounded-[2px]" style={{ backgroundColor: item.color }} />
                    <span className="text-[11px] text-[#999999]">{item.name}</span>
                  </div>
                ))}
              </div>
              <div className="w-[1px] h-[12px] bg-[#EEEEEE]" />
              <div className="flex items-center gap-[6px]">
                <span className="text-[11px] text-[#AAAAAA] font-[600]">지역 배경</span>
                <span className="text-[11px] text-[#BBBBBB]">= 종합 위험도</span>
              </div>
            </div>
          </div>
        </div>

        {/* 우: 요약 + TOP5 + 신호 카드 */}
        <div className="flex flex-col gap-[20px] h-full">
          <div className="grid grid-cols-2 gap-[16px] shrink-0">
            {/* 선택 지역 요약 카드 */}
            <div className="rounded-[14px] p-[16px_18px] relative overflow-hidden" style={{ background: cardGradient }}>
              <div className="absolute inset-0 rounded-[14px] overflow-hidden pointer-events-none">
                <div className="absolute right-0 bottom-0 w-[130px] h-[130px] opacity-[0.12] pointer-events-none translate-x-[20%] translate-y-[20%]">
                  <img src="/images/irumi-logo.svg" alt="logo watermark" className="w-full h-full object-contain" style={{ filter: "brightness(0) invert(1)" }} />
                </div>
              </div>

              <div className="text-[12px] font-[600] mb-[6px] relative z-10" style={{ color: "rgba(255,255,255,0.75)" }}>현재 선택 지역</div>
              <div className="flex items-start justify-between mb-[20px] relative z-10">
                <div className="text-[22px] font-[800] text-white">
                  {selectedRegion ? regions.find((r) => r.id === selectedRegion)?.name : "전국 평균"}
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[34px] font-[900] text-white leading-none">{avgScore}</span>
                </div>
              </div>

              <div className="flex flex-col gap-[10px] relative z-10">
                {SCORE_LABELS.map((item, idx) => {
                  const score = currentScores[idx];
                  return (
                    <div key={idx} className="flex items-center h-[20px]">
                      <div className="w-[44px] text-[13px] font-[600]" style={{ color: "rgba(255,255,255,0.85)" }}>{item.label}</div>
                      <div className="flex-1 h-[4px] rounded-[2px] mx-[10px] relative" style={{ backgroundColor: "rgba(255,255,255,0.25)" }}>
                        <div className="absolute left-0 top-0 h-full rounded-[2px] transition-all duration-500" style={{ width: `${score}%`, backgroundColor: "rgba(255,255,255,0.85)" }} />
                      </div>
                      <div className="w-[28px] text-[14px] font-[800] text-right text-white">{score}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 위험 지역 TOP 5 */}
            <div className="bg-white rounded-[16px] p-[20px_22px]" style={{ border: "1px solid #F0F0F0" }}>
              <div className="flex items-center justify-between mb-[16px]">
                <div className="flex items-center gap-[8px]">
                  <div className="w-[6px] h-[6px] bg-[#FF6600] rounded-full" />
                  <span className="text-[15px] font-[700] text-[#1A1A1A]">위험 지역 TOP 5</span>
                </div>
                <span className="text-[11px] text-[#CCCCCC]">종합 위험도</span>
              </div>
              <div className="flex flex-col gap-[12px]">
                {[...regions]
                  .map((r) => ({ ...r, avg: Math.round(r.bars.reduce((a, b) => a + b, 0) / r.bars.length) }))
                  .sort((a, b) => b.avg - a.avg)
                  .slice(0, 5)
                  .map((region, idx) => {
                    const color = getBarColor(region.avg).replace("var(--irumi-urgent)", "#E24B4A").replace("var(--irumi-brand)", "#FF6600").replace("var(--irumi-watch)", "#FFAA00").replace("var(--irumi-safe)", "#5DAA30");
                    const riskLabel = region.avg >= 80 ? "긴급" : region.avg >= 60 ? "주의" : region.avg >= 40 ? "관찰" : "안전";
                    return (
                      <div
                        key={region.id}
                        onClick={() => setSelectedRegion(region.id === selectedRegion ? null : region.id)}
                        className="flex items-center gap-[10px] cursor-pointer group"
                      >
                        <span className={`text-[13px] font-[800] w-[16px] text-center shrink-0 ${idx === 0 ? "text-[#E24B4A]" : idx === 1 ? "text-[#FF6600]" : "text-[#CCCCCC]"}`}>{idx + 1}</span>
                        <span className="text-[13px] font-[600] text-[#333333] group-hover:text-[#FF6600] transition-colors w-[32px] shrink-0">{region.name}</span>
                        <div className="flex items-center gap-[6px] flex-1 ml-[4px]">
                          <svg width="24" height="24" viewBox="0 0 24 24" className="shrink-0">
                            <circle cx="12" cy="12" r="9.5" fill="none" stroke="#F0F0F0" strokeWidth="3" />
                            <circle cx="12" cy="12" r="9.5" fill="none" stroke={color} strokeWidth="3"
                              strokeDasharray={`${(2 * Math.PI * 9.5) * region.avg / 100} ${2 * Math.PI * 9.5}`}
                              strokeLinecap="round" transform="rotate(-90 12 12)" />
                          </svg>
                          <span className="text-[14px] font-[800] w-[24px]" style={{ color }}>{region.avg}</span>
                        </div>
                        <span className="text-[11px] font-[700] px-[8px] py-[3px] rounded-[5px] shrink-0" style={{ backgroundColor: color + "18", color }}>{riskLabel}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* 신호 카드 그리드 */}
          <div className="flex flex-col gap-[16px] flex-1 relative">
            <div className="flex items-center gap-[10px] shrink-0">
              <div className="flex-1 h-[1px] bg-[#EEEEEE]" />
              <span className="text-[13px] text-[#BBBBBB] font-[600] shrink-0">
                감지된 신호 {filteredSignals.length}건
              </span>
              <div className="flex-1 h-[1px] bg-[#EEEEEE]" />
            </div>

            <div className="grid grid-cols-2 gap-[12px] flex-1 auto-rows-fr">
              {displayedSignals.length > 0 ? (
                displayedSignals.map((signal, i) => {
                  const isLastOdd = displayedSignals.length % 2 !== 0 && i === displayedSignals.length - 1;
                  return (
                    <div key={signal.id} className={`h-full ${isLastOdd ? "col-span-2" : ""}`}>
                      <CrisisSignalCard
                        signal={signal}
                        onClick={() => {
                          setSelectedSignal(convertToSignal(signal));
                          setDialogOpen(true);
                        }}
                      />
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 py-[50px] flex flex-col items-center justify-center gap-[14px] bg-white rounded-[14px] border border-[#F0F0F0]">
                  <div className="w-[48px] h-[48px] rounded-full bg-[#F5F5F5] flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-[20px] h-[20px] text-[#CCCCCC]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                      <path d="M13 13l6 6" />
                    </svg>
                  </div>
                  <div className="flex flex-col items-center gap-[6px]">
                    <p className="text-[14px] font-[700] text-[#555555]">조건에 맞는 신호가 없어요</p>
                    <p className="text-[12px] text-[#AAAAAA]">필터를 변경하거나 초기화해 보세요</p>
                  </div>
                  <button onClick={() => { setFilterRegion("전체"); setFilterRisk("전체"); setActiveCategory("전체"); }} className="mt-[4px] text-[12px] font-[600] text-[#FF6600] hover:underline">
                    필터 초기화
                  </button>
                </div>
              )}
            </div>

            {filteredSignals.length > visibleCount && (
              <div className="absolute top-full left-0 w-full pt-[12px] flex justify-center">
                <button
                  onClick={() => setVisibleCount((v) => v + 4)}
                  className="flex flex-col items-center justify-center text-[#CCCCCC] hover:text-[#FF6600] transition-colors group"
                >
                  <span className="text-[10px] font-[600] mb-[2px] opacity-0 group-hover:opacity-100 transition-opacity">더보기</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-[20px] h-[20px] group-hover:translate-y-[2px] transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
    {/* 데이터 출처 (카드 외부 배경) */}
    <div className="mt-[16px] flex flex-col gap-[2px]">
      <p className="text-[11px] text-[#CCCCCC]">
        ※ 종합 위험도는 5가지 지표를 가중 평균하여 산출됩니다.
      </p>
      <p className="text-[11px] text-[#CCCCCC]">
        데이터 출처: 한국은행, 통계청, 매일경제 및 이르미 자체 AI 분석 모델
      </p>
    </div>

    <SignalDetailDialog
      signal={selectedSignal}
      open={dialogOpen}
      onOpenChange={setDialogOpen}
    />
    </>
  );
}
