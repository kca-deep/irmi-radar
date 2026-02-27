"use client";

import { useEffect, useState } from "react";
import { getSeverityByScore, SEVERITY_LABEL_MAP } from "@/lib/constants";
import { SEVERITY_COLOR_MAP } from "@/lib/icon-maps";

interface RiskGaugeProps {
  score: number;
}

const RADIUS = 56;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function RiskGauge({ score }: RiskGaugeProps) {
  const [offset, setOffset] = useState(CIRCUMFERENCE);

  const severity = getSeverityByScore(score);
  const colorToken = SEVERITY_COLOR_MAP[severity];
  const label = SEVERITY_LABEL_MAP[severity];

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      const progress = Math.min(Math.max(score, 0), 100) / 100;
      setOffset(CIRCUMFERENCE * (1 - progress));
    });
    return () => cancelAnimationFrame(timer);
  }, [score]);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        viewBox="0 0 140 140"
        className="size-32"
        aria-label={`종합 리스크 점수 ${score}점, ${label} 등급`}
      >
        {/* Track */}
        <circle
          cx="70"
          cy="70"
          r={RADIUS}
          fill="none"
          className="stroke-muted"
          strokeWidth="8"
        />
        {/* Indicator */}
        <circle
          cx="70"
          cy="70"
          r={RADIUS}
          fill="none"
          className={`stroke-${colorToken}`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
        {/* Score text */}
        <text
          x="70"
          y="64"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-foreground text-3xl font-bold"
          style={{ fontSize: "32px", fontWeight: 700 }}
        >
          {score}
        </text>
        {/* Severity label */}
        <text
          x="70"
          y="90"
          textAnchor="middle"
          dominantBaseline="central"
          className={`fill-${colorToken} text-xs font-medium`}
          style={{ fontSize: "12px", fontWeight: 500 }}
        >
          {label}
        </text>
      </svg>
    </div>
  );
}
