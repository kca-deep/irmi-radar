"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  Target01Icon,
  News01Icon,
} from "@hugeicons/core-free-icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ActionGuideSection } from "@/components/signals/action-guide-section";
import { SEVERITY_LABEL_MAP } from "@/lib/constants";
import { SEVERITY_COLOR_MAP, CATEGORY_ICON_MAP } from "@/lib/icon-maps";
import { cn } from "@/lib/utils";

import type { Signal, Policy } from "@/lib/types";

interface SignalDetailDialogProps {
  signal: Signal | null;
  policies: Policy[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignalDetailDialog({
  signal,
  policies,
  open,
  onOpenChange,
}: SignalDetailDialogProps) {
  if (!signal) return null;

  const severityColor = SEVERITY_COLOR_MAP[signal.severity];
  const severityLabel = SEVERITY_LABEL_MAP[signal.severity];
  const categoryIcon = CATEGORY_ICON_MAP[signal.category];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] sm:max-w-3xl max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-4">
          {/* 배지들 */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge
              className={cn(
                "text-xs font-medium",
                severityColor === "danger" &&
                  "bg-danger text-danger-foreground",
                severityColor === "warning" &&
                  "bg-warning text-warning-foreground",
                severityColor === "caution" &&
                  "bg-caution text-caution-foreground",
                severityColor === "safe" && "bg-safe text-safe-foreground"
              )}
            >
              {severityLabel}
            </Badge>
            <Badge variant="secondary" className="gap-1 text-xs">
              <HugeiconsIcon icon={categoryIcon} size={12} strokeWidth={2} />
              {signal.categoryLabel}
            </Badge>
            {signal.region && (
              <Badge variant="outline" className="text-xs">
                {signal.region}
              </Badge>
            )}
          </div>
          <DialogTitle className="text-lg font-semibold text-left">
            {signal.title}
          </DialogTitle>
          <DialogDescription className="text-left">
            {signal.description}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="px-6 pb-6 space-y-6">
            {/* 근거 목록 */}
            <div>
              <h4 className="flex items-center gap-2 font-semibold text-sm mb-3">
                <HugeiconsIcon
                  icon={News01Icon}
                  size={16}
                  strokeWidth={2}
                  className="text-muted-foreground"
                />
                감지 근거
              </h4>
              <ul className="space-y-2">
                {signal.evidence.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            {/* 원인 분석 + 영향 범위 (2컬럼) */}
            <div className="grid gap-6 sm:grid-cols-2">
              {/* 원인 분석 */}
              <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                <h4 className="flex items-center gap-2 font-semibold text-sm mb-2">
                  <HugeiconsIcon
                    icon={AlertCircleIcon}
                    size={16}
                    strokeWidth={2}
                    className="text-warning"
                  />
                  원인 분석
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {signal.analysis.cause}
                </p>
              </div>

              {/* 영향 범위 */}
              <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                <h4 className="flex items-center gap-2 font-semibold text-sm mb-2">
                  <HugeiconsIcon
                    icon={Target01Icon}
                    size={16}
                    strokeWidth={2}
                    className="text-danger"
                  />
                  영향 범위
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {signal.analysis.impact}
                </p>
              </div>
            </div>

            <Separator />

            {/* 대응 가이드 + 정책 연결 */}
            <ActionGuideSection signal={signal} policies={policies} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
