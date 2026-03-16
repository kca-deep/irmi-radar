"use client";

/**
 * custom-analysis-page.tsx
 * 변환 포인트:
 *   - 하드코딩 cards/riskConfig 제거 → CustomAnalysisData props
 *   - motion/react은 Next.js에서 동일하게 동작
 *   - @hugeicons/react 아이콘 사용
 *   - 색상 → CSS 변수 토큰
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Briefcase01Icon,
  GuestHouseIcon,
  ShoppingCart01Icon,
  BankIcon,
  Store01Icon,
} from "@hugeicons/react";
import type { CustomAnalysisData, CustomCard, RiskGrade } from "@/lib/irumi/types";

// ── 카테고리 설정 ─────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { bg: string; Icon: React.ElementType; iconColor: string }> = {
  물가:   { bg: "#FFF8E1", Icon: ShoppingCart01Icon, iconColor: "#F0A000" },
  고용:   { bg: "#EDF2FF", Icon: Briefcase01Icon,    iconColor: "#4C6EF5" },
  자영업: { bg: "#F8D7DA", Icon: Store01Icon,        iconColor: "#D94040" },
  금융:   { bg: "#E8F4FE", Icon: BankIcon,           iconColor: "#1E8BC3" },
  부동산: { bg: "#EDF7ED", Icon: GuestHouseIcon,     iconColor: "#3A9E42" },
};

const RISK_CONFIG: Record<RiskGrade, { color: string; ripple: boolean; cardBg: string }> = {
  긴급: { color: "var(--irumi-urgent)",  ripple: true,  cardBg: "#C84040" },
  주의: { color: "var(--irumi-brand)",   ripple: false, cardBg: "#D05520" },
  관찰: { color: "var(--irumi-watch)",   ripple: false, cardBg: "#CC9000" },
  안전: { color: "var(--irumi-safe)",    ripple: false, cardBg: "#4A8A22" },
};

// ── 카드 컴포넌트 ─────────────────────────────────────────
interface NewsCardProps {
  card: CustomCard;
  isSelected: boolean;
  isDimmed: boolean;
  onClick: () => void;
}

function NewsCard({ card, isSelected, isDimmed, onClick }: NewsCardProps) {
  const cat  = CATEGORY_CONFIG[card.category] ?? CATEGORY_CONFIG["금융"];
  const risk = RISK_CONFIG[card.risk as RiskGrade] ?? RISK_CONFIG["관찰"];
  const CatIcon = cat.Icon;

  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        borderRadius: "16px",
        backgroundColor: risk.cardBg,
        overflow: "hidden",
        boxShadow: isSelected ? "0 8px 28px rgba(0,0,0,0.22)" : "0 2px 12px rgba(0,0,0,0.12)",
        padding: "18px 18px 20px",
        minHeight: "190px",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        transform: isSelected ? "translateY(-2px)" : isDimmed ? "scale(0.98)" : "translateY(0)",
        opacity: isDimmed ? 0.45 : 1,
        outline: isSelected ? "2px solid rgba(255,255,255,0.55)" : "none",
        outlineOffset: "2px",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 28px rgba(0,0,0,0.22)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.12)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        }
      }}
    >
      {/* 배경 아이콘 */}
      <div style={{ position: "absolute", bottom: "-18px", right: "-18px", opacity: 0.16, pointerEvents: "none", zIndex: 0 }}>
        <CatIcon size={110} color="white" />
      </div>

      {/* 상단: 뱃지 + 번호 */}
      <div style={{ position: "relative", zIndex: 1, marginBottom: "14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ backgroundColor: "rgba(255,255,255,0.22)", borderRadius: "20px", padding: "5px 12px", fontSize: "11px", fontWeight: 700, color: "white", letterSpacing: "0.2px" }}>
          {card.risk} · {card.category}
        </span>
        <span style={{ fontSize: "28px", fontWeight: 900, color: "rgba(255,255,255,0.22)", lineHeight: 1 }}>{card.id}</span>
      </div>

      {/* 제목 */}
      <p style={{ fontSize: "16px", fontWeight: 800, color: "white", lineHeight: 1.45, margin: 0, flex: 1, letterSpacing: "-0.4px", wordBreak: "keep-all", whiteSpace: "pre-line", position: "relative", zIndex: 1 }}>
        {card.title}
      </p>

      {/* 하단 */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: "12px", position: "relative", zIndex: 1 }}>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.60)", fontWeight: 500, margin: 0 }}>{card.subtitle}</p>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.70)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </div>
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────
interface CustomAnalysisPageProps {
  data: CustomAnalysisData;
  /**
   * 재분석 버튼 클릭 시 호출 — GET /api/custom?age=&job= 을 새 조건으로 호출
   */
  onReanalyze?: (age: string, job: string) => void;
}

