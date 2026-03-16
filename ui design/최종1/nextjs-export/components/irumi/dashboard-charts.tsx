"use client";

/**
 * dashboard-charts.tsx
 * 변환 포인트:
 *   - 하드코딩된 데이터 배열 제거 → props로 수신
 *   - 색상 inline style에서 CSS 변수 참조
 *   - recharts는 Next.js에서 동일하게 동작합니다.
 */

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
  period?: string;
}

export function DashboardCharts({
  trendData,
  riskByCategory,
  heatmapData,
  heatmapDates,
  onDateSelect,
  selectedDate,
  period,
}: DashboardChartsProps) {
  return (
    <div className="flex gap-[20px] w-full h-[280px]">
      {/* 1. 종합 지수 추이 */}
      <div className="flex-[1.2] bg-card rounded-[16px] shadow-[var(--irumi-shadow-card)] p-[24px] flex flex-col relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-irumi-brand" />
            <span className="text-[14px] font-[700] text-[var(--irumi-text-1)]">
              종합 지수 추이
              {period && (
                <span className="text-[12px] text-irumi-brand font-medium ml-1">({period})</span>
              )}
            </span>
            {selectedDate && (
              <button
                onClick={() => onDateSelect?.(null)}
                className="ml-2 text-[11px] text-irumi-brand underline cursor-pointer bg-irumi-brand-muted px-1.5 py-0.5 rounded"
              >
                초기화
              </button>
            )}
          </div>
          <span className="bg-irumi-brand-muted text-irumi-brand text-[11px] font-[600] px-2 py-0.5 rounded-[4px]">
            흐름
          </span>
        </div>

        <div className="flex-1 w-full relative min-h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={trendData.map((d, i) => ({ ...d, id: i }))}
              margin={{ top: 20, right: 10, left: 10, bottom: 0 }}
              onClick={(e: any) => {
                if (e?.activeLabel !== undefined && onDateSelect) {
                  const dayStr = trendData[e.activeLabel as number]?.day;
                  if (dayStr) onDateSelect(dayStr.replace(/-\d+$/, ""));
                }
              }}
            >
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--irumi-brand)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--irumi-brand)" stopOpacity={0} />
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
                  const day = trendData[value as number]?.day || "";
                  // 월 첫 포인트만 레이블 표시 (숫자 접미사 없는 항목)
                  return /^[A-Za-z가-힣]+$/.test(day) ? day : "";
                }}
                ticks={trendData
                  .map((d, i) => i)
                  .filter((i) => /^[A-Za-z가-힣]+$/.test(trendData[i]?.day ?? ""))}
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
                itemStyle={{ color: "var(--irumi-brand)", fontWeight: "bold" }}
                labelFormatter={(label) =>
                  trendData[label as number]?.day?.replace(/-\d+$/, "") ?? ""
                }
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--irumi-brand)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)"
                activeDot={{
                  r: 6,
                  fill: "var(--irumi-brand)",
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
      <div className="flex-[1] bg-card rounded-[16px] shadow-[var(--irumi-shadow-card)] p-[24px] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-irumi-brand" />
            <span className="text-[14px] font-[700] text-[var(--irumi-text-1)]">분야별 위험도</span>
          </div>
          <span className="bg-irumi-brand-muted text-irumi-brand text-[11px] font-[600] px-2 py-0.5 rounded-[4px]">
            현황
          </span>
        </div>

        <div className="flex flex-col justify-between flex-1 pb-2">
          {riskByCategory.map((item, idx) => (
            <div key={idx} className="flex items-center h-[28px] w-full">
              <div className="w-[45px] text-[13px] font-medium text-[var(--irumi-text-2)]">
                {item.name}
              </div>
              <div className="flex-1 h-[8px] bg-[#F5F5F5] rounded-full mx-3 relative overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                  style={{ width: `${item.value}%`, backgroundColor: item.color }}
                />
              </div>
              <div className="w-[48px] flex items-center justify-end gap-1.5 text-right">
                <div
                  className="text-[13px] font-[700]"
                  style={{ color: item.color }}
                >
                  {item.value}
                </div>
                <div
                  className="text-[10px] font-[600]"
                  style={{
                    color: item.diff.startsWith("+")
                      ? "var(--irumi-urgent)"
                      : "var(--irumi-safe)",
                  }}
                >
                  {item.diff.startsWith("+")
                    ? `▲${item.diff.replace("+", "")}`
                    : `▼${item.diff.replace("-", "")}`}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-irumi-line text-[11px] text-[var(--irumi-text-3)]">
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-irumi-safe" /> 안전
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-irumi-watch" /> 관찰 40+
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-irumi-brand" /> 주의 60+
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-irumi-urgent" /> 긴급 80+
          </span>
        </div>
      </div>

      {/* 3. 기사량 변동 히트맵 */}
      <div className="flex-[1] bg-card rounded-[16px] shadow-[var(--irumi-shadow-card)] p-[24px] flex flex-col relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-irumi-brand" />
            <span className="text-[14px] font-[700] text-[var(--irumi-text-1)]">기사량 변동</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex items-end mb-2 pl-[42px]">
            {heatmapDates.map((d, i) => (
              <div
                key={i}
                className={`flex-1 text-center text-[10px] ${
                  i === heatmapDates.length - 1
                    ? "font-[700] text-irumi-brand"
                    : "text-[var(--irumi-text-3)]"
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5 flex-1 justify-between pb-2">
            {heatmapData.map((row, idx) => (
              <div key={idx} className="flex items-center flex-1 w-full">
                <div className="w-[42px] text-[12px] text-[var(--irumi-text-3)] font-medium">
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
}
