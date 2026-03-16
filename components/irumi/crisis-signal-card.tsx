"use client";

import type { CrisisSignalItem } from "@/lib/irumi/types";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Building01Icon,
  Briefcase01Icon,
  ShoppingCart01Icon,
  BankIcon,
  Store01Icon,
} from "@hugeicons/core-free-icons";

type IconData = typeof Building01Icon;

interface CrisisSignalCardProps {
  signal: CrisisSignalItem;
  onClick?: () => void;
}

export function CrisisSignalCard({ signal, onClick }: CrisisSignalCardProps) {
  const categoryName = signal.category.replace(/[^가-힣a-zA-Z]/g, "").trim();

  let icon: IconData = Building01Icon;
  let iconBg = "#EDF7ED";

  if (categoryName.includes("부동산")) { icon = Building01Icon; iconBg = "#EDF7ED"; }
  else if (categoryName.includes("고용"))  { icon = Briefcase01Icon; iconBg = "#EDF2FF"; }
  else if (categoryName.includes("물가"))  { icon = ShoppingCart01Icon; iconBg = "#FFF8E1"; }
  else if (categoryName.includes("금융"))  { icon = BankIcon; iconBg = "#E8F4FE"; }
  else if (categoryName.includes("자영업")){ icon = Store01Icon; iconBg = "#FFF0F0"; }

  const riskDotColor =
    signal.risk === "긴급" ? "#E24B4A"  :
    signal.risk === "주의" ? "#E8521A" :
    signal.risk === "관찰" ? "#FFAA00"   : "#5DAA30";

  const isUrgent = signal.risk === "긴급";

  return (
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
            <HugeiconsIcon icon={icon} size={16} color="#555555" strokeWidth={1.5} />
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
                style={{ animationDuration: "1.5s", opacity: 0.6 }}
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
          {signal.region ? `${signal.region} · ` : ""}
          {signal.date}
        </span>
        <span className="text-[10px] font-[700] text-[#E8521A]">상세 →</span>
      </div>
    </div>
  );
}
