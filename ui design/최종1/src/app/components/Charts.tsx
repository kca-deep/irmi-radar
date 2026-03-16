import React from "react";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, YAxis, ReferenceLine } from "recharts";

const trendData = [
  { day: "Oct", value: 40 }, { day: "Oct-1", value: 65 }, { day: "Oct-2", value: 45 }, { day: "Oct-3", value: 50 },
  { day: "Oct-4", value: 42 }, { day: "Oct-5", value: 48 }, { day: "Oct-6", value: 55 }, { day: "Oct-7", value: 47 },
  { day: "Oct-8", value: 40 }, { day: "Oct-9", value: 85 }, { day: "Oct-10", value: 42 }, { day: "Oct-11", value: 45 },
  { day: "Oct-12", value: 38 }, { day: "Nov", value: 40 }, { day: "Nov-1", value: 50 }, { day: "Nov-2", value: 45 },
  { day: "Nov-3", value: 42 }, { day: "Nov-4", value: 55 }, { day: "Nov-5", value: 58 }, { day: "Nov-6", value: 45 },
  { day: "Nov-7", value: 48 }, { day: "Nov-8", value: 52 }, { day: "Nov-9", value: 55 }, { day: "Nov-10", value: 52 },
  { day: "Nov-11", value: 58 }, { day: "Nov-12", value: 50 }, { day: "Nov-13", value: 55 }, { day: "Nov-14", value: 52 },
  { day: "Nov-15", value: 45 }, { day: "Dec", value: 38 }, { day: "Dec-1", value: 40 }, { day: "Dec-2", value: 65 },
];

const riskData = [
  { name: "물가", value: 72, color: "#E24B4A", diff: "+5" },
  { name: "자영업", value: 67, color: "#FF6600", diff: "+6" },
  { name: "부동산", value: 58, color: "#FFAA00", diff: "+4" },
  { name: "고용", value: 45, color: "#5DAA30", diff: "-3" },
  { name: "금융", value: 41, color: "#5DAA30", diff: "-4" },
];

const heatmapRows = [
  { label: "물가", cells: [1,2,2,3,3,4,4], today: 34 },
  { label: "자영업", cells: [1,1,2,2,3,3,3], today: 25 },
  { label: "부동산", cells: [0,1,1,2,2,3,3], today: 31 },
  { label: "고용", cells: [0,0,1,1,2,2,2], today: 21 },
  { label: "금융", cells: [0,0,0,1,1,1,2], today: 17 }
];

const heatmapDates = ['3/8','3/9','3/10','3/11','3/12','3/13','오늘'];

