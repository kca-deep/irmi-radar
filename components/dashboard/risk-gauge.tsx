"use client";

import { useEffect, useState } from "react";
import { getSeverityByScore, SEVERITY_LABEL_MAP } from "@/lib/constants";
import { SEVERITY_COLOR_MAP } from "@/lib/icon-maps";
import { cn } from "@/lib/utils";

interface RiskGaugeProps {
  score: number;
}

const RADIUS = 56;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Tailwind purge 대응: 정적 클래스 매핑
const STROKE_CLASS: Record<string, string> = {
  danger: "stroke-danger",
  warning: "stroke-warning",
  caution: "stroke-caution",
  safe: "stroke-safe",
};

const FILL_CLASS: Record<string, string> = {
  danger: "fill-danger",
  warning: "fill-warning",
  caution: "fill-caution",
  safe: "fill-safe",
};

const GLOW_CLASS: Record<string, string> = {
  danger: "drop-shadow-[0_0_20px_oklch(0.704_0.191_22.216/0.35)]",
  warning: "drop-shadow-[0_0_20px_oklch(0.795_0.184_60.0/0.35)]",
  caution: "drop-shadow-[0_0_20px_oklch(0.852_0.17_88.0/0.3)]",
  safe: "drop-shadow-[0_0_20px_oklch(0.696_0.17_152.0/0.35)]",
};

const TRACK_CLASS: Record<string, string> = {
  danger: "stroke-danger/10",
  warning: "stroke-warning/10",
  caution: "stroke-caution/10",
  safe: "stroke-safe/10",
};

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
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 140 140"
        className={cn("size-44", GLOW_CLASS[colorToken])}
        aria-label={`종합 리스크 점수 ${score}점, ${label} 등급`}
      >
        {/* Track with severity tint */}
        <circle
          cx="70"
          cy="70"
          r={RADIUS}
          fill="none"
          className={cn("stroke-muted", TRACK_CLASS[colorToken])}
          strokeWidth="10"
        />
        {/* Indicator arc */}
        <circle
          cx="70"
          cy="70"
          r={RADIUS}
          fill="none"
          className={STROKE_CLASS[colorToken]}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
        {/* Score text */}
        <text
          x="70"
          y="62"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-foreground"
          style={{ fontSize: "36px", fontWeight: 800, letterSpacing: "-1px" }}
        >
          {score}
        </text>
        {/* Severity label */}
        <text
          x="70"
          y="92"
          textAnchor="middle"
          dominantBaseline="central"
          className={FILL_CLASS[colorToken]}
          style={{ fontSize: "13px", fontWeight: 600 }}
        >
          {label}
        </text>
      </svg>
    </div>
  );
}
