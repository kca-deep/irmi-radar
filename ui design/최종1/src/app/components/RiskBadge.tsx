import React from 'react';

const styles = {
  긴급: "bg-[#E24B4A] text-white",
  주의: "bg-[#E8521A] text-white", 
  관찰: "bg-[#FFAA00] text-white",
  안전: "bg-[#5DAA30] text-white",
};

export type RiskGrade = keyof typeof styles;

interface RiskBadgeProps {
  grade: RiskGrade | string;
  score?: number | string;
  className?: string;
}

export function RiskBadge({ grade, score, className = "" }: RiskBadgeProps) {
  const badgeStyle = styles[grade as RiskGrade] || "bg-[#F5F5F5] text-[#888888]";

  if (score !== undefined) {
    return (
      <span className={`${badgeStyle} text-xs font-bold px-2.5 py-1 rounded-md ${className}`.trim()}>
        {grade} {score}
      </span>
    );
  }

  return (
    <span className={`${badgeStyle} text-xs font-bold px-2.5 py-1 rounded-md ${className}`.trim()}>
      {grade}
    </span>
  );
}