"use client";

import { useMemo, useState, useCallback } from "react";
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

const PADDING = { top: 24, right: 32, bottom: 20, left: 24 };
const WIDTH = 400;
const HEIGHT = 160;

export function ScoreTrendChart({ history }: ScoreTrendChartProps) {
  const { period } = usePeriod();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const data = useMemo(() => {
    const days = PERIOD_DAYS[period] ?? 7;
    return history.slice(-days);
  }, [history, period]);

  const { points, areaPath, linePath, latestScore, chartBottom } =
    useMemo(() => {
      if (data.length === 0) {
        return {
          points: [],
          areaPath: "",
          linePath: "",
          latestScore: 0,
          chartBottom: PADDING.top + HEIGHT - PADDING.top - PADDING.bottom,
        };
      }

      const scores = data.map((d) => d.score);
      const min = Math.min(...scores);
      const max = Math.max(...scores);
      const rangeMin = Math.max(0, min - 5);
      const rangeMax = Math.min(100, max + 5);
      const range = rangeMax - rangeMin || 1;

      const chartW = WIDTH - PADDING.left - PADDING.right;
      const chartH = HEIGHT - PADDING.top - PADDING.bottom;

      const pts = data.map((d, i) => ({
        x: PADDING.left + (i / Math.max(data.length - 1, 1)) * chartW,
        y: PADDING.top + (1 - (d.score - rangeMin) / range) * chartH,
        date: d.date,
        score: d.score,
      }));

      // Smooth line path (catmull-rom to cubic bezier)
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

      const bottomY = PADDING.top + chartH;
      const aPath = `${lPath} L ${pts[pts.length - 1].x} ${bottomY} L ${pts[0].x} ${bottomY} Z`;

      return {
        points: pts,
        areaPath: aPath,
        linePath: lPath,
        latestScore: scores[scores.length - 1],
        chartBottom: bottomY,
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

  // Find nearest point from mouse position
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (points.length === 0) return;
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * WIDTH;

      let closest = 0;
      let minDist = Infinity;
      for (let i = 0; i < points.length; i++) {
        const dist = Math.abs(points[i].x - mouseX);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      }
      setHoveredIndex(closest);
    },
    [points]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  if (data.length === 0) return null;

  const isLastPoint = hoveredIndex === points.length - 1;
  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;
  const hoveredSeverity = hoveredPoint
    ? SEVERITY_COLOR_MAP[getSeverityByScore(hoveredPoint.score)]
    : colorToken;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
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

        {/* Latest point dot (always visible) */}
        {points.length > 0 && hoveredIndex === null && (
          <>
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r={4}
              className={cn(DOT_CLASS[colorToken])}
            />
            <text
              x={points[points.length - 1].x}
              y={points[points.length - 1].y - 10}
              textAnchor="middle"
              className={cn("text-[11px] font-bold", TEXT_CLASS[colorToken])}
            >
              {latestScore}
            </text>
          </>
        )}

        {/* Hover tooltip */}
        {hoveredPoint && (
          <>
            {/* Vertical guide line */}
            <line
              x1={hoveredPoint.x}
              y1={PADDING.top}
              x2={hoveredPoint.x}
              y2={chartBottom}
              stroke="var(--muted-foreground)"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.5}
            />

            {/* Hovered dot */}
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r={5}
              className={cn(DOT_CLASS[hoveredSeverity])}
            />
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r={3}
              fill="var(--background)"
            />

            {/* Score label */}
            <text
              x={hoveredPoint.x}
              y={hoveredPoint.y - 12}
              textAnchor="middle"
              className={cn(
                "text-[11px] font-bold",
                TEXT_CLASS[hoveredSeverity]
              )}
            >
              {hoveredPoint.score}
            </text>

            {/* Date label at bottom (highlight) */}
            <text
              x={hoveredPoint.x}
              y={156}
              textAnchor="middle"
              className="fill-foreground text-[9px] font-semibold"
            >
              {hoveredPoint.date}
            </text>
          </>
        )}

        {/* Date labels (dimmed when hovering) */}
        {labelIndices.map((idx) => {
          const pt = points[idx];
          if (!pt) return null;
          // Hide the label if hovered tooltip date is nearby
          if (hoveredPoint && Math.abs(pt.x - hoveredPoint.x) < 20) {
            return null;
          }
          return (
            <text
              key={idx}
              x={pt.x}
              y={156}
              textAnchor="middle"
              className={cn(
                "fill-muted-foreground text-[9px]",
                hoveredIndex !== null && "opacity-40"
              )}
            >
              {pt.date}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
