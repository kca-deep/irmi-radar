"use client";

import { Badge } from "@/components/ui/badge";
import { SEVERITY_LABEL_MAP, CATEGORY_LABEL_MAP } from "@/lib/constants";
import { cn } from "@/lib/utils";

import type { SignalPreview } from "@/lib/types";

interface SignalMiniCardProps {
  signal: SignalPreview;
}

const BADGE_CLASS: Record<string, string> = {
  critical: "bg-danger text-danger-foreground",
  warning: "bg-warning text-warning-foreground",
  caution: "bg-caution text-caution-foreground",
  safe: "bg-safe text-safe-foreground",
};

const BORDER_CLASS: Record<string, string> = {
  critical: "border-danger/30",
  warning: "border-warning/30",
  caution: "border-caution/30",
  safe: "border-safe/30",
};

export function SignalMiniCard({ signal }: SignalMiniCardProps) {
  const severityLabel = SEVERITY_LABEL_MAP[signal.severity];
  const categoryLabel = CATEGORY_LABEL_MAP[signal.category];

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2",
        "bg-card/50 hover:bg-card",
        "transition-colors cursor-pointer",
        BORDER_CLASS[signal.severity]
      )}
    >
      {/* Header: badges + date */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Badge
            variant="secondary"
            className={cn("text-[9px] px-1.5 py-0", BADGE_CLASS[signal.severity])}
          >
            {severityLabel}
          </Badge>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
            {categoryLabel}
          </Badge>
        </div>
        <span className="text-[9px] text-muted-foreground shrink-0">
          {signal.date}
        </span>
      </div>

      {/* Title */}
      <p className="mt-1.5 text-[11px] font-medium leading-snug text-foreground line-clamp-2">
        {signal.title}
      </p>
    </div>
  );
}
