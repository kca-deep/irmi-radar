import React, { useState, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router";
import { Sidebar } from "./components/Sidebar";

export function Layout() {
  const [period, setPeriod] = useState("최근 1개월");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const periods = ["최근 1주", "최근 1개월", "최근 3개월"];
  const location = useLocation();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/analysis": return "맞춤분석";
      case "/news": return "뉴스 분석";
      case "/signals": return "위기 신호";
      case "/reporters": return "기자의 시선";
      default: return "Dashboard";
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans text-gray-900 flex w-full">
      {/* Left Sidebar */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        
        {/* Global Header */}
        <div className="w-full px-[40px] pt-[32px] shrink-0 flex justify-center z-50">
          <div className="w-full max-w-[1440px] flex justify-between items-end pb-[20px]">
            <h1 className="text-[34px] font-[900] text-[#111111] leading-none tracking-[-0.03em]" style={{ fontFamily: '"Inter", "Arial Black", "Noto Sans KR", sans-serif' }}>
              {getPageTitle()}
            </h1>
            
            <div className="flex items-center gap-4">
              <div className="text-[14px] text-[#A0A0A0]">2026년 3월 14일 토요일 기준</div>
              
              {/* Period Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center justify-between gap-2 bg-transparent hover:bg-[#EBEBEB] text-[#666666] text-[13px] font-[600] px-3 py-2 rounded-[8px] transition-colors cursor-pointer min-w-[110px]"
                >
                  {period}
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
                </button>
                
                {isDropdownOpen && (
                  <div className="absolute top-[110%] right-0 w-full bg-white border border-[#E0E0E0] rounded-[8px] shadow-[0_4px_16px_rgba(0,0,0,0.1)] z-[100] py-1 overflow-hidden">
                    {periods.map((p) => (
                      <button
                        key={p}
                        onClick={() => { setPeriod(p); setIsDropdownOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-[13px] font-medium transition-colors hover:bg-[#FAFAFA] ${
                          period === p ? "text-[#FF6600] bg-[#FFF0E8]" : "text-[#4A4A4A]"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button className="flex items-center gap-2 bg-transparent hover:bg-[#EBEBEB] text-[#666666] text-[13px] font-[600] px-4 py-2 rounded-[8px] transition-colors cursor-pointer ml-1">
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

        {/* Page Content */}
        <div className="flex-1 w-full flex justify-center overflow-y-auto">
          <div className="w-full max-w-[1440px] px-[40px] pb-[32px]">
            <Outlet context={{ period }} />
          </div>
        </div>
      </div>
    </div>
  );
}