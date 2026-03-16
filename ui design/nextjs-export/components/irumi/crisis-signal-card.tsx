"use client";

/**
 * crisis-signal-card.tsx
 * 변환 포인트:
 *   - lucide-react 아이콘 → @hugeicons/react 로 교체
 *     (Building01Icon, Briefcase01Icon, ShoppingCart01Icon, BankIcon, Store01Icon)
 *   - 색상 클래스 → CSS 변수 토큰
 *   - props 인터페이스: CrisisSignalItem (lib/irumi/types.ts)
 */

import type { CrisisSignalItem } from "@/lib/irumi/types";
import {
  Building01Icon,
  Briefcase01Icon,
  ShoppingCart01Icon,
  BankIcon,
  Store01Icon,
} from "@hugeicons/react";
// ↑ @hugeicons/react 패키지 설치 후 실제 아이콘 이름을 확인하세요.
//   Building01Icon → 부동산, Briefcase01Icon → 고용, ShoppingCart01Icon → 물가,
//   BankIcon → 금융, Store01Icon → 자영업

type AnyIcon = React.ElementType;

interface CrisisSignalCardProps {
  signal: CrisisSignalItem;
  onClick?: () => void;
}

export function CrisisSignalCard({ signal, onClick }: CrisisSignalCardProps) {
  const categoryName = signal.category.replace(/[^가-힣a-zA-Z]/g, "").trim();

  let Icon: AnyIcon = Building01Icon;
  let iconBg = "#EDF7ED";

  if (categoryName.includes("부동산")) { Icon = Building01Icon; iconBg = "#EDF7ED"; }
  else if (categoryName.includes("고용"))  { Icon = Briefcase01Icon; iconBg = "#EDF2FF"; }
  else if (categoryName.includes("물가"))  { Icon = ShoppingCart01Icon; iconBg = "#FFF8E1"; }
  else if (categoryName.includes("금융"))  { Icon = BankIcon; iconBg = "#E8F4FE"; }
  else if (categoryName.includes("자영업")){ Icon = Store01Icon; iconBg = "#FFF0F0"; }

  const riskDotColor =
    signal.risk === "긴급" ? "var(--irumi-urgent)"  :
    signal.risk === "주의" ? "var(--irumi-caution)" :
    signal.risk === "관찰" ? "var(--irumi-watch)"   : "var(--irumi-safe)";

  const isUrgent = signal.risk === "긴급";

  return (
    <div
      onClick={onClick}
      className="bg-card rounded-[14px] shadow-[var(--irumi-shadow-card)] p-[16px] flex flex-col h-full cursor-pointer hover:shadow-[var(--irumi-shadow-card-lg)] hover:-translate-y-[2px] transition-all duration-300"
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
          <span className="text-[11px] font-[600] text-[var(--irumi-text-2)] ml-[7px]">
            {categoryName}
          </span>
        </div>

        <div className="flex flex-col items-center gap-[2px]">
          <div className="relative flex items-center justify-center w-[7px] h-[7px]">
            {isUrgent && (
              <div
                className="absolute w-[7px] h-[7px] rounded-full bg-irumi-urgent animate-ping"
                style={{ animationDuration: "1.5s", opacity: 0.6 }}
              />
            )}
            <div
              className="relative z-10 w-[7px] h-[7px] rounded-full"
              style={{ backgroundColor: riskDotColor }}
            />
          </div>
          <span className="text-[8.5px] font-[600] text-[var(--irumi-text-3)]">
            {signal.risk}
          </span>
        </div>
      </div>

      {/* 중단 */}
      <div className="flex-1 mt-[12px] mb-[12px] flex flex-col">
        <h3 className="text-[13px] font-[700] text-[var(--irumi-text-1)] leading-[1.4] line-clamp-2 h-[36px]">
          {signal.title}
        </h3>
        {signal.summary && (
          <p className="text-[11px] text-[var(--irumi-text-3)] leading-[1.5] mt-[6px] line-clamp-1 h-[16px]">
            {signal.summary}
          </p>
        )}
      </div>

      {/* 하단 */}
      <div className="mt-auto pt-[8px] border-t-[0.5px] border-irumi-line flex items-center justify-between">
        <span className="text-[10px] text-[#BBBBBB]">
          {signal.region ? `${signal.region} · ` : ""}
          {signal.date}
        </span>
        <span className="text-[10px] font-[700] text-irumi-caution">상세 →</span>
      </div>
    </div>
  );
}
