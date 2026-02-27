"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { SignalMiniCard } from "./signal-mini-card";
import { CATEGORY_LABEL_MAP } from "@/lib/constants";

import type { SignalPreview, SignalStats, CategoryKey } from "@/lib/types";

interface SignalSidebarProps {
  signals: SignalPreview[];
  stats: SignalStats;
  selectedCategory: CategoryKey | null;
  selectedChainName: string | null;
}

const STAT_ITEMS: {
  key: keyof SignalStats;
  label: string;
  colorClass: string;
}[] = [
  { key: "critical", label: "긴급", colorClass: "text-danger" },
  { key: "warning", label: "주의", colorClass: "text-warning" },
  { key: "caution", label: "관찰", colorClass: "text-caution" },
];

export function SignalSidebar({
  signals,
  stats,
  selectedCategory,
  selectedChainName,
}: SignalSidebarProps) {
  const displayedSignals = signals.slice(0, 3);
  const hasMore = signals.length > 3;

  // Generate header text based on selection context
  const getHeaderText = () => {
    if (selectedChainName) {
      return `${selectedChainName} 관련 신호`;
    }
    if (selectedCategory) {
      return `${CATEGORY_LABEL_MAP[selectedCategory]} 관련 신호`;
    }
    return "최근 위기 신호";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-semibold text-foreground">
            {getHeaderText()}
          </h4>
          <span className="text-[10px] text-muted-foreground">
            {signals.length}건
          </span>
        </div>
      </div>

      {/* Stats badges */}
      <div className="flex items-center gap-2 mb-3">
        {STAT_ITEMS.map((item) => (
          <span
            key={item.key}
            className={`text-[10px] ${item.colorClass}`}
          >
            {item.label}
            <span className="font-bold ml-0.5">{stats[item.key]}</span>
          </span>
        ))}
      </div>

      {/* Signal list */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {displayedSignals.length > 0 ? (
          displayedSignals.map((signal) => (
            <SignalMiniCard key={signal.id} signal={signal} />
          ))
        ) : (
          <div className="flex items-center justify-center h-20 text-[11px] text-muted-foreground">
            해당 조건의 신호가 없습니다
          </div>
        )}
      </div>

      {/* View all link */}
      {hasMore && (
        <Link
          href="/signals"
          className="flex items-center justify-center gap-1 mt-3 pt-2 border-t border-border/50 text-[10px] text-primary hover:text-primary/80 transition-colors"
        >
          전체 신호 보기
          <HugeiconsIcon icon={ArrowRight01Icon} size={12} strokeWidth={2} />
        </Link>
      )}
    </div>
  );
}
