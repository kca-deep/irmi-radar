"use client";

import { useMemo } from "react";
import { getSeverityByScore, SEVERITY_LABEL_MAP } from "@/lib/constants";
import { SEVERITY_COLOR_MAP } from "@/lib/icon-maps";
import { cn } from "@/lib/utils";

import type { ScoreHistoryEntry } from "@/lib/types";

interface HeroScoreTileProps {
  score: number;
  lastUpdated: string;
  scoreHistory: ScoreHistoryEntry[];
}

// Tailwind purge: static class maps
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
  danger: "drop-shadow-[0_0_24px_oklch(0.704_0.191_22.216/0.3)]",
  warning: "drop-shadow-[0_0_24px_oklch(0.795_0.184_60.0/0.3)]",
  caution: "drop-shadow-[0_0_24px_oklch(0.852_0.17_88.0/0.25)]",
  safe: "drop-shadow-[0_0_24px_oklch(0.696_0.17_152.0/0.3)]",
};

const TRACK_CLASS: Record<string, string> = {
  danger: "stroke-danger/10",
  warning: "stroke-warning/10",
  caution: "stroke-caution/10",
  safe: "stroke-safe/10",
};

const DELTA_CLASS: Record<string, string> = {
  danger: "text-danger",
  warning: "text-warning",
  caution: "text-caution",
  safe: "text-safe",
};

const BG_CLASS: Record<string, string> = {
  danger: "bg-danger/5 border-danger/20",
  warning: "bg-warning/5 border-warning/20",
  caution: "bg-caution/5 border-caution/20",
  safe: "bg-safe/5 border-safe/20",
};

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Sparkline constants
const SPARK_W = 120;
const SPARK_H = 32;

function buildSparkPath(history: ScoreHistoryEntry[]): string {
  if (history.length < 2) return "";
  const scores = history.map((h) => h.score);
  const min = Math.min(...scores) - 3;
  const max = Math.max(...scores) + 3;
  const range = max - min || 1;

  return history
    .map((h, i) => {
      const x = (i / (history.length - 1)) * SPARK_W;
      const y = SPARK_H - ((h.score - min) / range) * SPARK_H;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function HeroScoreTile({
  score,
  lastUpdated,
  scoreHistory,
}: HeroScoreTileProps) {
  const severity = getSeverityByScore(score);
  const colorToken = SEVERITY_COLOR_MAP[severity];
  const label = SEVERITY_LABEL_MAP[severity];

  const progress = Math.min(Math.max(score, 0), 100) / 100;
  const offset = CIRCUMFERENCE * (1 - progress);

  // Compute delta from previous day
  const delta = useMemo(() => {
    if (scoreHistory.length < 2) return null;
    const prev = scoreHistory[scoreHistory.length - 2].score;
    return score - prev;
  }, [scoreHistory, score]);

  // Recent 7 entries for sparkline
  const recentHistory = useMemo(() => {
    return scoreHistory.slice(-7);
  }, [scoreHistory]);

  const sparkPath = useMemo(() => buildSparkPath(recentHistory), [recentHistory]);

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-xl border p-5 overflow-hidden",
        BG_CLASS[colorToken],
      )}
    >
      {/* Background glow accent */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, var(--${colorToken === "danger" ? "danger" : colorToken === "warning" ? "warning" : colorToken === "caution" ? "caution" : "safe"}) 0%, transparent 70%)`,
          opacity: 0.08,
        }}
      />

      {/* Label */}
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        IRMI 종합지수
      </div>

      {/* Gauge */}
      <svg
        viewBox="0 0 130 130"
        className={cn("size-36", GLOW_CLASS[colorToken])}
        aria-label={`종합 리스크 점수 ${score}점, ${label} 등급`}
      >
        {/* Track */}
        <circle
          cx="65"
          cy="65"
          r={RADIUS}
          fill="none"
          className={cn("stroke-muted", TRACK_CLASS[colorToken])}
          strokeWidth="9"
        />
        {/* Arc */}
        <circle
          cx="65"
          cy="65"
          r={RADIUS}
          fill="none"
          className={STROKE_CLASS[colorToken]}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform="rotate(-90 65 65)"
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
        {/* Score number */}
        <text
          x="65"
          y="58"
          textAnchor="middle"
          dominantBaseline="central"
          className={FILL_CLASS[colorToken]}
          style={{ fontSize: "34px", fontWeight: 800, letterSpacing: "-1px" }}
        >
          {score}
        </text>
        {/* Severity label */}
        <text
          x="65"
          y="86"
          textAnchor="middle"
          dominantBaseline="central"
          className={FILL_CLASS[colorToken]}
          style={{ fontSize: "12px", fontWeight: 600 }}
        >
          {label}
        </text>
      </svg>

      {/* Delta */}
      {delta !== null && (
        <div className={cn("mt-1 flex items-center gap-1 text-xs font-bold tabular-nums", DELTA_CLASS[colorToken])}>
          <span>{delta > 0 ? "+" : ""}{delta}</span>
          <span className="text-[10px] font-normal text-muted-foreground">전일대비</span>
        </div>
      )}

      {/* Sparkline (7-day trend) */}
      {recentHistory.length >= 2 && (
        <div className="mt-3 w-full px-2">
          <svg viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} className="h-8 w-full" preserveAspectRatio="none">
            <path
              d={sparkPath}
              fill="none"
              className={STROKE_CLASS[colorToken]}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.6}
            />
            {/* End dot */}
            {recentHistory.length > 0 && (
              <circle
                cx={SPARK_W}
                cy={SPARK_H - ((recentHistory[recentHistory.length - 1].score - (Math.min(...recentHistory.map(h => h.score)) - 3)) / ((Math.max(...recentHistory.map(h => h.score)) + 3) - (Math.min(...recentHistory.map(h => h.score)) - 3) || 1)) * SPARK_H}
                r={2.5}
                className={FILL_CLASS[colorToken]}
              />
            )}
          </svg>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-muted-foreground">7일 추이</span>
            <span className="text-[9px] text-muted-foreground">{formatDate(lastUpdated)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
