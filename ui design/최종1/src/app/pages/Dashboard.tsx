import React, { useState } from "react";
import { useOutletContext } from "react-router";
import { EmergingIssuesWidget } from "../components/DashboardWidgets";
import { Hero } from "../components/Hero";
import { Charts } from "../components/Charts";
import { CrisisSignals } from "../components/CrisisSignals";

export function Dashboard() {
  const { period } = useOutletContext<{ period: string }>();
  const [selectedChartDate, setSelectedChartDate] = useState<string | null>(null);

  return (
    <div className="flex flex-col pb-12 w-full min-h-full">
      <div className="flex flex-col gap-[24px]">
        {/* Top 3 Cards */}
        <div className="shrink-0">
          <Hero />
        </div>

        {/* Charts Row */}
        <div className="shrink-0">
          <Charts onDateSelect={setSelectedChartDate} selectedDate={selectedChartDate} period={period} />
        </div>

        {/* Bottom Section */}
        <div className="flex gap-[20px] w-full shrink-0 items-stretch">
          {/* Left: Crisis Signals Table */}
          <div style={{ width: 'calc((100% - 40px) * 2.2 / 3.2 + 20px)' }} className="shrink-0 min-w-0">
            <CrisisSignals selectedDate={selectedChartDate} />
          </div>

          {/* Right: Emerging Issues (Extended) */}
          <div style={{ width: 'calc((100% - 40px) * 1 / 3.2)' }} className="shrink-0 min-w-[280px] flex">
            <EmergingIssuesWidget />
          </div>
        </div>
      </div>
    </div>
  );
}