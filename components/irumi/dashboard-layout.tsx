"use client";

/**
 * dashboard-layout.tsx
 * 변환 포인트:
 *   - react-router의 Outlet, useLocation -> children prop, usePathname
 *   - PeriodProvider 감싸기 -> period 상태를 Context로 하위 컴포넌트에 전달
 */

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { IrumiSidebar } from "@/components/irumi/sidebar";
import { PeriodProvider, usePeriod } from "@/lib/irumi/period-context";
import { ChatFab } from "@/components/chat/chat-fab";
import chatData from "@/data/mock/chat-examples.json";
import type { ChatData } from "@/lib/types";

/* -- 헤더 내부 (period context 사용) -- */
function DashboardHeader({ referenceDate }: { referenceDate?: string }) {
  const pathname = usePathname();
  const { period, periods, setPeriod } = usePeriod();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 뉴스 분석 / 위기 신호 페이지에서만 드롭다운 표시
  const showPeriodDropdown =
    pathname === "/irumi/news" || pathname.startsWith("/news") ||
    pathname === "/irumi/signals" || pathname.startsWith("/signals");

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getPageTitle = () => {
    if (pathname === "/irumi/analysis" || pathname === "/analysis")  return "맞춤분석";
    if (pathname === "/irumi/news" || pathname.startsWith("/news"))  return "뉴스 분석";
    if (pathname === "/irumi/signals" || pathname.startsWith("/signals")) return "위기 신호";
    if (pathname === "/irumi/reporters" || pathname === "/reporters") return "기자의 시선";
    return "Dashboard";
  };

  return (
    <div className="w-full px-[40px] pt-[32px] shrink-0 flex justify-center z-50">
      <div className="w-full max-w-[1440px] flex justify-between items-end pb-[20px]">
        <h1
          className="text-[34px] font-[900] text-irumi-text-title leading-none tracking-[-0.03em]"
          style={{ fontFamily: '"Inter", "Arial Black", "Noto Sans KR", sans-serif' }}
        >
          {getPageTitle()}
        </h1>

        <div className="flex items-center gap-4">
          <div className="text-[14px] text-irumi-text-3">
            {(() => {
              const date = referenceDate ? new Date(referenceDate) : new Date();
              const y = date.getFullYear();
              const m = date.getMonth() + 1;
              const d = date.getDate();
              const dayNames = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
              return `${y}년 ${m}월 ${d}일 ${dayNames[date.getDay()]} 기준`;
            })()}
          </div>

          {/* 기간 드롭다운 — 뉴스 분석 / 위기 신호 페이지에서만 표시 */}
          {showPeriodDropdown && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center justify-between gap-2 bg-transparent hover:bg-[#EBEBEB] text-irumi-text-2 text-[13px] font-[600] px-3 py-2 rounded-[8px] transition-colors cursor-pointer min-w-[110px]"
            >
              {period}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {isDropdownOpen && (
              <div className="absolute top-[110%] right-0 w-full bg-white border border-irumi-line-md rounded-[8px] shadow-[0_4px_16px_rgba(0,0,0,0.1)] z-[100] py-1 overflow-hidden">
                {periods.map((p) => (
                  <button
                    key={p}
                    onClick={() => { setPeriod(p); setIsDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-[13px] font-medium transition-colors hover:bg-[#FAFAFA] ${
                      period === p ? "text-irumi-brand bg-irumi-nav-active-bg" : "text-irumi-text-dropdown"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
          )}

          {/* 리포트 다운로드 */}
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-transparent hover:bg-[#EBEBEB] text-irumi-text-2 text-[13px] font-[600] px-4 py-2 rounded-[8px] transition-colors cursor-pointer ml-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            리포트 다운로드
          </button>
        </div>
      </div>
    </div>
  );
}

/* -- 레이아웃 래퍼 -- */
interface NavItem {
  label: string;
  href: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  referenceDate?: string;
  navItems?: NavItem[];
}

export function DashboardLayout({ children, referenceDate, navItems }: DashboardLayoutProps) {
  return (
    <PeriodProvider>
      <div className="min-h-screen bg-irumi-page font-sans text-irumi-text-1 flex w-full">
        <IrumiSidebar navItems={navItems} />

        <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
          <DashboardHeader referenceDate={referenceDate} />

          <div className="flex-1 w-full flex justify-center overflow-y-auto">
            <div className="w-full max-w-[1440px] px-[40px] pb-[32px]">
              {children}
            </div>
          </div>
        </div>
        <ChatFab chatData={chatData as ChatData} />
      </div>
    </PeriodProvider>
  );
}
