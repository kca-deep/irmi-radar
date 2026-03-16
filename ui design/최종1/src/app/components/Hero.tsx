import React from "react";
import { useNavigate } from "react-router";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { WritingIllustration } from "./WritingIllustration";
import logoImage from "figma:asset/51c8d3b738b5afb03152478ea03183c71f3c6b64.png";

export function Hero() {
  const navigate = useNavigate();

  return (
    <div className="flex gap-[20px] w-full min-h-[160px]">
      {/* Left Score Card */}
      <div className="w-[280px] bg-gradient-to-br from-[#FF7A1F] to-[#E65500] rounded-[16px] text-white p-[24px] flex flex-col justify-between shadow-[0_4px_16px_rgba(255,102,0,0.25)] relative z-50 shrink-0">
        {/* Subtle Background Graphic inside a non-overflow-hidden parent to prevent tooltip clipping */}
        <div className="absolute inset-0 rounded-[16px] overflow-hidden pointer-events-none">
          <div className="absolute right-0 bottom-0 w-[180px] h-[180px] opacity-[0.16] pointer-events-none mix-blend-multiply translate-x-[15%] translate-y-[15%]">
            <img src={logoImage} alt="logo watermark" className="w-full h-full object-contain" />
          </div>
        </div>
        
        <div className="relative z-10">
          <div className="text-[14px] font-bold opacity-90 mb-2">종합 민생위기 지수</div>
          <div className="flex items-center gap-2 group relative cursor-help w-max">
            <span className="text-[64px] font-[900] leading-none tracking-tight">53</span>
            <span className="bg-white/20 text-white border border-white/30 backdrop-blur-sm text-[12px] font-[700] px-3 py-1 rounded-full">
              주의
            </span>
            <div className="absolute left-[105%] top-1/2 -translate-y-1/2 w-[220px] bg-white text-[#333333] text-[11px] p-[10px_12px] rounded-[8px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-[#EAEAEA] font-medium leading-[1.4] whitespace-normal text-left pointer-events-none ml-2">
              최근 선택된 기간의 뉴스 심리, 경제 지표, 소셜 버즈량을 종합한 AI 산출 지수입니다.
              <div className="absolute left-[-5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white border-l border-b border-[#EAEAEA] rotate-45"></div>
            </div>
          </div>
        </div>
        <div className="text-[13px] font-medium opacity-90 mt-2 relative z-10">
          전일 대비 -3 ▼
        </div>
      </div>

      {/* Middle AI Briefing Card */}
      <div className="flex-[2.5] bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-[28px_32px] flex items-center justify-between relative overflow-hidden">
        {/* Background Decorative Blob */}
        <div className="absolute right-[-20px] bottom-[-40px] w-[200px] h-[200px] bg-[#FFF3EC] rounded-full opacity-60"></div>
        
        <div className="flex-1 pr-6 relative z-10 h-full flex flex-col justify-between">
          <div>
            <h2 className="text-[18px] font-[800] text-[#1A1A1A] leading-snug mb-6">
              "부동산은 안정세지만, 부동산·물가 부담이 커지고 있어요."
            </h2>
            <p className="text-[13px] text-[#666666] leading-relaxed mb-6">올해 소비자물가 상승률은 85점으로 위험 수준을 기록했지만, 부동산 분야가 85점으로 가장 높은 위험도를 보이고 있습니다. 자영업 분야는 43점으로 비교적 안정적인 수준을 유지하고 있습니다.</p>
          </div>
          <div className="mt-auto">
            <div className="inline-flex items-center gap-1.5 bg-[#F9F9F9] text-[#AAAAAA] text-[11px] font-[600] px-[12px] py-[6px] rounded-[6px] w-fit">
              <div className="w-1.5 h-1.5 rounded-full bg-[#AAAAAA]"></div>
              Claude AI · 10:07 실시간 분석
            </div>
          </div>
        </div>

        {/* Person Illustration Placeholder */}
        <div className="w-[140px] h-[140px] relative z-10 flex-shrink-0 flex items-center justify-center">
          <WritingIllustration className="w-full h-full object-contain drop-shadow-sm" />
        </div>
      </div>

      {/* Right Custom Analysis Card */}
      <div 
        className="w-[280px] bg-[#FFF8F3] border-[1.5px] border-[#F0C8A0] rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-[24px] flex flex-col justify-center items-center relative overflow-hidden group hover:border-[#FF6600] transition-colors cursor-pointer shrink-0" 
        onClick={() => navigate('/analysis')}
      >
        {/* Decorative background element */}
        <div className="absolute -right-8 -top-8 w-24 h-24 bg-[#FFEBDF] rounded-full opacity-50"></div>
        <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-[#FFEBDF] rounded-full opacity-50"></div>

        <div className="relative z-10 flex flex-col items-center text-center w-full">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm text-[#FF6600]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <line x1="19" y1="8" x2="19" y2="14"></line>
              <line x1="22" y1="11" x2="16" y2="11"></line>
            </svg>
          </div>
          <div className="text-[16px] font-[700] text-[#C44010] mb-2">
            내 상황 맞춤 분석
          </div>
          <div className="text-[12px] text-[#8A8A8A] mb-4">
            나의 직업과 연령대에 맞는<br/>맞춤형 경제 위기 신호를 확인하세요
          </div>
          
          <div className="text-[13px] font-[700] text-[#FF6600] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            맞춤 분석하러 가기 
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}