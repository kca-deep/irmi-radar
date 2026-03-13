"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { AiBrain01Icon, BulbIcon } from "@hugeicons/core-free-icons";
import { TypingMarkdownText } from "@/components/dashboard/typing-markdown-text";
import { parseMarkdown } from "@/lib/parse-markdown";
import { cn } from "@/lib/utils";

import type { BriefingData } from "@/lib/types";

interface BriefingCompactProps {
  briefing: BriefingData;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function RichText({ text }: { text: string }) {
  if (!text) return null;
  const segments = parseMarkdown(text);
  return (
    <>
      {segments.map((seg, i) => (
        <span
          key={i}
          className={cn(
            seg.bold && "font-semibold text-emphasis",
            seg.highlight && "bg-highlight text-highlight-foreground rounded-sm px-0.5 py-px",
          )}
        >
          {seg.text}
        </span>
      ))}
    </>
  );
}

export function BriefingCompact({ briefing }: BriefingCompactProps) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card shadow-sm p-5">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={AiBrain01Icon}
            size={18}
            strokeWidth={2}
            className="text-briefing-accent"
          />
          <h3 className="text-sm font-semibold text-foreground">
            민생 브리핑
          </h3>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-briefing-accent/10 text-briefing-accent font-medium">
          {formatTime(briefing.generatedAt)} 생성
        </span>
      </div>

      {/* Summary */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <p className="text-xs leading-relaxed">
          <TypingMarkdownText text={briefing.summary} speed={15} />
        </p>
      </div>

      {/* Key Risks */}
      {briefing.highlights.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {briefing.highlights.slice(0, 3).map((hl, i) => (
            <div
              key={i}
              className="rounded-md bg-muted/50 px-3 py-1.5 text-[11px] leading-snug text-muted-foreground"
            >
              <RichText text={hl.message} />
            </div>
          ))}
        </div>
      )}

      {/* Recommendation */}
      <div className="mt-3 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/8 px-3 py-2">
        <HugeiconsIcon
          icon={BulbIcon}
          size={13}
          strokeWidth={2}
          className="mt-0.5 shrink-0 text-warning"
        />
        <p className="min-w-0 text-[11px] leading-relaxed text-foreground">
          <RichText text={briefing.recommendation} />
        </p>
      </div>
    </div>
  );
}
