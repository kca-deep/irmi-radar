import React from "react";
import { Link } from "react-router";

const signals = [
  { level: "긴급", levelBg: "#E24B4A", levelColor: "#FFFFFF", category: "자영업", title: "배달앱 수수료 인상 관련 소상공인 부담 급증", date: "03-13" },
  { level: "긴급", levelBg: "#E24B4A", levelColor: "#FFFFFF", category: "물가", title: "연평균 환율 IMF보다 높다 1500원 육박 전망", date: "03-13" },
  { level: "주의", levelBg: "#FF6600", levelColor: "#FFFFFF", category: "부동산", title: "수도권 전세가격 3주 연속 상승 전환", date: "03-13" },
  { level: "주의", levelBg: "#FF6600", levelColor: "#FFFFFF", category: "물가", title: "소비자물가 상승률 4개월 연속 확대", date: "03-12" },
  { level: "주의", levelBg: "#FF6600", levelColor: "#FFFFFF", category: "부동산", title: "서울 아파트 계약 해제율 7.45% 역대 최고치", date: "03-12" },
  { level: "관찰", levelBg: "#FFAA00", levelColor: "#FFFFFF", category: "고용", title: "법적 불확실성으로 고용시장 불안 가능성 증가", date: "03-11" },
];

export function CrisisSignals({ selectedDate }: { selectedDate?: string | null }) {
  const filteredSignals = selectedDate 
    ? signals.map((s, i) => ({
        ...s,
        date: selectedDate === "Oct" ? `10-${10+i}` : selectedDate === "Nov" ? `11-${10+i}` : `12-${10+i}`
      })).slice(0, 3)
    : signals;

  return (
    <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-[24px] h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#FF6600]"></div>
          <span className="text-[14px] font-[700] text-[#1A1A1A] flex items-center">
            최근 위기 뉴스
            {selectedDate && <span className="text-[#FF6600] text-[12px] ml-1 font-medium bg-[#FFF0E8] px-1.5 py-0.5 rounded">({selectedDate}월 데이터)</span>}
          </span>
          
          <div className="group relative ml-1 flex items-center">
            
            <div className="absolute left-1/2 bottom-[130%] -translate-x-1/2 w-[220px] bg-white text-[#333333] text-[11px] p-[10px_12px] rounded-[8px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-[#EAEAEA] font-medium leading-[1.4] whitespace-normal text-left pointer-events-none">
              해당 분야의 뉴스 보도량과 부정적 감성어(예: 파산, 침체, 폭등) 비율이 평소보다 급증하여 AI가 위기 신호를 감지한 상태입니다.
              <div className="absolute left-1/2 bottom-[-5px] -translate-x-1/2 w-2.5 h-2.5 bg-white border-b border-r border-[#EAEAEA] rotate-45"></div>
            </div>
          </div>
        </div>
        <Link to="/news" className="text-[12px] font-medium text-[#FF6600] hover:underline flex items-center gap-1">
          전체 보기
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </Link>
      </div>

      <div className="flex-1">
        <div className="grid grid-cols-[80px_80px_1fr_80px] border-b border-[#F0F0F0] pb-2 mb-3 text-[12px] text-[#8A8A8A] font-medium">
          <div className="text-center">등급</div>
          <div className="text-center">분야</div>
          <div>제목</div>
          <div className="text-right pr-2">날짜</div>
        </div>
        
        <div className="flex flex-col gap-[10px]">
          {filteredSignals.map((signal, idx) => (
            <div key={idx} className="grid grid-cols-[80px_80px_1fr_80px] items-center text-[13px] hover:bg-[#FAFAFA] p-1 -mx-1 rounded-md transition-colors cursor-pointer group/row">
              <div className="flex justify-center relative">
                <span 
                  className="text-white text-[11px] font-bold w-[46px] text-center py-1 rounded-[6px] group-hover/row:scale-[1.05] transition-transform"
                  style={{ backgroundColor: signal.levelBg }}
                >
                  {signal.level}
                </span>
                
                {/* Badge Tooltip */}
                <div className="absolute left-1/2 bottom-[110%] -translate-x-1/2 w-[160px] bg-white text-[#333333] text-[11px] p-[8px_10px] rounded-[8px] opacity-0 invisible group-hover/row:opacity-100 group-hover/row:visible transition-all duration-200 z-[100] shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-[#EAEAEA] text-left font-medium pointer-events-none">
                  {signal.level === "긴급" ? "위험 지수 80 이상. 즉각적인 대비가 필요합니다." : signal.level === "주의" ? "위험 지수 60 이상. 지속적인 모니터링이 요망됩니다." : "위험 지수 40 이상. 동향 관찰 단계입니다."}
                  <div className="absolute left-1/2 bottom-[-4px] -translate-x-1/2 w-2 h-2 bg-white border-b border-r border-[#EAEAEA] rotate-45"></div>
                </div>
              </div>
              <div className="text-center text-[#666666]">{signal.category}</div>
              <div className="text-[#1A1A1A] truncate pr-4 hover:text-[#FF6600] transition-colors">{signal.title}</div>
              <div className="text-right pr-2 text-[#AAAAAA]">{signal.date}</div>
            </div>
          ))}
          {filteredSignals.length === 0 && (
            <div className="text-center text-[#AAAAAA] text-[13px] py-4">
              해당 기간의 위기 신호 데이터가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}