"use client";

/**
 * dashboard-page.tsx
 * 변환 포인트:
 *   - useOutletContext(period) → usePeriod() Context 훅
 *   - 하드코딩 데이터 제거 → DashboardData props
 */

import { useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { DashboardHero } from "@/components/irumi/dashboard-hero";
import { CrisisSignalsTable } from "@/components/irumi/crisis-signals-table";
import { EmergingIssuesWidget } from "@/components/irumi/emerging-issues-widget";
import { DataFreshnessBadge } from "@/components/irumi/data-freshness-badge";
import type { DashboardData } from "@/lib/irumi/types";

// Recharts lazy load - SSR 비활성화로 초기 서버 렌더링 비용 제거
const DashboardCharts = dynamic(
  () => import("@/components/irumi/dashboard-charts").then((m) => ({ default: m.DashboardCharts })),
  {
    ssr: false,
    loading: () => (
      <div className="flex gap-[20px] w-full h-[280px]">
        <div className="flex-[1.2] min-w-0 bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-[24px] animate-pulse" />
        <div className="flex-[1] min-w-0 bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-[24px] animate-pulse" />
        <div className="flex-[1] min-w-0 bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-[24px] animate-pulse" />
      </div>
    ),
  }
);

interface DashboardPageProps {
  data: DashboardData;
}

export function DashboardPage({ data }: DashboardPageProps) {
  const [selectedChartDate, setSelectedChartDate] = useState<string | null>(null);

  return (
    <div className="flex flex-col pb-12 w-full min-h-full">
      <div className="flex flex-col gap-[24px]">
        {/* 데이터 신선도 인디케이터 */}
        {data.freshness && (
          <div className="flex justify-end px-1">
            <DataFreshnessBadge freshness={data.freshness} />
          </div>
        )}

        {/* Hero 카드 3종 */}
        <div className="shrink-0">
          <DashboardHero
            compositeIndex={data.compositeIndex}
            indexChange={data.indexChange}
            aiSummaryTitle={data.aiSummaryTitle}
            aiSummaryBody={data.aiSummaryBody}
            aiSummaryTime={data.aiSummaryTime}
          />
        </div>

        {/* 차트 3종 */}
        <div className="shrink-0">
          <DashboardCharts
            trendData={data.trendData}
            riskByCategory={data.riskByCategory}
            heatmapData={data.heatmapData}
            heatmapDates={data.heatmapDates}
            onDateSelect={setSelectedChartDate}
            selectedDate={selectedChartDate}
          />
        </div>

        {/* 하단: 위기 뉴스 테이블 + 이머징 이슈 (6:4) */}
        <div className="flex gap-5 w-full shrink-0 items-stretch">
          <div className="basis-3/5 min-w-0">
            <CrisisSignalsTable
              signals={data.signals}
              selectedDate={selectedChartDate}
            />
          </div>

          <div className="basis-2/5 min-w-0 flex">
            <EmergingIssuesWidget issues={data.emergingIssues} />
          </div>
        </div>
      </div>
    </div>
  );
}
