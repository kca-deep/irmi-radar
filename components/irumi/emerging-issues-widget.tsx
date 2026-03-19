/**
 * emerging-issues-widget.tsx
 * 순수 표시용 컴포넌트 -- "use client" 불필요.
 * 하드코딩 데이터 제거 -> props로 수신.
 */

import { memo } from "react";
import type { EmergingIssue, RiskGrade } from "@/lib/irumi/types";
import { cn } from "@/lib/utils";

interface EmergingIssuesWidgetProps {
  issues: EmergingIssue[];
}

/** severity에 따른 배경/텍스트 스타일 */
function severityStyles(grade?: RiskGrade) {
  switch (grade) {
    case "긴급":
      return {
        rowBg: "bg-irumi-urgent-muted",
        rankColor: "text-irumi-urgent",
        badgeBg: "bg-irumi-urgent-muted",
        badgeText: "text-irumi-urgent",
        badgeBorder: "border-irumi-urgent-border",
      };
    case "주의":
      return {
        rowBg: "bg-irumi-caution-muted",
        rankColor: "text-irumi-caution",
        badgeBg: "bg-irumi-caution-muted",
        badgeText: "text-irumi-caution",
        badgeBorder: "border-irumi-caution-border",
      };
    case "관찰":
      return {
        rowBg: "bg-irumi-watch-muted",
        rankColor: "text-irumi-watch",
        badgeBg: "bg-irumi-watch-muted",
        badgeText: "text-irumi-watch",
        badgeBorder: "border-irumi-watch-border",
      };
    default:
      return {
        rowBg: "bg-irumi-safe-muted",
        rankColor: "text-irumi-safe",
        badgeBg: "bg-irumi-safe-muted",
        badgeText: "text-irumi-safe",
        badgeBorder: "border-transparent",
      };
  }
}

export const EmergingIssuesWidget = memo(function EmergingIssuesWidget({ issues }: EmergingIssuesWidgetProps) {
  return (
    <div className="w-full bg-card rounded-2xl shadow-sm p-6 flex flex-col h-full border border-border">
      {/* 헤더 */}
      <div className="flex justify-between items-end mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-irumi-brand" />
          <span className="text-sm font-bold text-irumi-text-1">
            이머징 이슈
          </span>
        </div>
        <div className="text-xs text-irumi-text-4 pb-px">
          7일간 없다가 오늘 새로 등장
        </div>
      </div>

      {/* 이슈 리스트 */}
      <div className="flex-1 flex flex-col gap-1">
        {issues.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            탐지된 이머징 이슈가 없습니다
          </div>
        )}

        {issues.map((issue) => {
          const s = severityStyles(issue.severity);
          return (
            <div
              key={issue.rank}
              className={cn(
                "flex items-center gap-2 min-h-[44px] py-1.5 border-b border-irumi-line last:border-none",
                "hover:bg-muted/50 rounded-lg transition-colors px-2 -mx-2 cursor-pointer",
                issue.severity ? s.rowBg : "",
              )}
            >
              {/* 순위 */}
              <div
                className={cn(
                  "w-5 shrink-0 text-[13px] font-extrabold text-center",
                  issue.severity ? s.rankColor : "text-muted-foreground",
                )}
              >
                {issue.rank}
              </div>

              {/* 등급 + 카테고리 뱃지 */}
              <div className="flex flex-col gap-0.5 shrink-0">
                {issue.severity && (
                  <span
                    className={cn(
                      "inline-flex items-center justify-center text-[10px] font-bold leading-none",
                      "px-1.5 py-0.5 rounded border",
                      s.badgeBg,
                      s.badgeText,
                      s.badgeBorder,
                    )}
                  >
                    {issue.severity}
                  </span>
                )}
                {issue.category && (
                  <span className="text-[10px] text-irumi-text-3 leading-none text-center">
                    {issue.category}
                  </span>
                )}
              </div>

              {/* 이슈 제목 */}
              <div className="flex-1 min-w-0 text-[13px] font-medium text-irumi-text-2 truncate">
                {issue.name}
              </div>

              {/* 기사 수 */}
              <div className="text-xs text-irumi-text-3 shrink-0">
                {issue.count}건
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
