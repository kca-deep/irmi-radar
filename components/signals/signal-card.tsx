"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar03Icon, News01Icon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SEVERITY_LABEL_MAP, CATEGORY_LABEL_MAP } from "@/lib/constants";
import { CATEGORY_ICON_MAP } from "@/lib/icon-maps";
import { cn } from "@/lib/utils";

import type { Signal } from "@/lib/types";

interface SignalCardProps {
  signal: Signal;
  onViewDetail: (signal: Signal) => void;
}

// Tailwind purge 대응: 정적 클래스 매핑
const BG_CLASS: Record<string, string> = {
  critical: "bg-danger/5 hover:bg-danger/10",
  warning: "bg-warning/5 hover:bg-warning/10",
  caution: "bg-caution/5 hover:bg-caution/10",
  safe: "bg-safe/5 hover:bg-safe/10",
};

const BADGE_CLASS: Record<string, string> = {
  critical: "bg-danger text-danger-foreground",
  warning: "bg-warning text-warning-foreground",
  caution: "bg-caution text-caution-foreground",
  safe: "bg-safe text-safe-foreground",
};

const GLOW_CLASS: Record<string, string> = {
  critical: "hover:shadow-[0_4px_16px_oklch(0.704_0.191_22.216/0.15)]",
  warning: "hover:shadow-[0_4px_16px_oklch(0.795_0.184_60.0/0.15)]",
  caution: "hover:shadow-[0_4px_16px_oklch(0.852_0.17_88.0/0.12)]",
  safe: "hover:shadow-[0_4px_16px_oklch(0.696_0.17_152.0/0.15)]",
};

export function SignalCard({ signal, onViewDetail }: SignalCardProps) {
  const severityLabel = SEVERITY_LABEL_MAP[signal.severity];
  const categoryLabel = CATEGORY_LABEL_MAP[signal.category];
  const categoryIcon = CATEGORY_ICON_MAP[signal.category];

  // 날짜 포맷
  const formattedDate = new Date(signal.detectedAt).toLocaleDateString(
    "ko-KR",
    {
      month: "short",
      day: "numeric",
    }
  );

  return (
    <div
      className={cn(
        "cursor-pointer rounded-lg border border-border/50 p-4",
        "transition-all duration-200 ease-out",
        "hover:-translate-y-0.5",
        BG_CLASS[signal.severity],
        GLOW_CLASS[signal.severity]
      )}
      onClick={() => onViewDetail(signal)}
    >
      {/* 상단: 등급 + 카테고리 + 지역 */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
        <Badge
          variant="secondary"
          className={cn("text-[10px]", BADGE_CLASS[signal.severity])}
        >
          {severityLabel}
        </Badge>
        <Badge variant="outline" className="gap-1 text-[10px]">
          <HugeiconsIcon icon={categoryIcon} size={10} strokeWidth={2} />
          {categoryLabel}
        </Badge>
        {signal.region && (
          <span className="text-[10px] text-muted-foreground">
            {signal.region}
          </span>
        )}
      </div>

      {/* 중단: 제목 + 설명 */}
      <h3 className="text-xs font-semibold leading-relaxed text-foreground line-clamp-2 mb-1.5">
        {signal.title}
      </h3>
      <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2 mb-3">
        {signal.description}
      </p>

      {/* 하단: 관련 기사 + 감지일 + 버튼 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <HugeiconsIcon icon={News01Icon} size={12} strokeWidth={2} />
            {signal.relatedArticleCount}건
          </span>
          <span className="flex items-center gap-1">
            <HugeiconsIcon icon={Calendar03Icon} size={12} strokeWidth={2} />
            {formattedDate}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-[10px] h-6 px-2"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetail(signal);
          }}
        >
          상세 분석
        </Button>
      </div>
    </div>
  );
}
