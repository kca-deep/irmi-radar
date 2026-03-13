"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  Alert02Icon,
  EyeIcon,
} from "@hugeicons/core-free-icons";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";

import type { SignalStats } from "@/lib/types";

interface SignalStatsTileProps {
  stats: SignalStats;
}

const STAT_ITEMS = [
  {
    key: "critical" as const,
    label: "긴급",
    icon: AlertCircleIcon,
    colorClass: "text-danger",
    bgClass: "bg-danger/8",
    borderClass: "border-danger/20",
    ringClass: "ring-danger/20",
  },
  {
    key: "warning" as const,
    label: "주의",
    icon: Alert02Icon,
    colorClass: "text-warning",
    bgClass: "bg-warning/8",
    borderClass: "border-warning/20",
    ringClass: "ring-warning/20",
  },
  {
    key: "caution" as const,
    label: "관찰",
    icon: EyeIcon,
    colorClass: "text-caution",
    bgClass: "bg-caution/8",
    borderClass: "border-caution/20",
    ringClass: "ring-caution/20",
  },
];

function StatItem({
  item,
  value,
}: {
  item: (typeof STAT_ITEMS)[number];
  value: number;
}) {
  const animatedValue = useCountUp(value, 800);
  const hasValue = value > 0;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border px-3 py-3 transition-all",
        hasValue ? item.bgClass : "bg-muted/30",
        hasValue ? item.borderClass : "border-border/50",
      )}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <HugeiconsIcon
          icon={item.icon}
          size={13}
          strokeWidth={2}
          className={hasValue ? item.colorClass : "text-muted-foreground/50"}
        />
        <span className={cn(
          "text-[10px] font-medium",
          hasValue ? "text-foreground" : "text-muted-foreground/50"
        )}>
          {item.label}
        </span>
      </div>
      <span
        className={cn(
          "text-2xl font-extrabold tabular-nums leading-none",
          hasValue ? item.colorClass : "text-muted-foreground/30",
        )}
      >
        {animatedValue}
      </span>
    </div>
  );
}

export function SignalStatsTile({ stats }: SignalStatsTileProps) {
  const total = stats.critical + stats.warning + stats.caution;

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          위기 신호
        </span>
        <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
          {total}건 감지
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 flex-1">
        {STAT_ITEMS.map((item) => (
          <StatItem key={item.key} item={item} value={stats[item.key]} />
        ))}
      </div>
    </div>
  );
}