export function Charts({ onDateSelect, selectedDate, period }: { onDateSelect?: (date: string | null) => void, selectedDate?: string | null, period?: string }) {
  return (
    <div className="flex gap-[20px] w-full h-[280px]">
      {/* 1. Trend Area Chart (From Previous) */}
      <div className="flex-[1.2] bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-[24px] flex flex-col relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF6600]"></div>
            <span className="text-[14px] font-[700] text-[#1A1A1A]">
              종합 지수 추이 {period && <span className="text-[12px] text-[#FF6600] font-medium ml-1">({period})</span>}
            </span>
            {selectedDate && (
              <button 
                onClick={() => onDateSelect && onDateSelect(null)}
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
              data={trendData.map((d, i) => ({ ...d, id: i }))} 
              margin={{ top: 20, right: 10, left: 10, bottom: 0 }}
              onClick={(e: any) => {
                if (e && e.activeLabel !== undefined && onDateSelect) {
                  const rawLabel = e.activeLabel;
                  const dayStr = trendData[rawLabel as number]?.day;
                  if (dayStr) {
                    onDateSelect(dayStr.replace(/-\d+$/, '')); // E.g. "Nov", "Dec"
                  }
                }
              }}
            >
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6600" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#FF6600" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <YAxis hide domain={[0, 100]} />
              <ReferenceLine 
                y={80} 
                stroke="#DDDDDD" 
                strokeDasharray="3 3" 
                label={{ 
                  position: 'insideTopLeft', 
                  value: '∧ 긴급', 
                  fill: '#AAAAAA', 
                  fontSize: 10,
                  fontWeight: 600,
                  dy: -15,
                  dx: -5
                }} 
              />
              <XAxis 
                dataKey="id" 
                tickFormatter={(value) => {
                  const day = trendData[value as number]?.day || "";
                  if (day === "Oct" || day === "Nov" || day === "Dec") return day;
                  return "";
                }}
                ticks={trendData.map((d, i) => i).filter(i => {
                  const day = trendData[i]?.day;
                  return day === "Oct" || day === "Nov" || day === "Dec";
                })}
                axisLine={{ stroke: '#EEEEEE' }} 
                tickLine={false} 
                tick={{ fontSize: 11, fill: '#AAAAAA' }}
                dy={10}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                itemStyle={{ color: '#FF6600', fontWeight: 'bold' }}
                labelFormatter={(label) => {
                  const day = trendData[label as number]?.day || "";
                  return day.replace(/-\d+$/, ''); // Strip out the unique suffixes for tooltip
                }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#FF6600" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorValue)" 
                activeDot={{ r: 6, fill: "#FF6600", stroke: "#FFF", strokeWidth: 2, cursor: "pointer" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Horizontal Bar Chart (Risk Breakdown from Current) */}
      <div className="flex-[1] bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-[24px] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF6600]"></div>
            <span className="text-[14px] font-[700] text-[#1A1A1A]">분야별 위험도</span>
          </div>
          <span className="bg-[#FFF0E8] text-[#FF6600] text-[11px] font-[600] px-2 py-0.5 rounded-[4px]">현황</span>
        </div>
        
        <div className="flex flex-col justify-between flex-1 pb-2">
          {riskData.map((item, idx) => (
            <div key={idx} className="flex items-center h-[28px] w-full">
              <div className="w-[45px] text-[13px] font-medium text-[#4A4A4A]">{item.name}</div>
              <div className="flex-1 h-[8px] bg-[#F5F5F5] rounded-full mx-3 relative overflow-hidden">
                <div 
                  className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                  style={{ width: `${item.value}%`, backgroundColor: item.color }}
                />
              </div>
              <div className="w-[48px] flex items-center justify-end gap-1.5 text-right">
                <div className="text-[13px] font-[700]" style={{ color: item.color === '#5DAA30' ? '#5DAA30' : '#FF6600' }}>
                  {item.value}
                </div>
                <div className="text-[10px] font-[600]" style={{ color: item.diff.startsWith('+') ? '#E24B4A' : '#5DAA30' }}>
                  {item.diff.startsWith('+') ? `▲${item.diff.replace('+', '')}` : `▼${item.diff.replace('-', '')}`}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#F0F0F0] text-[11px] text-[#888888]">
          <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#5DAA30]" /> 안전</span>
          <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#FFAA00]" /> 관찰 40+</span>
          <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#FF6600]" /> 주의 60+</span>
          <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#E24B4A]" /> 긴급 80+</span>
        </div>
      </div>

      {/* 3. Heatmap Chart (From Previous) */}
      <div className="flex-[1] bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-[24px] flex flex-col relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF6600]"></div>
            <span className="text-[14px] font-[700] text-[#1A1A1A]">기사량 변동</span>
          </div>
          
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex items-end mb-2 pl-[42px]">
            {heatmapDates.map((d, i) => (
              <div key={i} className={`flex-1 text-center text-[10px] ${i === 6 ? 'font-[700] text-[#FF6600]' : 'text-[#AAAAAA]'}`}>{d}</div>
            ))}
          </div>
          
          <div className="flex flex-col gap-1.5 flex-1 justify-between pb-2">
            {heatmapRows.map((row, idx) => (
              <div key={idx} className="flex items-center flex-1 w-full">
                <div className="w-[42px] text-[12px] text-[#888888] font-medium">{row.label}</div>
                <div className="flex-1 flex gap-1 h-full relative">
                  {row.cells.map((level, cidx) => {
                    let bg = "#F9F9F9"; // level 0
                    if (level === 1) bg = "#FDE8DE";
                    if (level === 2) bg = "#F8BAA0";
                    if (level === 3) bg = "#F07440";
                    if (level === 4) bg = "#C44010";
                    
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