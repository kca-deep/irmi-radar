"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  Alert02Icon,
  ArrowUpRight01Icon,
} from "@hugeicons/core-free-icons";

import type { SignalStats as SignalStatsType } from "@/lib/types";

interface SignalStatsProps {
  stats: SignalStatsType;
}

const STAT_ROWS = [
  {
    key: "critical" as const,
    label: "긴급 신호",
    icon: AlertCircleIcon,
    colorClass: "text-danger",
  },
  {
    key: "warning" as const,
    label: "주의 신호",
    icon: Alert02Icon,
    colorClass: "text-warning",
  },
  {
    key: "surging" as const,
    label: "급상승 이슈",
    icon: ArrowUpRight01Icon,
    colorClass: "text-caution",
  },
];

export function SignalStats({ stats }: SignalStatsProps) {
  return (
    <div className="flex flex-col gap-3">
      {STAT_ROWS.map((row) => (
        <div
          key={row.key}
          className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
        >
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              icon={row.icon}
              size={16}
              strokeWidth={2}
              className={row.colorClass}
            />
            <span className="text-xs font-medium text-muted-foreground">
              {row.label}
            </span>
          </div>
          <span className={`text-sm font-bold tabular-nums ${row.colorClass}`}>
            {stats[row.key]}
          </span>
        </div>
      ))}
    </div>
  );
}
