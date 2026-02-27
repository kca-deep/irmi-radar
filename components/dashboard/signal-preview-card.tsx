"use client";

import { Badge } from "@/components/ui/badge";
import { SEVERITY_LABEL_MAP, CATEGORY_LABEL_MAP } from "@/lib/constants";
import { cn } from "@/lib/utils";

import type { SignalPreview } from "@/lib/types";

interface SignalPreviewCardProps {
  signal: SignalPreview;
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

export function SignalPreviewCard({ signal }: SignalPreviewCardProps) {
  const severityLabel = SEVERITY_LABEL_MAP[signal.severity];
  const categoryLabel = CATEGORY_LABEL_MAP[signal.category];

  return (
    <div
      className={cn(
        "cursor-pointer rounded-lg border border-border/50 px-4 py-3",
        "transition-all duration-200 ease-out",
        "hover:-translate-y-0.5",
        BG_CLASS[signal.severity],
        GLOW_CLASS[signal.severity]
      )}
    >
      <div className="flex items-start gap-2">
        {/* Badges */}
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge
            variant="secondary"
            className={cn("text-[10px]", BADGE_CLASS[signal.severity])}
          >
            {severityLabel}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {categoryLabel}
          </Badge>
        </div>
      </div>

      {/* Title */}
      <p className="mt-1.5 text-xs font-medium leading-relaxed text-foreground">
        {signal.title}
      </p>

      {/* Date */}
      <p className="mt-1 text-[10px] text-muted-foreground">{signal.date}</p>
    </div>
  );
}
