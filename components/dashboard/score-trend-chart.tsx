"use client";

import { useMemo } from "react";
import { usePeriod } from "@/contexts/period-context";
import { getSeverityByScore } from "@/lib/constants";
import { SEVERITY_COLOR_MAP } from "@/lib/icon-maps";
import { cn } from "@/lib/utils";

import type { ScoreHistoryEntry } from "@/lib/types";

interface ScoreTrendChartProps {
  history: ScoreHistoryEntry[];
}

const PERIOD_DAYS: Record<string, number> = {
  "1w": 7,
  "1m": 30,
  "3m": 90,
};

// Tailwind purge: static class maps
const STROKE_CLASS: Record<string, string> = {
  danger: "stroke-danger",
  warning: "stroke-warning",
  caution: "stroke-caution",
  safe: "stroke-safe",
};

const FILL_CLASS: Record<string, string> = {
  danger: "fill-danger/15",
  warning: "fill-warning/15",
  caution: "fill-caution/15",
  safe: "fill-safe/15",
};

const TEXT_CLASS: Record<string, string> = {
  danger: "fill-danger",
  warning: "fill-warning",
  caution: "fill-caution",
  safe: "fill-safe",
};

const DOT_CLASS: Record<string, string> = {
  danger: "fill-danger",
  warning: "fill-warning",
  caution: "fill-caution",
  safe: "fill-safe",
};

export function ScoreTrendChart({ history }: ScoreTrendChartProps) {
  const { period } = usePeriod();

  const data = useMemo(() => {
    const days = PERIOD_DAYS[period] ?? 7;
    return history.slice(-days);
  }, [history, period]);

  const { points, areaPath, linePath, minScore, maxScore, latestScore } =
    useMemo(() => {
      if (data.length === 0) {
        return {
          points: [],
          areaPath: "",
          linePath: "",
          minScore: 0,
          maxScore: 100,
          latestScore: 0,
        };
      }

      const scores = data.map((d) => d.score);
      const min = Math.min(...scores);
      const max = Math.max(...scores);
      // Add padding to range
      const rangeMin = Math.max(0, min - 5);
      const rangeMax = Math.min(100, max + 5);
      const range = rangeMax - rangeMin || 1;

      const padding = { top: 24, right: 32, bottom: 20, left: 24 };
      const width = 400;
      const height = 160;
      const chartW = width - padding.left - padding.right;
      const chartH = height - padding.top - padding.bottom;

      const pts = data.map((d, i) => ({
        x: padding.left + (i / Math.max(data.length - 1, 1)) * chartW,
        y: padding.top + (1 - (d.score - rangeMin) / range) * chartH,
        date: d.date,
        score: d.score,
      }));

      // Smooth line path (using catmull-rom to cubic bezier)
      let lPath = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(pts.length - 1, i + 2)];

        const tension = 0.3;
        const cp1x = p1.x + ((p2.x - p0.x) * tension) / 3;
        const cp1y = p1.y + ((p2.y - p0.y) * tension) / 3;
        const cp2x = p2.x - ((p3.x - p1.x) * tension) / 3;
        const cp2y = p2.y - ((p3.y - p1.y) * tension) / 3;

        lPath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
      }

      // Area path (line path + close to bottom)
      const bottomY = padding.top + chartH;
      const aPath = `${lPath} L ${pts[pts.length - 1].x} ${bottomY} L ${pts[0].x} ${bottomY} Z`;

      return {
        points: pts,
        areaPath: aPath,
        linePath: lPath,
        minScore: rangeMin,
        maxScore: rangeMax,
        latestScore: scores[scores.length - 1],
      };
    }, [data]);

  const severity = getSeverityByScore(latestScore);
  const colorToken = SEVERITY_COLOR_MAP[severity];

  // Pick ~5 date labels evenly spaced
  const labelIndices = useMemo(() => {
    if (points.length <= 5) return points.map((_, i) => i);
    const step = (points.length - 1) / 4;
    return [0, 1, 2, 3, 4].map((i) => Math.round(i * step));
  }, [points]);

  if (data.length === 0) return null;

  return (
    <div className="w-full">
      <svg
        viewBox="0 0 400 160"
        className="h-auto w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Area fill */}
        <path
          d={areaPath}
          className={cn("transition-all duration-500", FILL_CLASS[colorToken])}
        />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "transition-all duration-500",
            STROKE_CLASS[colorToken]
          )}
        />

        {/* Latest point dot */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r={4}
            className={cn(DOT_CLASS[colorToken])}
          />
        )}

        {/* Latest score label */}
        {points.length > 0 && (
          <text
            x={points[points.length - 1].x}
            y={points[points.length - 1].y - 10}
            textAnchor="middle"
            className={cn(
              "text-[11px] font-bold",
              TEXT_CLASS[colorToken]
            )}
          >
            {latestScore}
          </text>
        )}

        {/* Date labels */}
        {labelIndices.map((idx) => {
          const pt = points[idx];
          if (!pt) return null;
          return (
            <text
              key={idx}
              x={pt.x}
              y={156}
              textAnchor="middle"
              className="fill-muted-foreground text-[9px]"
            >
              {pt.date}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
