"use client";

/**
 * dashboard-page.tsx
 * 변환 포인트:
 *   - useOutletContext(period) → usePeriod() Context 훅
 *   - 하드코딩 데이터 제거 → DashboardData props
 */

import { useState } from "react";
import { DashboardHero } from "@/components/irumi/dashboard-hero";
import { DashboardCharts } from "@/components/irumi/dashboard-charts";
import { CrisisSignalsTable } from "@/components/irumi/crisis-signals-table";
import { EmergingIssuesWidget } from "@/components/irumi/emerging-issues-widget";
import { usePeriod } from "@/lib/irumi/period-context";
import type { DashboardData } from "@/lib/irumi/types";

interface DashboardPageProps {
  data: DashboardData;
}

export function DashboardPage({ data }: DashboardPageProps) {
  const { period } = usePeriod();
  const [selectedChartDate, setSelectedChartDate] = useState<string | null>(null);

  return (
    <div className="flex flex-col pb-12 w-full min-h-full">
      <div className="flex flex-col gap-[24px]">
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
            period={period}
          />
        </div>

        {/* 하단: 위기 뉴스 테이블 + 이머징 이슈 */}
        <div className="flex gap-[20px] w-full shrink-0 items-stretch">
          <div
            style={{ width: "calc((100% - 40px) * 2.2 / 3.2 + 20px)" }}
            className="shrink-0 min-w-0"
          >
            <CrisisSignalsTable
              signals={data.signals}
              selectedDate={selectedChartDate}
            />
          </div>

          <div
            style={{ width: "calc((100% - 40px) * 1 / 3.2)" }}
            className="shrink-0 min-w-[280px] flex"
          >
            <EmergingIssuesWidget issues={data.emergingIssues} />
          </div>
        </div>
      </div>
    </div>
  );
}
