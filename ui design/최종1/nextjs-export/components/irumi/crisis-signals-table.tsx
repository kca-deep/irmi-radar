"use client";

/**
 * crisis-signals-table.tsx
 * 변환 포인트:
 *   - react-router의 Link → next/link
 *   - 하드코딩 데이터 제거 → props로 수신
 */

import Link from "next/link";
import type { SignalTableItem } from "@/lib/irumi/types";

interface CrisisSignalsTableProps {
  signals: SignalTableItem[];
  selectedDate?: string | null;
}

const GRADE_TOOLTIP: Record<string, string> = {
  긴급: "위험 지수 80 이상. 즉각적인 대비가 필요합니다.",
  주의: "위험 지수 60 이상. 지속적인 모니터링이 요망됩니다.",
  관찰: "위험 지수 40 이상. 동향 관찰 단계입니다.",
};

export function CrisisSignalsTable({ signals, selectedDate }: CrisisSignalsTableProps) {
  return (
    <div className="bg-card rounded-[16px] shadow-[var(--irumi-shadow-card)] p-[24px] h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-irumi-brand" />
          <span className="text-[14px] font-[700] text-[var(--irumi-text-1)] flex items-center">
            최근 위기 뉴스
            {selectedDate && (
              <span className="text-irumi-brand text-[12px] ml-1 font-medium bg-irumi-brand-muted px-1.5 py-0.5 rounded">
                ({selectedDate}월 데이터)
              </span>
            )}
          </span>
        </div>
        <Link
          href="/irumi/news"
          className="text-[12px] font-medium text-irumi-brand hover:underline flex items-center gap-1"
        >
          전체 보기
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      <div className="flex-1">
        {/* 헤더 */}
        <div className="grid grid-cols-[80px_80px_1fr_80px] border-b border-irumi-line pb-2 mb-3 text-[12px] text-[var(--irumi-text-4)] font-medium">
          <div className="text-center">등급</div>
          <div className="text-center">분야</div>
          <div>제목</div>
          <div className="text-right pr-2">날짜</div>
        </div>

        {/* 행 목록 */}
        <div className="flex flex-col gap-[10px]">
          {signals.length === 0 ? (
            <div className="text-center text-[var(--irumi-text-3)] text-[13px] py-4">
              해당 기간의 위기 신호 데이터가 없습니다.
            </div>
          ) : (
            signals.map((signal, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[80px_80px_1fr_80px] items-center text-[13px] hover:bg-[#FAFAFA] p-1 -mx-1 rounded-md transition-colors cursor-pointer group/row"
              >
                {/* 등급 뱃지 + 툴팁 */}
                <div className="flex justify-center relative">
                  <span
                    className="text-white text-[11px] font-bold w-[46px] text-center py-1 rounded-[6px] group-hover/row:scale-[1.05] transition-transform"
                    style={{ backgroundColor: signal.levelBg }}
                  >
                    {signal.level}
                  </span>
                  <div className="absolute left-1/2 bottom-[110%] -translate-x-1/2 w-[160px] bg-white text-[#333333] text-[11px] p-[8px_10px] rounded-[8px] opacity-0 invisible group-hover/row:opacity-100 group-hover/row:visible transition-all duration-200 z-[100] shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-border text-left font-medium pointer-events-none">
                    {GRADE_TOOLTIP[signal.level] ?? ""}
                    <div className="absolute left-1/2 bottom-[-4px] -translate-x-1/2 w-2 h-2 bg-white border-b border-r border-border rotate-45" />
                  </div>
                </div>

                <div className="text-center text-[var(--irumi-text-2)]">{signal.category}</div>
                <div className="text-[var(--irumi-text-1)] truncate pr-4 hover:text-irumi-brand transition-colors">
                  {signal.title}
                </div>
                <div className="text-right pr-2 text-[var(--irumi-text-3)]">{signal.date}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
