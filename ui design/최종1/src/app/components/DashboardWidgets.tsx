import React from "react";

const emergingIssues = [
  { rank: 1, name: "긴축재정", count: 12 },
  { rank: 2, name: "디지털화폐", count: 9 },
  { rank: 3, name: "공급망재편", count: 8 },
  { rank: 4, name: "탄소국경세", count: 7 },
  { rank: 5, name: "리쇼어링", count: 6 },
  { rank: 6, name: "그린인플레", count: 5 },
  { rank: 7, name: "무역적자", count: 5 },
  { rank: 8, name: "AI실업", count: 4 },
  { rank: 9, name: "스태그플레이션", count: 4 },
  { rank: 10, name: "가계부실", count: 3 },
];

export function EmergingIssuesWidget() {
  return (
    <div className="w-full bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-[24px] flex flex-col h-full border border-[#F0F0F0]">
      <div className="flex justify-between items-end mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#FF6600]"></div>
          <span className="text-[14px] font-[700] text-[#1A1A1A]">이머징 이슈</span>
        </div>
        <div className="text-[11px] text-[#8A8A8A] pb-[1px]">
          7일간 없다가 오늘 새로 등장
        </div>
      </div>
      
      <div className="flex-1 flex flex-col gap-1">
        {emergingIssues.map((issue) => (
          <div 
            key={issue.rank} 
            className="flex items-center h-[36px] border-b-[0.5px] border-[#F8F8F5] last:border-none hover:bg-[#FAFAFA] rounded-md transition-colors px-2 -mx-2 cursor-pointer"
            style={{ backgroundColor: issue.rank <= 3 ? '#FFF0E8' : 'transparent' }}
          >
            <div 
              className="w-[24px] text-[13px] font-[800] text-center"
              style={{ color: issue.rank <= 3 ? '#FF6600' : '#DDDDDD' }}
            >
              {issue.rank}
            </div>
            <div className="flex-1 text-[13px] font-medium text-[#333333] truncate px-2">
              {issue.name}
            </div>
            <div className="text-[11px] text-[#AAAAAA]">
              {issue.count}건
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