const AGE_OPTIONS  = ["20대", "30대", "40대", "50대", "60대 이상"];
const JOB_OPTIONS  = ["직장인", "자영업자", "구직자", "프리랜서"];

export function CustomAnalysisPage({ data, onReanalyze }: CustomAnalysisPageProps) {
  const [selectedCard, setSelectedCard] = useState<CustomCard | null>(null);
  const [ageGroup, setAgeGroup] = useState(data.ageGroup);
  const [jobGroup, setJobGroup] = useState(data.jobGroup);

  const cards = data.cards;

  return (
    <div className="pb-10 pt-[8px]">
      <style>{`
        @keyframes ripple {
          0%   { box-shadow: 0 0 0 0 rgba(226,75,74,0.5); }
          70%  { box-shadow: 0 0 0 8px rgba(226,75,74,0); }
          100% { box-shadow: 0 0 0 0 rgba(226,75,74,0); }
        }
        .dot-urgent { animation: ripple 1.5s ease-out infinite; }
      `}</style>

      {/* 인사말 + 필터 바 */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-[28px] py-[20px] rounded-[24px] mb-[24px] relative overflow-hidden bg-card border border-irumi-line shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="absolute top-0 bottom-0 right-0 w-[55%] bg-irumi-brand-muted z-0 hidden md:block" style={{ clipPath: "polygon(15% 0, 100% 0, 100% 100%, 0% 100%)" }} />
        <div className="absolute right-[10%] top-[10%] w-[100px] h-[100px] rounded-full bg-[#FFE5D6] blur-[40px] opacity-60 z-0 hidden md:block" />

        {/* 좌: 인사말 */}
        <div className="flex items-center gap-[16px] relative z-20 mb-4 md:mb-0">
          <div className="w-[48px] h-[48px] bg-gradient-to-br from-irumi-brand-muted to-[#FFE0CC] rounded-full flex items-center justify-center text-irumi-brand shadow-sm border border-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div className="flex flex-col justify-center">
            <div className="text-[20px] font-[800] text-[var(--irumi-text-1)] tracking-[-0.5px] mb-[2px]">{data.userName}님, 반갑습니다!</div>
            <div className="text-[13px] text-[var(--irumi-text-3)] font-[500] tracking-tight">나에게 꼭 맞는 맞춤 혜택을 꼼꼼하게 확인해 보세요</div>
          </div>
        </div>

        {/* 우: 맞춤 조건 필터 */}
        <div className="flex items-center gap-[10px] relative z-20 bg-irumi-brand-muted py-[8px] px-[12px] rounded-[16px] border border-irumi-brand-border">
          <span className="text-[12px] font-[700] text-[var(--irumi-text-2)] mr-[4px]">맞춤 조건</span>
          <div className="relative w-[110px] h-[36px]">
            <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}
              className="w-full h-full appearance-none bg-white border border-irumi-brand-border hover:border-irumi-brand transition-colors rounded-[8px] text-[13px] text-[var(--irumi-text-1)] font-[600] pl-[12px] pr-[30px] outline-none shadow-sm cursor-pointer">
              {AGE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <svg className="absolute right-[12px] top-1/2 -translate-y-1/2 w-4 h-4 text-[#888] pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
          </div>
          <div className="relative w-[130px] h-[36px]">
            <select value={jobGroup} onChange={(e) => setJobGroup(e.target.value)}
              className="w-full h-full appearance-none bg-white border border-irumi-brand-border hover:border-irumi-brand transition-colors rounded-[8px] text-[13px] text-[var(--irumi-text-1)] font-[600] pl-[12px] pr-[30px] outline-none shadow-sm cursor-pointer">
              {JOB_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <svg className="absolute right-[12px] top-1/2 -translate-y-1/2 w-4 h-4 text-[#888] pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
          </div>
          <button
            onClick={() => onReanalyze?.(ageGroup, jobGroup)}
            className="h-[36px] px-[18px] bg-irumi-brand text-white text-[13px] font-[700] rounded-[8px] shadow-[var(--irumi-shadow-brand)] border-none hover:bg-irumi-brand-hover hover:-translate-y-[1px] active:translate-y-[0px] transition-all"
          >
            재분석
          </button>
        </div>
      </div>

      {/* 메인 */}
      <div className="flex flex-col gap-[28px]">
        <div className="h-[1px] w-full bg-irumi-line -my-[14px]" />

        <main className="w-full">
          <div className="mb-[14px]">
            <h1 className="text-[22px] font-[900] tracking-[-0.5px] leading-[1.3] text-[var(--irumi-text-1)]">
              <span className="text-irumi-brand">{ageGroup} {jobGroup}</span>, 지금 당장 이것만 하세요.
            </h1>
            <p className="text-[12px] text-[var(--irumi-text-3)] font-medium mt-[4px] py-[5px]">
              1년 뉴스 흐름 + 오늘 데이터 기반 · 카드를 클릭하면 이유와 신청 방법을 확인할 수 있어요
            </p>
          </div>

          <div className="flex flex-col gap-[10px]">
            {Array.from({ length: Math.ceil(cards.length / 3) }).map((_, rowIndex) => {
              const rowCards = cards.slice(rowIndex * 3, (rowIndex + 1) * 3);
              const isSelectedInRow = selectedCard && rowCards.some((c) => c.id === selectedCard.id);

              return (
                <div key={rowIndex} className="contents">
                  <div className="grid grid-cols-3 gap-[10px]">
                    {rowCards.map((card) => (
                      <NewsCard
                        key={card.id}
                        card={card}
                        isSelected={selectedCard?.id === card.id}
                        isDimmed={selectedCard !== null && selectedCard.id !== card.id}
                        onClick={() => setSelectedCard(selectedCard?.id === card.id ? null : card)}
                      />
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {isSelectedInRow && selectedCard && (() => {
                      const risk = RISK_CONFIG[selectedCard.risk as RiskGrade] ?? RISK_CONFIG["관찰"];
                      const cat  = CATEGORY_CONFIG[selectedCard.category] ?? CATEGORY_CONFIG["금융"];
                      const CatIcon = cat.Icon;
                      const newsItems = data.supportNews[selectedCard.id] ?? [];

                      return (
                        <motion.div
                          key={`detail-${selectedCard.id}`}
                          initial={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
                          animate={{ opacity: 1, height: "auto", marginTop: 8, marginBottom: 20 }}
                          exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="bg-card rounded-[16px] shadow-[0_8px_24px_rgba(0,0,0,0.06)] border border-irumi-brand-border flex overflow-hidden">
                            {/* 좌측 사이드바 */}
                            <div className="w-[220px] p-[20px] flex flex-col shrink-0 relative overflow-hidden" style={{ backgroundColor: risk.cardBg }}>
                              <div style={{ position: "absolute", bottom: "-18px", right: "-18px", opacity: 0.16, pointerEvents: "none", zIndex: 0 }}>
                                <CatIcon size={110} color="white" />
                              </div>
                              <div style={{ position: "relative", zIndex: 1, marginBottom: "14px" }}>
                                <span style={{ backgroundColor: "rgba(255,255,255,0.22)", borderRadius: "20px", padding: "5px 12px", fontSize: "11px", fontWeight: 700, color: "white", letterSpacing: "0.2px" }}>
                                  {selectedCard.risk} · {selectedCard.category}
                                </span>
                              </div>
                              <p style={{ fontSize: "20px", fontWeight: 800, color: "white", lineHeight: 1.45, margin: 0, flex: 1, letterSpacing: "-0.4px", wordBreak: "keep-all", whiteSpace: "pre-line", position: "relative", zIndex: 1 }}>
                                {selectedCard.title}
                              </p>
                            </div>

                            {/* 우측 콘텐츠 */}
                            <div className="flex-1 p-[20px] flex bg-[#FFFDFB]">
                              {/* 왜 지금인가 + 신청 */}
                              <div className="flex-1 flex flex-col justify-between pr-[20px] border-r-[0.5px] border-irumi-brand-border">
                                <div>
                                  <div className="text-[10px] text-irumi-brand font-[700] tracking-[0.3px] mb-[6px] flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-irumi-brand rounded-full" />
                                    왜 지금인가
                                  </div>
                                  <div className="text-[12px] text-[#444444] leading-[1.5]">
                                    최근 3개월간 관련 정책 및 뉴스에서 가장 시급하게 다루어지는 이슈입니다. 지금 신청하지 않으면 예산이 소진되거나 지원 자격을 상실할 수 있습니다.
                                  </div>
                                </div>
                                <div className="mt-[16px] pt-[14px] border-t-[0.5px] border-irumi-brand-border">
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className="w-9 h-9 bg-irumi-brand-muted text-irumi-brand rounded-[8px] flex items-center justify-center shrink-0">
                                      <BankIcon size={16} />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-[10px] text-[var(--irumi-text-3)] font-[500] mb-[2px]">신청 가능한 정부지원</div>
                                      <div className="text-[13px] font-[700] text-[var(--irumi-text-1)] truncate">2026 맞춤형 지원 프로그램</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => setSelectedCard(null)}
                                      className="px-[14px] py-[7px] text-[12px] font-[600] text-[var(--irumi-text-3)] hover:bg-[#F0EBE1] rounded-[8px] transition-colors">
                                      닫기
                                    </button>
                                    <button className="flex-1 text-white text-[12px] font-[700] px-[16px] py-[7px] rounded-[8px] shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-all whitespace-nowrap hover:brightness-90"
                                      style={{ backgroundColor: risk.cardBg }}>
                                      신청하러 가기
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* 근거 뉴스 */}
                              <div className="flex-1 pl-[20px] flex flex-col h-full">
                                <div className="text-[10px] text-irumi-brand font-[700] tracking-[0.3px] mb-[6px] flex items-center gap-1.5 shrink-0">
                                  <div className="w-1.5 h-1.5 bg-irumi-brand rounded-full" />
                                  근거 뉴스
                                </div>
                                <div className="flex flex-col gap-2 overflow-y-auto max-h-[160px] pr-1">
                                  {newsItems.length > 0 ? newsItems.map((news, i) => (
                                    <div key={i} className="bg-white rounded-[8px] p-[8px_12px] border-[0.5px] border-irumi-brand-border shrink-0">
                                      <div className="text-[11px] text-[#333333] font-[600] leading-[1.4] mb-1 truncate">{news.headline}</div>
                                      <div className="text-[10px] text-[var(--irumi-text-3)]">{news.date}</div>
                                    </div>
                                  )) : (
                                    <div className="text-[12px] text-[var(--irumi-text-3)] py-4">관련 뉴스를 불러오는 중...</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })()}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* 빈 상태 */}
          <AnimatePresence>
            {!selectedCard && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-[32px] flex flex-col items-center justify-center py-[60px] bg-[#FDFDFD] rounded-[16px] border border-dashed border-irumi-line"
              >
                <div className="w-16 h-16 bg-[#F5F5F5] rounded-full flex items-center justify-center mb-4 shadow-sm">
                  {/* MousePointerClick → @hugeicons/react의 CursorPointerIcon 등으로 교체 */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-[#AAAAAA]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4.5v15m6-15v15M4.5 9h15M4.5 15h15"/></svg>
                </div>
                <div className="text-[15px] font-[700] text-[#444444] mb-2">위 카드 중 하나를 선택해보세요</div>
                <div className="text-[13px] text-[var(--irumi-text-3)] font-medium">카드를 클릭하면 상세한 지원 혜택과 신청 방법을 확인할 수 있습니다.</div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <div className="mt-[16px]">
        <p className="text-[11px] text-[#CCCCCC]">데이터 출처: 한국은행, 통계청, 매일경제 및 이르미 자체 AI 분석 모델</p>
      </div>
    </div>
  );
}
