/**
 * risk-badge.tsx
 * 위험 등급 뱃지 컴포넌트 — 순수 표시용, "use client" 불필요.
 */

import type { RiskGrade } from "@/lib/irumi/types";

const styles: Record<RiskGrade, string> = {
  긴급: "bg-irumi-urgent text-white",
  주의: "bg-irumi-caution text-white",
  관찰: "bg-irumi-watch text-white",
  안전: "bg-irumi-safe text-white",
};

interface RiskBadgeProps {
  grade: RiskGrade | string;
  score?: number | string;
  className?: string;
}

export function RiskBadge({ grade, score, className = "" }: RiskBadgeProps) {
  const badgeStyle =
    styles[grade as RiskGrade] ?? "bg-[#F5F5F5] text-[var(--irumi-text-3)]";

  const base = `${badgeStyle} text-xs font-bold px-2.5 py-1 rounded-md ${className}`.trim();

  return (
    <span className={base}>
      {grade}
      {score !== undefined && ` ${score}`}
    </span>
  );
}
