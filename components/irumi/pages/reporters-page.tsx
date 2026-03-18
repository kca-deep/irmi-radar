"use client";

/**
 * reporters-page.tsx
 * 변환 포인트:
 *   - 하드코딩 mockData 제거 → ReporterData props
 *   - useEffect의 setTimeout(mock) 제거 — 데이터를 props로 수신하므로 불필요
 *   - figma:asset → /images/irumi-logo.png
 *   - lucide-react → @hugeicons/react (Loading01Icon 등)
 *   - recharts는 동일하게 사용
 */

import { useState } from "react";

import { PieChart, Pie, Cell, AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { BloggingIllustration } from "@/components/irumi/blogging-illustration";
import type { ReporterData, Reporter, BeatSummary, BeatItem } from "@/lib/irumi/types";

// ── 색상 팔레트 ────────────────────────────────────────────
const TOSS_BLUE   = "#3182F6";
const SLATE_PALETTE = ["#334155", "#475569", "#64748b", TOSS_BLUE, "#94a3b8"];

function getSlateColor(i: number, isEtc = false) {
  if (isEtc) return "#D1D5DB";
  return SLATE_PALETTE[i % SLATE_PALETTE.length];
}

/** beatBreakdown을 상위 max개 + "기타" 합산으로 축소 */
function truncateBeats(breakdown: BeatItem[], max = 5): BeatItem[] {
  if (breakdown.length <= max) return breakdown;
  const top = breakdown.slice(0, max);
  const rest = breakdown.slice(max);
  const etcCount = rest.reduce((s, b) => s + b.count, 0);
  return [...top, { beat: `기타 ${rest.length}개`, count: etcCount }];
}

const BEAT_BADGE: Record<string, { bg: string; text: string }> = {
  경제:    { bg: "#DBEAFE", text: "#1D4ED8" },
  금융:    { bg: "#DBEAFE", text: "#1D4ED8" },
  사회:    { bg: "#F3F4F6", text: "#374151" },
  정치:    { bg: "#EDE9FE", text: "#7C3AED" },
  "IT/과학": { bg: "#CFFAFE", text: "#0E7490" },
  국제:    { bg: "#FEF3C7", text: "#B45309" },
  문화:    { bg: "#FCE7F3", text: "#BE185D" },
  부동산:  { bg: "#D1FAE5", text: "#065F46" },
};

function getBeatBadge(beat: string) {
  return BEAT_BADGE[beat] ?? { bg: "#F3F4F6", text: "#374151" };
}

/** 천 단위 쉼표 포맷 */
function fmt(n: number): string {
  return n.toLocaleString("ko-KR");
}

// ── SVG arc ───────────────────────────────────────────────
function describeArc(cx: number, cy: number, r: number, a1: number, a2: number): string {
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy - r * Math.sin(a1);
  const x2 = cx + r * Math.cos(a2);
  const y2 = cy - r * Math.sin(a2);
  const la = Math.abs(a1 - a2) > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${la} 1 ${x2} ${y2}`;
}

function ActivityGauge({ weeklyRatio, convergenceCount, surgingCount, dark = false }:
  { weeklyRatio: number; convergenceCount: number; surgingCount: number; dark?: boolean }) {
  // score1: 주간 기사량 변동률 (0.8 이하 0점, 1.6+ 40점)
  const score1   = Math.min(Math.max((weeklyRatio - 0.8) * 50, 0), 40);
  // score2: 교차취재 건수 (10건이면 30점 최대)
  const score2   = Math.min(convergenceCount * 3, 30);
  // score3: 급증 기자 수 (6명이면 30점 최대)
  const score3   = Math.min(surgingCount * 5, 30);
  const intensity = Math.min(Math.round(score1 + score2 + score3), 100);

  const level = intensity >= 75 ? { color: "#EF4444", bg: "#FEE2E2", label: "긴급",  arc: "#EF4444" }
              : intensity >= 50 ? { color: "#F59E0B", bg: "#FEF3C7", label: "주의",  arc: "#F59E0B" }
              : intensity >= 25 ? { color: "#3B82F6", bg: "#DBEAFE", label: "관찰",  arc: "#3B82F6" }
              :                   { color: "#22C55E", bg: "#DCFCE7", label: "안전",  arc: "#22C55E" };

  const cx = 90, cy = 80, r = 64;
  const start = Math.PI, end = 0, sweep = Math.PI;
  const valEnd = start - (intensity / 100) * sweep;
  const valueArcD = describeArc(cx, cy, r, start, valEnd);
  const dotX = cx + r * Math.cos(valEnd);
  const dotY = cy - r * Math.sin(valEnd);

  const zones = [
    { s: 0, e: 0.25, c: "#22C55E" },
    { s: 0.25, e: 0.5, c: "#3B82F6" },
    { s: 0.5, e: 0.75, c: "#F59E0B" },
    { s: 0.75, e: 1, c: "#EF4444" },
  ];

  return (
    <div className="flex flex-col items-center">
      <svg width="180" height="108" viewBox="0 0 180 108">
        {zones.map((z, i) => (
          <path key={i} d={describeArc(cx, cy, r, start - z.s * sweep, start - z.e * sweep)}
            fill="none" stroke={dark ? "#FFFFFF" : z.c}
            strokeWidth={10} strokeOpacity={dark ? 0.15 : 0.12} strokeLinecap="butt" />
        ))}
        <path d={valueArcD} fill="none" stroke={dark ? "#FFFFFF" : level.arc} strokeWidth={10} strokeLinecap="round" />
        <circle cx={dotX} cy={dotY} r={6} fill={dark ? "#FFFFFF" : level.color} />
        <circle cx={dotX} cy={dotY} r={3} fill={dark ? "rgba(30,58,138,0.8)" : "white"} />
        <text x="18" y="92" fontSize="9" fill={dark ? "rgba(255,255,255,0.4)" : "#D1D5DB"} textAnchor="middle" fontWeight="500">안전</text>
        <text x="162" y="92" fontSize="9" fill={dark ? "rgba(255,255,255,0.4)" : "#D1D5DB"} textAnchor="middle" fontWeight="500">긴급</text>
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize="28" fontWeight="900" fill={dark ? "#FFFFFF" : level.color} letterSpacing="-1.5">{intensity}</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fontSize="10" fill={dark ? "rgba(255,255,255,0.45)" : "#9CA3AF"} fontWeight="500">/ 100</text>
      </svg>
      <div className="-mt-1 flex flex-col items-center gap-1">
        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
          style={dark ? { backgroundColor: "rgba(255,255,255,0.18)", color: "#FFFFFF" }
                      : { backgroundColor: level.bg, color: level.color }}>
          취재 과열도 {level.label}
        </span>
      </div>
    </div>
  );
}

function DefaultProfile({ reporter }: { reporter: Reporter | undefined }) {
  if (!reporter) return null;
  const topBeat = reporter.beatBreakdown[0];
  const total   = reporter.beatBreakdown.reduce((s, b) => s + b.count, 0) || 1;
  const topPct  = topBeat ? Math.round((topBeat.count / total) * 100) : 0;
  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <p className="font-semibold uppercase tracking-wider text-[#3182F6] text-[13px]">
          현재 가장 영향력 있는 기자
        </p>
        <h3 className="mt-1 text-lg font-bold text-gray-900">
          {reporter.name.split("(")[0].trim()}
        </h3>
        <p className="mt-0.5 text-xs text-gray-400">
          {reporter.name.includes("(") ? reporter.name.slice(reporter.name.indexOf("(")) : ""}
        </p>
      </div>

      <div className="rounded-2xl bg-gray-100 px-5 py-4">
        <p className="text-gray-500 text-[14px]">
          총 <span className="font-bold text-gray-900">{fmt(reporter.total)}건</span>의 기사를 출고한{" "}
          {reporter.isSpecialist ? (
            <>
              <span className="font-semibold text-[#3182F6]">{reporter.primaryBeat}</span>{" "}
              전문 기자<br />
              (기사의 {topPct}%가 해당 분야)
            </>
          ) : (
            <>
              <span className="font-semibold text-gray-900">{reporter.beatCount}개 분야</span>를 넘나드는 다분야 기자
            </>
          )}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-gray-100 px-5 py-4">
          <p className="font-bold text-gray-900 text-[24px]">{fmt(reporter.avgWeekly)}</p>
          <p className="text-xs text-gray-400">주평균</p>
        </div>
        <div className="rounded-2xl bg-gray-100 px-5 py-4">
          <p className="font-bold text-gray-900 text-[24px]">{fmt(reporter.recentCount)}</p>
          <p className="text-xs text-gray-400">이번주</p>
        </div>
        <div className="rounded-2xl bg-gray-100 px-5 py-4">
          <p className={`font-bold ${reporter.surgeRatio >= 1.5 ? "text-[#3182F6]" : "text-gray-900"} text-[24px]`}>
            x{reporter.surgeRatio}
          </p>
          <p className="text-xs text-gray-400">급등 배수</p>
        </div>
      </div>

      {/* Beat breakdown as horizontal bar */}
      {(() => {
        const displayBeats = truncateBeats(reporter.beatBreakdown);
        const displayTotal = displayBeats.reduce((s, b) => s + b.count, 0) || 1;
        return (
          <div>
            <p className="mb-2 text-xs font-semibold text-gray-400">분야별 비중</p>
            <div className="flex h-3 w-full overflow-hidden rounded-full">
              {displayBeats.map((b, idx) => (
                <div
                  key={`${b.beat}-${idx}`}
                  style={{
                    width: `${(b.count / displayTotal) * 100}%`,
                    backgroundColor: getSlateColor(idx, b.beat.startsWith("기타")),
                  }}
                />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {displayBeats.map((b, idx) => (
                <div key={`${b.beat}-${idx}`} className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: getSlateColor(idx, b.beat.startsWith("기타")) }} />
                  {b.beat} {Math.round((b.count / displayTotal) * 100)}%
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <p className="text-center text-xs text-gray-400">좌측 리더보드에서 기자를 클릭하면<br />상세 프로파일을 확인할 수 있습니다</p>
    </div>
  );
}

function ReporterProfile({ reporter }: { reporter: Reporter }) {
  const displayBeats = truncateBeats(reporter.beatBreakdown);
  const total = displayBeats.reduce((s, b) => s + b.count, 0) || 1;
  const dept = reporter.name.includes("(")
    ? reporter.name.slice(reporter.name.indexOf("(") + 1, reporter.name.indexOf(")"))
    : "";
  const trendData = reporter.weeklyTrend.map((v, i, arr) => ({
    week: i === arr.length - 1 ? "이번주" : i === 0 ? `${arr.length - 1}주전` : "",
    v,
  }));

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div>
        <p className="text-xs text-gray-400">선택된 기자</p>
        <h3 className="mt-1 font-black text-gray-900 text-[24px]">
          {reporter.name.split("(")[0].trim()} 기자
        </h3>
        <p className="mt-1 text-sm text-gray-400">매경 {dept}</p>
        <hr className="mt-4 border-gray-100" />
      </div>

      {/* Stats 2x2 */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-gray-100 px-5 py-4">
          <p className="text-xs text-gray-400">총 기사</p>
          <p className="mt-0.5 text-2xl font-bold text-gray-900">
            {fmt(reporter.total)}<span className="text-sm font-medium text-gray-500">건</span>
          </p>
        </div>
        <div className="rounded-2xl bg-gray-100 px-5 py-4">
          <p className="text-xs text-gray-400">분야 수</p>
          <p className="mt-0.5 text-2xl font-bold text-gray-900">
            {fmt(reporter.beatCount)}<span className="text-sm font-medium text-gray-500">개</span>
          </p>
        </div>
        <div className="rounded-2xl bg-gray-100 px-5 py-4">
          <p className="text-xs text-gray-400">이번주</p>
          <p className="mt-0.5 text-2xl font-bold text-gray-900">
            {fmt(reporter.recentCount)}<span className="text-sm font-medium text-gray-500">건</span>
          </p>
        </div>
        <div className="rounded-2xl bg-gray-100 px-5 py-4">
          <p className="text-xs text-gray-400">교차 비율</p>
          <p className={`mt-0.5 text-2xl font-bold ${reporter.surgeRatio >= 1.5 ? "text-[#3182F6]" : "text-gray-900"}`}>
            <span className="text-sm font-medium text-gray-500">x</span>{reporter.surgeRatio}
          </p>
        </div>
      </div>

      {/* Beat donut + legend */}
      <div>
        <p className="mb-3 text-xs font-semibold text-gray-400">분야별 기사 비중</p>
        <div className="flex items-center gap-4">
          {/* Donut */}
          <div className="relative h-[108px] w-[108px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayBeats}
                  cx="50%"
                  cy="50%"
                  innerRadius={32}
                  outerRadius={50}
                  dataKey="count"
                  nameKey="beat"
                  strokeWidth={0}
                >
                  {displayBeats.map((entry, idx) => (
                    <Cell key={entry.beat} fill={getSlateColor(idx, entry.beat.startsWith("기타"))} opacity={0.85} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex-1 space-y-2">
            {displayBeats.map((b, idx) => (
              <div key={b.beat} className="flex items-center gap-2 text-xs">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: getSlateColor(idx, b.beat.startsWith("기타")) }}
                />
                <span className="flex-1 text-gray-500">{b.beat}</span>
                <span className="font-medium text-gray-700">
                  {Math.round((b.count / total) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI 프로파일 요약 */}
      {reporter.aiProfileSummary && (
        <div className="rounded-xl bg-[#FFF4EB] px-4 py-3">
          <p className="text-xs font-bold text-[#FF6600] mb-1">AI 분석</p>
          <p className="text-sm text-gray-700">{reporter.aiProfileSummary}</p>
        </div>
      )}

      {/* 8주 출고 추이 */}
      <div>
        <p className="mb-3 text-xs font-semibold text-gray-400">8주 출고 추이</p>
        <div className="h-[92px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 4, right: 2, bottom: 0, left: -32 }}>
              <defs>
                <linearGradient id="trendGradSel" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={TOSS_BLUE} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={TOSS_BLUE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="week"
                tick={{ fontSize: 9, fill: "#D1D5DB" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke={TOSS_BLUE}
                strokeWidth={1.5}
                fill="url(#trendGradSel)"
                dot={{ r: 2, fill: TOSS_BLUE, strokeWidth: 0 }}
                activeDot={{ r: 4 }}
              />
              <Tooltip
                contentStyle={{
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
                formatter={(value) => [`${Number(value).toLocaleString("ko-KR")}건`, "출고량"]}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────
interface ReportersPageProps {
  data: ReporterData;
}

export function ReportersPage({ data }: ReportersPageProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showAllConv, setShowAllConv] = useState(false);
  const [showAllSurging, setShowAllSurging] = useState(false);
  const [showAllLeaderboard, setShowAllLeaderboard] = useState(false);

  const d = data;
  const surging      = d.leaderboard.filter((r) => r.surgeRatio >= 1.5);
  const selected     = selectedIdx !== null ? d.leaderboard[selectedIdx] : null;
  const topBeat      = d.beatSummary.reduce((a, b) => (a.articles > b.articles ? a : b), d.beatSummary[0]);
  const restBeats    = d.beatSummary.filter((bs) => bs.beat !== topBeat.beat && bs.beat).sort((a, b) => b.articles - a.articles);
  const visibleConv  = showAllConv ? d.convergence : d.convergence.slice(0, 2);
  const visibleSurging = showAllSurging ? surging : surging.slice(0, 3);
  const topReporter  = d.leaderboard[0];

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center justify-between mt-[12px] mb-[12px]">
        <div className="text-[#AAAAAA] text-[14px]">기자 활동 패턴으로 읽는 위기 신호를 확인해 보세요</div>
      </div>

      {/* 인사이트 배너 */}
      <div className="animate-fade-in rounded-[16px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] px-5 py-4 flex items-center gap-4 flex-wrap relative overflow-hidden">
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-black tracking-wider ${d.aiSummary ? "bg-[#FFF4EB] text-[#FF6600]" : "bg-[#EFF6FF] text-[#3182F6]"}`}>
          {d.aiSummary ? "AI 요약" : "요약"}
        </span>
        <p className="text-gray-800 flex-1 min-w-0 text-[16px]">
          {d.aiSummary ? (
            d.aiSummary
          ) : (
            <>
              <span className="font-extrabold text-gray-900">{topBeat.beat}</span>{" "}분야{" "}
              <span className="font-extrabold text-gray-900">{fmt(topBeat.writers)}명</span>의 기자가{" "}
              <span className="font-extrabold text-gray-900">{fmt(topBeat.articles)}건</span> 출고하며 전 분야 최다 활동.{" "}
              기사 출고 급증 기자{" "}<span className="font-extrabold text-[#3182F6]">{surging.length}명</span>,{" "}
              교차취재{" "}<span className="font-extrabold text-[#3182F6]">{d.convergence.length}건</span> 감지.
            </>
          )}
        </p>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-[44px] h-[44px] pointer-events-none select-none">
          <img src="/images/irumi-logo.png" alt="" className="w-full h-full object-contain" style={{ filter: "grayscale(1) brightness(0.75)", opacity: 0.12 }} />
        </div>
      </div>

      {/* 섹션 1: 분야별 기사량 */}
      <div className="grid gap-3 items-stretch" style={{ gridTemplateColumns: "2fr 3fr" }}>
        <div className="animate-fade-in rounded-[16px] bg-gradient-to-br from-[#3182F6] to-[#1D4ED8] px-5 py-5 shadow-[0_2px_12px_rgba(49,130,246,0.25)] transition-all duration-200 hover:shadow-[0_4px_20px_rgba(49,130,246,0.35)] hover:-translate-y-px">
          <div className="grid grid-cols-2 items-center gap-4 h-full">
            <div className="flex flex-col items-center text-center">
              <span className="rounded-md bg-white/20 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-white">전 분야 최다</span>
              <p className="mt-2 text-sm font-medium text-white/60">{topBeat.beat}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black leading-none tracking-tighter text-white">{fmt(topBeat.articles)}</span>
                <span className="text-sm font-medium text-white/50">건</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-white/50">
                <span>기자 <span className="font-bold text-white/90">{fmt(topBeat.writers)}명</span></span>
                <span className="h-3 w-px bg-white/30" />
                <span>1인당 <span className="font-bold text-white/90">{(topBeat.articles / topBeat.writers).toFixed(1)}건</span></span>
              </div>
            </div>
            <ActivityGauge weeklyRatio={d.weeklyRatio ?? 1} convergenceCount={d.convergence.length} surgingCount={surging.length} dark />
          </div>
        </div>

        <div className="min-w-0 flex">
          {restBeats.slice(0, 4).map((bs, idx) => (
            <div key={bs.beat} className={`flex-1 flex flex-col justify-center px-4 py-3 ${idx < 3 ? "border-r border-gray-200" : ""}`}>
              <p className="text-xs text-gray-400">{bs.beat}</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-gray-900">{fmt(bs.articles)}</span>
                <span className="text-xs text-gray-400">건</span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-gray-400 whitespace-nowrap">
                <span>기자 <span className="font-bold text-gray-600">{fmt(bs.writers)}명</span></span>
                <span className="h-3 w-px bg-gray-300" />
                <span>1인당 <span className="font-bold text-gray-600">{bs.writers > 0 ? (bs.articles / bs.writers).toFixed(1) : "0"}건</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 섹션 2&3: 출고 급증 + 교차취재 */}
      <div className="grid gap-3 items-stretch" style={{ gridTemplateColumns: "2fr 3fr" }}>
        {/* 출고 급증 */}
        <div className="rounded-[16px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] px-6 pt-6 pb-3 flex flex-col transition-all duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.10)] hover:-translate-y-px relative overflow-hidden">
          <div className="mb-2.5 flex items-center gap-2">

            <div className="w-1.5 h-1.5 rounded-full bg-[#3182F6]"></div>
            <h2 className="text-base font-bold text-gray-900">출고 급증 감지</h2>
            <span className="rounded-full bg-[#3182F6]/15 px-2 py-0.5 text-xs font-bold text-[#3182F6]">{surging.length}명</span>
            {surging.length >= 3 && <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-black text-[#3182F6]">주의</span>}
          </div>
          <p className="mb-5 text-sm text-gray-500">주평균 대비 1.5배 이상 출고 - 특정 이슈에 대한 집중 취재 가능성</p>
          <div className="grid grid-cols-1 gap-2">
            {visibleSurging.map((r) => (
              <div key={r.name} className="rounded-xl bg-gray-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 text-[14px]">{r.name.split("(")[0].trim()}</span>
                  <span className="text-xs text-gray-400">{r.primaryBeat}</span>
                  <span className="flex-1" />
                  <span className="text-xs text-gray-500">이번주 {fmt(r.recentCount)}건</span>
                  <span className="rounded-md bg-[#3182F6]/15 px-2 py-0.5 text-sm font-bold text-[#3182F6]">x{r.surgeRatio}</span>
                </div>
                {r.surgeReason && (
                  <p className="mt-1.5 text-xs text-[#FF6600]">{r.surgeReason}</p>
                )}
              </div>
            ))}
          </div>
          {surging.length > 3 && (
            <button onClick={() => setShowAllSurging(!showAllSurging)} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-gray-400 transition hover:bg-gray-100 hover:text-gray-900">
              {showAllSurging ? <>접기 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m18 15-6-6-6 6"/></svg></>
                : <>나머지 {surging.length - 3}명 더 보기 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg></>}
            </button>
          )}
          {showAllConv && (
            <div className="absolute bottom-4 right-4 w-[96px] h-[96px] pointer-events-none select-none">
              <img
                src="/images/irumi-logo.png"
                alt=""
                className="w-full h-full object-contain"
                style={{ filter: "grayscale(1) brightness(0.6)", opacity: 0.13 }}
              />
            </div>
          )}
        </div>

        {/* 교차취재 */}
        <div className="rounded-[16px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] px-6 pt-6 pb-3 flex flex-col transition-all duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.10)] hover:-translate-y-px">
          <div className="mb-2.5 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#3182F6]" />
            <h2 className="text-base font-bold text-gray-900">교차취재 감지</h2>
            <span className="rounded-full bg-[#3182F6]/15 px-2.5 py-0.5 text-xs font-bold text-[#3182F6]">{d.convergence.length}건</span>
            {d.convergence.length >= 5 && <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-black text-[#3182F6]">긴급</span>}
          </div>
          <p className="mb-5 text-sm text-gray-500">2개 이상 민생 분야 기자가 동시에 집중하는 주제 - 위기가 분야를 넘어 확산되고 있다는 신호</p>
          <div className="divide-y divide-gray-100 flex-1">
            {visibleConv.map((c) => (
              <div key={c.topic} className="group flex items-center gap-4 rounded-xl px-4 py-2.5 transition hover:bg-gray-50">
                <div className="h-[48px] w-[48px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={c.beatDistribution} cx="50%" cy="50%" innerRadius={12} outerRadius={22} dataKey="count" nameKey="beat" strokeWidth={0}>
                        {c.beatDistribution.map((entry, idx) => <Cell key={entry.beat} fill={getSlateColor(idx)} opacity={0.9} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <p className="shrink-0 text-lg font-bold text-gray-900">{c.topic}</p>
                    {c.topArticleTitle && (
                      <p className="truncate text-xs text-gray-400 min-w-0">
                        <span className="text-gray-300 mr-0.5">&ldquo;</span>{c.topArticleTitle}<span className="text-gray-300 ml-0.5">&rdquo;</span>
                      </p>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">{c.beat_count}개 분야 기자 {c.writer_count}명이 동시 취재 중</p>
                  {c.aiInsight && (
                    <p className="mt-1 text-xs text-[#FF6600]">{c.aiInsight}</p>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    {c.beatDistribution.map((bd, idx) => (
                      <div key={bd.beat} className="flex items-center gap-1 text-xs text-gray-400">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: getSlateColor(idx) }} />
                        {bd.beat}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-1.5 w-[148px] justify-end">
                  {[0, 1].map((slot) => {
                    const rep = c.topReporters[slot];
                    return rep
                      ? <span key={rep.name} className="flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-600 whitespace-nowrap">{rep.name}</span>
                      : <span key={slot} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs invisible">_</span>;
                  })}
                  <span className={`text-xs font-medium text-gray-400 min-w-[24px] text-right ${c.topReporters.length > 2 ? "visible" : "invisible"}`}>+{c.topReporters.length - 2}</span>
                </div>
              </div>
            ))}
          </div>
          {d.convergence.length > 2 && (
            <button onClick={() => setShowAllConv(!showAllConv)} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-gray-400 transition hover:bg-gray-100 hover:text-gray-900">
              {showAllConv ? <>접기 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m18 15-6-6-6 6"/></svg></>
                : <>나머지 {d.convergence.length - 2}건 더 보기 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg></>}
            </button>
          )}
        </div>
      </div>

      {/* 섹션 4: 리더보드 + 프로파일 */}
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="rounded-[16px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] px-7 py-6 transition-all duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.10)] hover:-translate-y-px">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#3182F6]" />
              <h2 className="text-lg font-bold text-gray-900">기자 활동 리더보드</h2>
            </div>
            <span className="text-xs text-gray-400">출고량 기준 · 선택하면 상세 보기</span>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left pb-2.5 pr-3 text-xs text-gray-400 w-7">#</th>
                <th className="text-left pb-2.5 pr-4 text-xs text-gray-400">기자명</th>
                <th className="text-left pb-2.5 pr-4 text-xs text-gray-400">주 분야</th>
                <th className="text-right pb-2.5 pr-4 text-xs text-gray-400">출고수</th>
                <th className="text-right pb-2.5 pr-4 text-xs text-gray-400">교차비율</th>
                <th className="text-right pb-2.5 text-xs text-gray-400">추이</th>
              </tr>
            </thead>
            <tbody>
              {(showAllLeaderboard ? d.leaderboard : d.leaderboard.slice(0, 10)).map((r, i) => {
                const isSelected = selectedIdx === i;
                return (
                  <tr key={r.name} onClick={() => setSelectedIdx(isSelected ? null : i)}
                    className={`cursor-pointer border-b border-gray-50 last:border-0 transition-colors ${isSelected ? "bg-[#3182F6]/5" : "hover:bg-gray-50"}`}>
                    <td className={`py-2.5 pr-3 text-xs font-bold align-middle ${i < 3 ? "text-[#3182F6]" : "text-gray-300"}`}>{i + 1}</td>
                    <td className="py-2.5 pr-4 align-middle"><span className="text-sm font-medium text-gray-900 whitespace-nowrap">{r.name.split("(")[0].trim()} 기자</span></td>
                    <td className="py-2.5 pr-4 align-middle"><span className="text-xs text-gray-400 whitespace-nowrap">{r.primaryBeat}{r.isSpecialist ? " 전문" : ""}</span></td>
                    <td className="py-2.5 pr-4 text-right text-sm font-bold text-gray-900 align-middle whitespace-nowrap">{fmt(r.total)}건</td>
                    <td className="py-2.5 pr-4 text-right align-middle">
                      <span className={`text-sm font-bold ${r.surgeRatio >= 1.5 ? "text-[#3182F6]" : r.surgeRatio >= 1.2 ? "text-gray-700" : "text-gray-400"}`}>x{r.surgeRatio}</span>
                    </td>
                    <td className="py-2.5 text-right align-middle">
                      <div className="inline-flex items-end justify-end gap-px h-5 w-12">
                        {r.weeklyTrend.slice(-6).map((v, idx, arr) => {
                          const max = Math.max(...arr, 1);
                          return (
                            <div key={idx} className="flex-1 rounded-sm"
                              style={{ height: `${Math.max((v / max) * 100, 12)}%`, backgroundColor: idx === arr.length - 1 ? TOSS_BLUE : "#CBD5E1", opacity: 0.4 + (idx / arr.length) * 0.6 }} />
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {d.leaderboard.length > 10 && (
            <button
              onClick={() => setShowAllLeaderboard(!showAllLeaderboard)}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium text-gray-400 transition hover:bg-gray-50 hover:text-gray-700 border border-dashed border-gray-200"
            >
              {showAllLeaderboard ? (
                <>접기 <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m18 15-6-6-6 6"/></svg></>
              ) : (
                <>더보기 · {d.leaderboard.length - 10}명 남음 <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg></>
              )}
            </button>
          )}
        </div>

        {/* 프로파일 카드 */}
        <div className="rounded-[16px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] px-7 py-7 transition-all duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.10)] hover:-translate-y-px relative overflow-hidden">
          {selected ? <ReporterProfile reporter={selected} /> : <DefaultProfile reporter={topReporter} />}
          {!selected && (
            <BloggingIllustration className="absolute -bottom-[190px] right-[5px] w-[200px] pointer-events-none select-none" />
          )}
        </div>
      </div>

      <div className="mt-[16px]">
        <p className="text-[11px] text-[#CCCCCC]">데이터 출처: 한국은행, 통계청, 매일경제 및 이르미 자체 AI 분석 모델</p>
      </div>
    </div>
  );
}
