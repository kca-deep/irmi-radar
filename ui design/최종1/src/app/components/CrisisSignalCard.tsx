import React from "react";
import { 
  Building, 
  Briefcase, 
  Coins, 
  Landmark, 
  Store 
} from "lucide-react";

export interface CrisisSignalType {
  id: string | number;
  category: string;
  risk: string;
  title: string;
  summary?: string;
  region?: string | null;
  date: string;
}

interface CrisisSignalCardProps {
  signal: CrisisSignalType;
  onClick?: () => void;
}

export function CrisisSignalCard({ signal, onClick }: CrisisSignalCardProps) {
  // Strip emojis from category name, leaving only Korean/English text
  const categoryName = signal.category.replace(/[^가-힣a-zA-Z]/g, '').trim();

  let Icon = Building;
  let iconBg = '#EDF7ED'; // default

  if (categoryName.includes('부동산')) {
    Icon = Building;
    iconBg = '#EDF7ED';
  } else if (categoryName.includes('고용')) {
    Icon = Briefcase;
    iconBg = '#EDF2FF';
  } else if (categoryName.includes('물가')) {
    Icon = Coins;
    iconBg = '#FFF8E1';
  } else if (categoryName.includes('금융')) {
    Icon = Landmark;
    iconBg = '#E8F4FE';
  } else if (categoryName.includes('자영업')) {
    Icon = Store;
    iconBg = '#FFF0F0';
  }

  let riskDotColor = '#5DAA30'; // 안전 default
  let isUrgent = false;

  if (signal.risk === '긴급') {
    riskDotColor = '#E24B4A';
    isUrgent = true;
  } else if (signal.risk === '주의') {
    riskDotColor = '#E8521A';
  } else if (signal.risk === '관찰') {
    riskDotColor = '#FFAA00';
  } else if (signal.risk === '안전') {
    riskDotColor = '#5DAA30';
  }

  return (
    <>
      <div 
        onClick={onClick}
        className="bg-white rounded-[14px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-[16px] flex flex-col h-full cursor-pointer hover:shadow-[0_6px_20px_rgba(0,0,0,0.10)] hover:-translate-y-[2px] transition-all duration-300"
      >
        {/* 상단 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div 
              className="w-[32px] h-[32px] rounded-[9px] flex items-center justify-center"
              style={{ backgroundColor: iconBg }}
            >
              <Icon size={16} color="#555555" strokeWidth={1.5} />
            </div>
            <span className="text-[11px] font-[600] text-[#555555] ml-[7px]">
              {categoryName}
            </span>
          </div>
          <div className="flex flex-col items-center gap-[2px]">
            <div className="relative flex items-center justify-center w-[7px] h-[7px]">
              {isUrgent && (
                <div 
                  className="absolute w-[7px] h-[7px] rounded-full bg-[#E24B4A] animate-ping" 
                  style={{ animationDuration: '1.5s', opacity: 0.6 }} 
                />
              )}
              <div 
                className="relative z-10 w-[7px] h-[7px] rounded-full"
                style={{ backgroundColor: riskDotColor }}
              />
            </div>
            <span className="text-[8.5px] font-[600] text-[#AAAAAA]">
              {signal.risk}
            </span>
          </div>
        </div>

        {/* 중단 */}
        <div className="flex-1 mt-[12px] mb-[12px] flex flex-col">
          <h3 className="text-[13px] font-[700] text-[#1A1A1A] leading-[1.4] line-clamp-2 h-[36px]">
            {signal.title}
          </h3>
          {signal.summary && (
            <p className="text-[11px] text-[#888888] leading-[1.5] mt-[6px] line-clamp-1 h-[16px]">
              {signal.summary}
            </p>
          )}
        </div>

        {/* 하단 */}
        <div className="mt-auto pt-[8px] border-t-[0.5px] border-[#F5F5F5] flex items-center justify-between">
          <span className="text-[10px] text-[#BBBBBB]">
            {signal.region ? `${signal.region} · ` : ''}{signal.date}
          </span>
          <span className="text-[10px] font-[700] text-[#E8521A]">
            상세 →
          </span>
        </div>
      </div>
    </>
  );
}