"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ChartLineData01Icon } from "@hugeicons/core-free-icons";
import { TypingMarkdownText } from "@/components/dashboard/typing-markdown-text";
import { getSeverityByScore } from "@/lib/constants";
import { SEVERITY_COLOR_MAP } from "@/lib/icon-maps";
import { cn } from "@/lib/utils";

import type { ForecastData } from "@/lib/types";

interface ForecastPanelProps {
  forecast: ForecastData;
}

// Tailwind purge 대응: 정적 클래스 매핑
const SCORE_TEXT_CLASS: Record<string, string> = {
  danger: "text-danger",
  warning: "text-warning",
  caution: "text-caution",
  safe: "text-safe",
};

const BORDER_HOVER_CLASS: Record<string, string> = {
  danger: "hover:border-danger/50",
  warning: "hover:border-warning/50",
  caution: "hover:border-caution/50",
  safe: "hover:border-safe/50",
};

const BG_HOVER_CLASS: Record<string, string> = {
  danger: "hover:bg-danger/5",
  warning: "hover:bg-warning/5",
  caution: "hover:bg-caution/5",
  safe: "hover:bg-safe/5",
};

export function ForecastPanel({ forecast }: ForecastPanelProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={ChartLineData01Icon}
            size={16}
            strokeWidth={2}
            className="text-primary"
          />
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            향후 전망
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {forecast.period}
        </span>
      </div>

      {/* Outlook with typing effect + markdown bold */}
      <p className="text-xs leading-relaxed">
        <TypingMarkdownText text={forecast.outlook} speed={15} />
      </p>

      {/* Scenario comparison with hover effects */}
      <div className="group/scenarios mt-4 grid gap-3 sm:grid-cols-2">
        {forecast.scenarios.map((scenario) => {
          const severity = getSeverityByScore(scenario.overallScore);
          const colorToken = SEVERITY_COLOR_MAP[severity];

          return (
            <div
              key={scenario.type}
              className={cn(
                "rounded-lg border border-transparent bg-muted/50 p-3",
                "cursor-default transition-all duration-200 ease-out",
                "group-hover/scenarios:opacity-60 hover:!opacity-100",
                BORDER_HOVER_CLASS[colorToken],
                BG_HOVER_CLASS[colorToken]
              )}
            >
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-medium text-muted-foreground">
                  {scenario.label}
                </span>
                <span
                  className={cn(
                    "text-lg font-bold tabular-nums transition-transform duration-200",
                    "hover:scale-110",
                    SCORE_TEXT_CLASS[colorToken]
                  )}
                >
                  {scenario.overallScore}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {scenario.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
