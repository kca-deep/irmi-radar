import React from "react";
import { Link, useLocation } from "react-router";

export function Sidebar() {
  const location = useLocation();
  const isDashboard = location.pathname === "/";
  const isAnalysis = location.pathname === "/analysis";
  const isSignals = location.pathname === "/signals";
  const isNews = location.pathname === "/news";
  const isReporters = location.pathname === "/reporters";

  return (
    <aside className="w-[220px] h-screen sticky top-0 bg-white border-r border-[#F0F0F0] pt-10 pb-8 px-4 flex flex-col justify-between shrink-0">
      <div className="flex flex-col gap-10">
        {/* Logo */}
        <div className="flex items-center gap-2 px-2">
          <div className="w-[20px] h-[20px] rounded-full bg-[#FF6600] flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-white"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-[14px] font-[800] text-[#FF6600] leading-none mb-1">이르미</span>
            <span className="text-[10px] text-[#A0A0A0] leading-none tracking-tight">민생위기 조기경보 레이더</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-[2px]">
          <Link 
            to="/"
            className={`flex items-center px-3 py-3 rounded-[8px] text-[13px] font-[600] transition-colors ${
              isDashboard 
                ? 'bg-[#FFF0E8] text-[#FF6600]' 
                : 'text-[#8A8A8A] hover:bg-[#F9F9F9] hover:text-[#1A1A1A]'
            }`}
          >
            {isDashboard && <span className="w-1.5 h-1.5 rounded-full bg-[#FF6600] mr-2"></span>}
            {!isDashboard && <span className="w-1.5 h-1.5 rounded-full bg-[#CCCCCC] mr-2"></span>}
            대시보드
          </Link>
          <Link 
            to="/analysis"
            className={`flex items-center px-3 py-3 rounded-[8px] text-[13px] font-[600] transition-colors ${
              isAnalysis 
                ? 'bg-[#FFF0E8] text-[#FF6600]' 
                : 'text-[#8A8A8A] hover:bg-[#F9F9F9] hover:text-[#1A1A1A]'
            }`}
          >
            {isAnalysis && <span className="w-1.5 h-1.5 rounded-full bg-[#FF6600] mr-2"></span>}
            {!isAnalysis && <span className="w-1.5 h-1.5 rounded-full bg-[#CCCCCC] mr-2"></span>}
            맞춤 분석
          </Link>
          <Link 
            to="/signals"
            className={`flex items-center px-3 py-3 rounded-[8px] text-[13px] font-[600] transition-colors ${
              isSignals
                ? 'bg-[#FFF0E8] text-[#FF6600]' 
                : 'text-[#8A8A8A] hover:bg-[#F9F9F9] hover:text-[#1A1A1A]'
            }`}
          >
            {isSignals && <span className="w-1.5 h-1.5 rounded-full bg-[#FF6600] mr-2"></span>}
            {!isSignals && <span className="w-1.5 h-1.5 rounded-full bg-[#CCCCCC] mr-2"></span>}
            위기 신호
          </Link>
          <Link 
            to="/news"
            className={`flex items-center px-3 py-3 rounded-[8px] text-[13px] font-[600] transition-colors ${
              isNews
                ? 'bg-[#FFF0E8] text-[#FF6600]' 
                : 'text-[#8A8A8A] hover:bg-[#F9F9F9] hover:text-[#1A1A1A]'
            }`}
          >
            {isNews && <span className="w-1.5 h-1.5 rounded-full bg-[#FF6600] mr-2"></span>}
            {!isNews && <span className="w-1.5 h-1.5 rounded-full bg-[#CCCCCC] mr-2"></span>}
            뉴스 분석
          </Link>
          <Link 
            to="/reporters"
            className={`flex items-center px-3 py-3 rounded-[8px] text-[13px] font-[600] transition-colors ${
              isReporters
                ? 'bg-[#FFF0E8] text-[#FF6600]' 
                : 'text-[#8A8A8A] hover:bg-[#F9F9F9] hover:text-[#1A1A1A]'
            }`}
          >
            {isReporters && <span className="w-1.5 h-1.5 rounded-full bg-[#FF6600] mr-2"></span>}
            {!isReporters && <span className="w-1.5 h-1.5 rounded-full bg-[#CCCCCC] mr-2"></span>}
            기자의 시선
          </Link>
        </nav>
      </div>

      {/* Bottom Area */}
      <div className="flex flex-col gap-4 px-2">
        <div className="bg-[#FFF8F3] rounded-[12px] p-4 flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute right-[-10px] bottom-[-10px] w-12 h-12 bg-[#FFEBDF] rounded-full opacity-50"></div>
          <div className="text-[12px] font-[700] text-[#FF6600] relative z-10">알림 설정</div>
          <div className="text-[11px] text-[#666666] leading-snug relative z-10 mb-1">
            위기 신호 발생 시<br/>즉시 알림을 받아보세요
          </div>
          <button className="bg-white text-[#FF6600] text-[11px] font-[600] py-1.5 rounded-[6px] border border-[#F0C8A0] hover:bg-[#FFF3EC] transition-colors relative z-10">
            설정하기
          </button>
        </div>

        <div className="w-full h-[1px] bg-[#F0F0F0] my-2"></div>

        <div className="flex flex-col gap-3">
          <button className="flex items-center gap-2 text-[12px] font-[500] text-[#8A8A8A] hover:text-[#1A1A1A] transition-colors px-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            설정
          </button>
          
          <div className="flex items-center gap-2 mt-1">
            <div className="w-[32px] h-[32px] rounded-full bg-[#1A1A1A] text-white flex items-center justify-center font-bold text-[14px] shadow-sm">
              김
            </div>
            <div className="flex flex-col">
              <span className="text-[12px] font-[600] text-[#1A1A1A]">김매경님</span>
              <span className="text-[10px] text-[#8A8A8A]">개인 회원</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
