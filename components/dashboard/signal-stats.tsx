"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  Alert02Icon,
  EyeIcon,
  ArrowUpRight01Icon,
} from "@hugeicons/core-free-icons";

import type { SignalStats as SignalStatsType } from "@/lib/types";

interface SignalStatsProps {
  stats: SignalStatsType;
}

const STAT_ITEMS = [
  {
    key: "critical" as const,
    label: "긴급 신호",
    icon: AlertCircleIcon,
    colorClass: "text-danger",
    bgClass: "bg-danger/5",
  },
  {
    key: "warning" as const,
    label: "주의 신호",
    icon: Alert02Icon,
    colorClass: "text-warning",
    bgClass: "bg-warning/5",
  },
  {
    key: "caution" as const,
    label: "관찰 신호",
    icon: EyeIcon,
    colorClass: "text-caution",
    bgClass: "bg-caution/5",
  },
  {
    key: "surging" as const,
    label: "급상승 이슈",
    icon: ArrowUpRight01Icon,
    colorClass: "text-caution",
    bgClass: "bg-caution/5",
  },
];

export function SignalStats({ stats }: SignalStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {STAT_ITEMS.map((item) => (
        <div
          key={item.key}
          className={`flex flex-col items-center gap-1 rounded-lg px-3 py-3 ${item.bgClass}`}
        >
          <div className="flex items-center gap-1.5">
            <HugeiconsIcon
              icon={item.icon}
              size={14}
              strokeWidth={2}
              className={item.colorClass}
            />
            <span className="text-[10px] font-medium text-muted-foreground">
              {item.label}
            </span>
          </div>
          <span className={`text-xl font-bold tabular-nums ${item.colorClass}`}>
            {stats[item.key]}
          </span>
        </div>
      ))}
    </div>
  );
}
