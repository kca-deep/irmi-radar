"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { AiBrain01Icon } from "@hugeicons/core-free-icons";
import { TypingMarkdownText } from "@/components/dashboard/typing-markdown-text";
import { CATEGORY_ICON_MAP } from "@/lib/icon-maps";
import { CATEGORY_LABEL_MAP } from "@/lib/constants";
import { parseMarkdown } from "@/lib/parse-markdown";
import { cn } from "@/lib/utils";

import type { BriefingData } from "@/lib/types";

interface AiBriefingPanelProps {
  briefing: BriefingData;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function RichText({ text }: { text: string }) {
  const segments = parseMarkdown(text);
  return (
    <>
      {segments.map((seg, i) => (
        <span
          key={i}
          className={cn(seg.bold && "font-semibold text-emphasis")}
        >
          {seg.text}
        </span>
      ))}
    </>
  );
}

export function AiBriefingPanel({ briefing }: AiBriefingPanelProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={AiBrain01Icon}
            size={16}
            strokeWidth={2}
            className="text-primary"
          />
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            오늘의 민생 브리핑
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {formatTime(briefing.generatedAt)} 생성
        </span>
      </div>

      {/* Summary with typing effect + markdown bold */}
      <p className="text-xs leading-relaxed">
        <TypingMarkdownText text={briefing.summary} speed={15} />
      </p>

      {/* Highlights */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {briefing.highlights.map((highlight) => (
          <div
            key={highlight.category}
            className="flex items-start gap-2 rounded-lg bg-muted/50 p-3"
          >
            <HugeiconsIcon
              icon={CATEGORY_ICON_MAP[highlight.category]}
              size={14}
              strokeWidth={2}
              className="mt-0.5 shrink-0 text-muted-foreground"
            />
            <div>
              <span className="text-[10px] font-medium text-muted-foreground">
                {CATEGORY_LABEL_MAP[highlight.category]}
              </span>
              <p className="mt-0.5 text-xs leading-relaxed text-foreground">
                {highlight.message}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Recommendation */}
      <div className="mt-4 border-t border-border/50 pt-3">
        <p className="text-xs italic leading-relaxed text-muted-foreground">
          <RichText text={briefing.recommendation} />
        </p>
      </div>
    </div>
  );
}
