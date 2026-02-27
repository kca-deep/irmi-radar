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

      {/* Scenario comparison */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {forecast.scenarios.map((scenario) => {
          const severity = getSeverityByScore(scenario.overallScore);
          const colorToken = SEVERITY_COLOR_MAP[severity];

          return (
            <div
              key={scenario.type}
              className="rounded-lg bg-muted/50 p-3"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-medium text-muted-foreground">
                  {scenario.label}
                </span>
                <span
                  className={cn(
                    "text-lg font-bold tabular-nums",
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
