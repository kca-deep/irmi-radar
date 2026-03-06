"use client";

import { CATEGORIES } from "@/lib/constants";
import { CATEGORY_ICON_MAP } from "@/lib/icon-maps";
import { HugeiconsIcon } from "@hugeicons/react";

import type { CategoryKey, CategoryScoreHistoryEntry } from "@/lib/types";

interface MiniScoreSparklineProps {
  history: CategoryScoreHistoryEntry[];
}

const LINE_COLORS: Record<CategoryKey, string> = {
  prices: "var(--chart-1)",
  employment: "var(--chart-2)",
  selfEmployed: "var(--warning)",
  finance: "var(--chart-3)",
  realEstate: "var(--chart-4)",
};

const LEGEND_CLASS: Record<CategoryKey, string> = {
  prices: "bg-chart-1",
  employment: "bg-chart-2",
  selfEmployed: "bg-warning",
  finance: "bg-chart-3",
  realEstate: "bg-chart-4",
};

const WIDTH = 200;
const HEIGHT = 48;
const PADDING_X = 4;
const PADDING_Y = 4;

function buildPath(
  history: CategoryScoreHistoryEntry[],
  key: CategoryKey
): string {
  if (history.length === 0) return "";

  const minY = 0;
  const maxY = 100;
  const xStep = (WIDTH - PADDING_X * 2) / Math.max(history.length - 1, 1);

  return history
    .map((entry, i) => {
      const x = PADDING_X + i * xStep;
      const y =
        HEIGHT -
        PADDING_Y -
        ((entry[key] - minY) / (maxY - minY)) * (HEIGHT - PADDING_Y * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function MiniScoreSparkline({ history }: MiniScoreSparklineProps) {
  const categoryKeys = CATEGORIES.map((c) => c.key);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-muted-foreground">
          7일 추이
        </span>
        <div className="flex items-center gap-2">
          {CATEGORIES.map((cat) => (
            <div key={cat.key} className="flex items-center gap-1">
              <span className={`size-1.5 rounded-full ${LEGEND_CLASS[cat.key]}`} />
              <span className="text-[9px] text-muted-foreground">
                {cat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        {[25, 50, 75].map((v) => {
          const y =
            HEIGHT -
            PADDING_Y -
            ((v - 0) / 100) * (HEIGHT - PADDING_Y * 2);
          return (
            <line
              key={v}
              x1={PADDING_X}
              y1={y}
              x2={WIDTH - PADDING_X}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeWidth={0.5}
            />
          );
        })}
        {/* Category lines */}
        {categoryKeys.map((key) => (
          <path
            key={key}
            d={buildPath(history, key)}
            fill="none"
            stroke={LINE_COLORS[key]}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {/* End dots */}
        {history.length > 0 &&
          categoryKeys.map((key) => {
            const last = history[history.length - 1];
            const x =
              PADDING_X +
              (history.length - 1) *
                ((WIDTH - PADDING_X * 2) / Math.max(history.length - 1, 1));
            const y =
              HEIGHT -
              PADDING_Y -
              ((last[key] - 0) / 100) * (HEIGHT - PADDING_Y * 2);
            return (
              <circle
                key={key}
                cx={x}
                cy={y}
                r={2}
                fill={LINE_COLORS[key]}
              />
            );
          })}
      </svg>
    </div>
  );
}
