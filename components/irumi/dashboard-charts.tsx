"use client";

/**
 * dashboard-charts.tsx
 * 변환 포인트:
 *   - 하드코딩된 데이터 배열 제거 → props로 수신
 *   - 색상 inline style에서 CSS 변수 참조
 *   - recharts는 Next.js에서 동일하게 동작합니다.
 */

import { memo, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  YAxis,
  ReferenceLine,
} from "recharts";
import type { TrendDataPoint, RiskByCategory, HeatmapRow } from "@/lib/irumi/types";

interface DashboardChartsProps {
  trendData: TrendDataPoint[];
  riskByCategory: RiskByCategory[];
  heatmapData: HeatmapRow[];
  heatmapDates: string[];
  onDateSelect?: (date: string | null) => void;
  selectedDate?: string | null;
}

export const DashboardCharts = memo(function DashboardCharts({
  trendData,
  riskByCategory,
  heatmapData,
  heatmapDates,
  onDateSelect,
  selectedDate,
}: DashboardChartsProps) {
  const chartData = useMemo(
    () => trendData.map((d, i) => ({ ...d, id: i })),
    [trendData]
  );

  const xAxisTicks = useMemo(() => {
    const seen = new Map<string, number[]>();
    trendData.forEach((d, i) => {
      const m = d.day.split("-")[0];
      if (!seen.has(m)) seen.set(m, []);
      seen.get(m)!.push(i);
    });
    const months = [...seen.entries()];
    if (months.length === 1) {
      const indices = months[0][1];
      return [indices[Math.floor(indices.length / 2)]];
    }
    return months.map(([, indices]) => indices[0]);
  }, [trendData]);

  return (
    <div className="flex gap-[20px] w-full h-[280px]">
      {/* 1. 종합 지수 추이 */}
      <div className="flex-[1.2] min-w-0 bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-[24px] flex flex-col relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF6600]" />
            <span className="text-[14px] font-[700] text-[#1A1A1A]">
              종합 지수 추이
            </span>
            {selectedDate && (
              <button
                onClick={() => onDateSelect?.(null)}
                className="ml-2 text-[11px] text-[#FF6600] underline cursor-pointer bg-[#FFF0E8] px-1.5 py-0.5 rounded"
              >
                초기화
              </button>
            )}
          </div>
          <span className="bg-[#FFF0E8] text-[#FF6600] text-[11px] font-[600] px-2 py-0.5 rounded-[4px]">흐름</span>
        </div>

        <div className="flex-1 w-full relative min-h-[180px]">
          {/* Tooltip hint */}
          <div className="absolute top-0 right-0 text-[10px] text-[#AAAAAA] opacity-0 hover:opacity-100 transition-opacity pointer-events-none z-10 bg-white/80 px-2 py-1 rounded">
            그래프 클릭 시 하단 리스트가 연동됩니다
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 20, right: 10, left: 10, bottom: 0 }}
              onClick={(e: any) => {
                if (e?.activeLabel !== undefined && onDateSelect) {
                  const dayStr = trendData[e.activeLabel as number]?.day;
                  if (dayStr) onDateSelect(dayStr);
                }
              }}
            >
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#FF6600" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF6600" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis hide domain={[0, 100]} />
              <ReferenceLine
                y={80}
                stroke="#DDDDDD"
                strokeDasharray="3 3"
                label={{
                  position: "insideTopLeft",
                  value: "∧ 긴급",
                  fill: "#AAAAAA",
                  fontSize: 10,
                  fontWeight: 600,
                  dy: -15,
                  dx: -5,
                }}
              />
              <XAxis
                dataKey="id"
                tickFormatter={(value) => {
                  const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                  const day = trendData[value as number]?.day || "";
                  const m = parseInt(day.split("-")[0]);
                  return monthNames[m] || "";
                }}
                ticks={xAxisTicks}
                interval={0}
                axisLine={{ stroke: "#EEEEEE" }}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#AAAAAA" }}
                dy={10}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
                itemStyle={{ color: "#FF6600", fontWeight: "bold" }}
                labelFormatter={(label) => {
                  const day = trendData[label as number]?.day ?? "";
                  const parts = day.split("-");
                  if (parts.length === 2) return `${parts[0]}/${parts[1]}`;
                  return day;
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#FF6600"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)"
                activeDot={{
                  r: 6,
                  fill: "#FF6600",
                  stroke: "#FFF",
                  strokeWidth: 2,
                  cursor: "pointer",
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. 분야별 위험도 */}
      <div className="flex-[1] min-w-0 bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-[24px] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF6600]" />
            <span className="text-[14px] font-[700] text-[#1A1A1A]">분야별 위험도</span>
          </div>
          <span className="bg-[#FFF0E8] text-[#FF6600] text-[11px] font-[600] px-2 py-0.5 rounded-[4px]">현황</span>
        </div>

        <div className="flex flex-col justify-between flex-1 pb-2">
          {riskByCategory.map((item, idx) => (
            <div key={idx} className="flex items-center h-[28px] w-full">
              <div className="w-[45px] text-[13px] font-medium text-[#4A4A4A]">
                {item.name}
              </div>
              <div className="flex-1 h-[8px] bg-[#F5F5F5] rounded-full mx-3 relative overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.round(item.value)}%`, backgroundColor: item.color }}
                />
              </div>
              <div className="w-[56px] flex items-center justify-end gap-1.5">
                <div
                  className="w-[24px] text-[13px] font-[700] tabular-nums text-right"
                  style={{ color: item.color === '#5DAA30' ? '#5DAA30' : '#FF6600' }}
                >
                  {Math.round(item.value)}
                </div>
                <div
                  className="w-[24px] text-[10px] font-[600] tabular-nums text-right"
                  style={{
                    color: item.diff.startsWith("+")
                      ? "#E24B4A"
                      : item.diff.startsWith("-")
                      ? "#5DAA30"
                      : "#AAAAAA",
                  }}
                >
                  {item.diff.startsWith("+")
                    ? `▲${item.diff.replace("+", "")}`
                    : item.diff.startsWith("-")
                    ? `▼${item.diff.replace("-", "")}`
                    : "-"}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#F0F0F0] text-[11px] text-[#888888]">
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#5DAA30]" /> 안전
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#FFAA00]" /> 관찰 40+
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#FF6600]" /> 주의 60+
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#E24B4A]" /> 긴급 80+
          </span>
        </div>
      </div>

      {/* 3. 기사량 변동 히트맵 */}
      <div className="flex-[1] min-w-0 bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-[24px] flex flex-col relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF6600]" />
            <span className="text-[14px] font-[700] text-[#1A1A1A]">기사량 변동</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex items-end mb-2 pl-[42px]">
            {heatmapDates.map((d, i) => (
              <div
                key={i}
                className={`flex-1 text-center text-[10px] ${
                  i === heatmapDates.length - 1
                    ? "font-[700] text-[#FF6600]"
                    : "text-[#AAAAAA]"
                }`}
              >
                {d === "오늘" ? d : d.replace("-", "/")}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5 flex-1 justify-between pb-2">
            {heatmapData.map((row, idx) => (
              <div key={idx} className="flex items-center flex-1 w-full">
                <div className="w-[42px] text-[12px] text-[#888888] font-medium">
                  {row.label}
                </div>
                <div className="flex-1 flex gap-1 h-full relative">
                  {row.cells.map((level, cidx) => {
                    const bg =
                      level === 0 ? "#F9F9F9" :
                      level === 1 ? "#FDE8DE" :
                      level === 2 ? "#F8BAA0" :
                      level === 3 ? "#F07440" : "#C44010";
                    return (
                      <div
                        key={cidx}
                        className="flex-1 rounded-[4px] h-full transition-colors duration-300"
                        style={{ backgroundColor: bg }}
                      />
                    );
                  })}
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-white font-[700] drop-shadow-md">
                    {row.today}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
