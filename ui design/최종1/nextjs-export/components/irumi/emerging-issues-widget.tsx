/**
 * emerging-issues-widget.tsx
 * 순수 표시용 컴포넌트 — "use client" 불필요.
 * 하드코딩 데이터 제거 → props로 수신.
 */

import type { EmergingIssue } from "@/lib/irumi/types";

interface EmergingIssuesWidgetProps {
  issues: EmergingIssue[];
}

export function EmergingIssuesWidget({ issues }: EmergingIssuesWidgetProps) {
  return (
    <div className="w-full bg-card rounded-[16px] shadow-[var(--irumi-shadow-card)] p-[24px] flex flex-col h-full border border-irumi-line">
      <div className="flex justify-between items-end mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-irumi-brand" />
          <span className="text-[14px] font-[700] text-[var(--irumi-text-1)]">이머징 이슈</span>
        </div>
        <div className="text-[11px] text-[var(--irumi-text-4)] pb-[1px]">
          7일간 없다가 오늘 새로 등장
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-1">
        {issues.map((issue) => (
          <div
            key={issue.rank}
            className="flex items-center h-[36px] border-b-[0.5px] border-[#F8F8F5] last:border-none hover:bg-[#FAFAFA] rounded-md transition-colors px-2 -mx-2 cursor-pointer"
            style={{ backgroundColor: issue.rank <= 3 ? "var(--irumi-brand-muted)" : "transparent" }}
          >
            <div
              className="w-[24px] text-[13px] font-[800] text-center"
              style={{ color: issue.rank <= 3 ? "var(--irumi-brand)" : "#DDDDDD" }}
            >
              {issue.rank}
            </div>
            <div className="flex-1 text-[13px] font-medium text-[var(--irumi-text-2)] truncate px-2">
              {issue.name}
            </div>
            <div className="text-[11px] text-[var(--irumi-text-3)]">{issue.count}건</div>
          </div>
        ))}
      </div>
    </div>
  );
}
