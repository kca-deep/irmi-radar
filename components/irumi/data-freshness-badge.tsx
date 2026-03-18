"use client";

import type { DataFreshnessInfo } from "@/lib/irumi/types";

interface DataFreshnessBadgeProps {
  freshness?: DataFreshnessInfo;
}

const LEVEL_CONFIG = {
  fresh: {
    dotColor: "bg-[#5DAA30]",
    label: "최신 분석",
    textColor: "text-[#5DAA30]",
  },
  aging: {
    dotColor: "bg-[#FFAA00]",
    label: "갱신 권장",
    textColor: "text-[#FFAA00]",
  },
  stale: {
    dotColor: "bg-[#E24B4A]",
    label: "재분석 필요",
    textColor: "text-[#E24B4A]",
  },
} as const;

const SOURCE_LABEL: Record<string, string> = {
  snapshot: "AI 분석",
  cache: "캐시",
  computed: "기사 기반 추정",
  mock: "샘플 데이터",
};

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

export function DataFreshnessBadge({ freshness }: DataFreshnessBadgeProps) {
  if (!freshness) return null;

  const config = LEVEL_CONFIG[freshness.level];
  const sourceLabel = SOURCE_LABEL[freshness.source] ?? freshness.source;
  const relativeTime = formatRelativeTime(freshness.lastAnalyzedAt);

  return (
    <div className="flex items-center gap-2 text-[11px]">
      <div className="flex items-center gap-1.5">
        <div className={`w-[6px] h-[6px] rounded-full ${config.dotColor} animate-pulse`} />
        <span className={`font-semibold ${config.textColor}`}>
          {config.label}
        </span>
      </div>
      <span className="text-[#AAAAAA]">
        {sourceLabel} | {relativeTime}
      </span>
    </div>
  );
}
