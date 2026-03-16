"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  TrendingUp,
  Users,
  Eye,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

/* ── types ── */

interface BeatItem {
  beat: string;
  count: number;
}

interface Reporter {
  name: string;
  total: number;
  primaryBeat: string;
  isSpecialist: boolean;
  beatCount: number;
  recentCount: number;
  avgWeekly: number;
  surgeRatio: number;
  weeklyTrend: number[];
  beatBreakdown: BeatItem[];
}

interface Convergence {
  topic: string;
  writer_count: number;
  beat_count: number;
  article_count: number;
  beatDistribution: BeatItem[];
  topReporters: { name: string; beat: string; count: number }[];
}

interface BeatSummary {
  beat: string;
  writers: number;
  articles: number;
}

interface ReporterData {
  leaderboard: Reporter[];
  convergence: Convergence[];
  beatSummary: BeatSummary[];
  referenceDate: string;
}

/* ── color maps (Toss style: single blue + slate gradation) ── */

const TOSS_BLUE = "#3182F6";

const SLATE_PALETTE = ["#334155", "#475569", "#64748b", TOSS_BLUE, "#94a3b8"];

function getSlateColor(index: number): string {
  return SLATE_PALETTE[index % SLATE_PALETTE.length];
}

/* ── main page ── */

export default function ReportersPage() {
  const [data, setData] = useState<ReporterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showAllConv, setShowAllConv] = useState(false);

  useEffect(() => {
    fetch("/api/reporters")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="mx-auto animate-spin text-[#3182F6]" />
          <p className="mt-3 text-sm text-gray-500">기자 데이터를 분석하는 중...</p>
        </div>
      </div>
    );
  }

  if (!data || data.beatSummary.length === 0) return null;

  const surging = data.leaderboard.filter((r) => r.surgeRatio >= 2);
  const selected = selectedIdx !== null ? data.leaderboard[selectedIdx] : null;

  // Derived insights
  const topBeat = data.beatSummary.reduce((a, b) => (a.articles > b.articles ? a : b), data.beatSummary[0]);
  const restBeats = data.beatSummary.filter((bs) => bs.beat !== topBeat.beat);

  // Convergence: show 3 by default
  const visibleConv = showAllConv ? data.convergence : data.convergence.slice(0, 3);
  const hasMoreConv = data.convergence.length > 3;

  // Top reporter for default profile view
  const topReporter = data.leaderboard[0];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Eye size={20} className="text-[#3182F6]" />
            <h1 className="text-lg font-bold text-gray-900">기자의 시선</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            기자 활동 패턴으로 읽는 위기 신호
          </p>
        </div>
        <span className="text-sm text-gray-400">
          {data.referenceDate} 기준
        </span>
      </div>

      {/* ─── Insight Banner ─── */}
      <div className="animate-fade-in rounded-3xl bg-white border border-gray-200 shadow-sm px-8 py-7">
        <span className="mb-2 inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-black text-[#3182F6] tracking-wider">
          속보
        </span>
        <p className="text-lg font-bold text-gray-900">
          이번 주 핵심 동향
        </p>
        <p className="mt-2.5 text-base leading-relaxed text-gray-500">
          <span className="font-extrabold text-gray-900">
            {topBeat.beat}
          </span>
          {" "}분야에 <span className="text-xl font-extrabold text-gray-900">{topBeat.writers}명</span>의 기자가{" "}
          <span className="text-xl font-extrabold text-gray-900">{topBeat.articles}건</span>을 출고하며 전 분야 최다 활동.
          {data.convergence.length > 0 && (
            <>
              {" "}
              <span className="text-lg font-extrabold text-gray-900">
                {data.convergence.length}건의 다분야 교차취재
              </span>
              가 감지되어 위기 확산 가능성에 주목.
            </>
          )}
          {surging.length > 0 && (
            <>
              {" "}
              <span className="text-lg font-extrabold text-gray-900">
                {surging.length}명
              </span>
              의 기자가 평소 대비 출고량 급증 중.
            </>
          )}
        </p>
      </div>

      {/* ─── Section 1: Beat Activity - Hero + Side Cards ─── */}
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        {/* Hero: Top Beat */}
        <div className="animate-fade-in rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-gray-50/80 px-6 py-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-px">
          <div className="grid grid-cols-2 items-center gap-6">
            {/* Left: Data block */}
            <div className="flex flex-col items-center text-center">
              <span className="rounded-md bg-[#3182F6]/8 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-[#3182F6]">
                전 분야 최다
              </span>
              <p className="mt-2.5 text-sm font-medium text-gray-400">{topBeat.beat}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black leading-none tracking-tighter text-gray-900">{topBeat.articles}</span>
                <span className="text-sm font-medium text-gray-300">건</span>
              </div>
              <div className="mt-3 flex items-center gap-3 text-[12px] text-gray-400">
                <span>기자 <span className="font-bold text-gray-600">{topBeat.writers}명</span></span>
                <span className="h-3.5 w-px bg-gray-200" />
                <span>1인당 <span className="font-bold text-gray-600">{(topBeat.articles / topBeat.writers).toFixed(1)}건</span></span>
              </div>
            </div>

            {/* Right: Speedometer Gauge */}
            <div className="flex flex-col items-center">
              <ActivityGauge
                beatSummary={data.beatSummary}
                convergenceCount={data.convergence.length}
                surgingCount={surging.length}
              />
            </div>
          </div>
        </div>

        {/* Side: Rest Beats */}
        <div className="grid grid-cols-2 gap-4">
          {restBeats.map((bs, i) => (
            <div
              key={bs.beat}
              className="animate-fade-in rounded-2xl bg-gray-50 border border-gray-200 px-6 py-6 transition"
              style={{
                animationDelay: `${(i + 1) * 80}ms`,
                animationFillMode: "both",
              }}
            >
              <p className="text-sm text-gray-500">{bs.beat}</p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-gray-900">{bs.articles}</span>
                <span className="text-xs text-gray-400">건</span>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                기자 {bs.writers}명 / 1인당 {bs.writers > 0 ? (bs.articles / bs.writers).toFixed(1) : "0"}건
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Section 2: Surging Reporters Alert ─── */}
      {surging.length > 0 && (
        <div className="rounded-3xl bg-white border border-gray-200 shadow-sm px-8 py-7">
          <div className="mb-2.5 flex items-center gap-2">
            <Zap size={14} className="text-[#3182F6]" />
            <h2 className="text-base font-bold text-gray-900">
              출고 급증 감지
            </h2>
            <span className="rounded-full bg-[#3182F6]/15 px-2 py-0.5 text-xs font-bold text-[#3182F6]">
              {surging.length}명
            </span>
            {surging.length >= 3 && (
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-black text-[#3182F6]">
                주의
              </span>
            )}
          </div>
          <p className="mb-3 text-sm text-gray-500">
            주평균 대비 2배 이상 출고 - 특정 이슈에 대한 집중 취재 가능성
          </p>
          <div className="flex flex-wrap gap-2">
            {surging.map((r) => (
              <div
                key={r.name}
                className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-3"
              >
                <span className="text-xs font-semibold text-gray-900">
                  {r.name.split("(")[0].trim()}
                </span>
                <span className="inline-block h-2 w-2 rounded-full bg-[#3182F6]" />
                <span className="text-xs text-gray-500">
                  이번주 {r.recentCount}건
                </span>
                <span className="rounded-md bg-[#3182F6]/15 px-2 py-0.5 text-sm font-bold text-[#3182F6]">
                  x{r.surgeRatio}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Section 3: Cross-beat Convergence ─── */}
      {data.convergence.length > 0 && (
        <div className="rounded-3xl bg-white border border-gray-200 shadow-sm px-8 py-7">
          <div className="mb-2 flex items-center gap-2">
            <Users size={16} className="text-[#3182F6]" />
            <h2 className="text-base font-bold text-gray-900">교차취재 감지</h2>
            <span className="rounded-full bg-[#3182F6]/15 px-2.5 py-0.5 text-xs font-bold text-[#3182F6]">
              {data.convergence.length}건
            </span>
            {data.convergence.length >= 5 && (
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-black text-[#3182F6]">
                긴급
              </span>
            )}
          </div>
          <p className="mb-4 text-sm text-gray-500">
            3개 이상 분야 기자가 동시에 집중하는 주제 - 위기가 분야를 넘어 확산되고 있다는 신호
          </p>

          {/* Topic cards */}
          <div className="space-y-1">
            {visibleConv.map((c) => (
              <div
                key={c.topic}
                className="group flex items-center gap-4 rounded-xl px-4 py-3.5 transition hover:bg-gray-50"
              >
                {/* Mini donut */}
                <div className="h-[48px] w-[48px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={c.beatDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={12}
                        outerRadius={22}
                        dataKey="count"
                        nameKey="beat"
                        strokeWidth={0}
                      >
                        {c.beatDistribution.map((entry, idx) => (
                          <Cell
                            key={entry.beat}
                            fill={getSlateColor(idx)}
                            opacity={0.9}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Topic info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold text-gray-900">
                    {c.topic}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {c.beat_count}개 분야 기자 {c.writer_count}명이 동시 취재 중
                  </p>
                  {/* Beat dots */}
                  <div className="mt-1 flex items-center gap-2">
                    {c.beatDistribution.map((bd, idx) => (
                      <div key={bd.beat} className="flex items-center gap-1 text-xs text-gray-400">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: getSlateColor(idx) }}
                        />
                        {bd.beat}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top reporters */}
                <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
                  {c.topReporters.slice(0, 2).map((r) => (
                    <span
                      key={r.name}
                      className="flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-600"
                    >
                      {r.name}
                    </span>
                  ))}
                  {c.topReporters.length > 2 && (
                    <span className="text-xs text-gray-400">
                      +{c.topReporters.length - 2}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Show more / less toggle */}
          {hasMoreConv && (
            <button
              onClick={() => setShowAllConv(!showAllConv)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-gray-400 transition hover:bg-gray-100 hover:text-gray-900"
            >
              {showAllConv ? (
                <>접기 <ChevronUp size={14} /></>
              ) : (
                <>나머지 {data.convergence.length - 3}건 더 보기 <ChevronDown size={14} /></>
              )}
            </button>
          )}
        </div>
      )}

      {/* ─── Section 4: Leaderboard + Profile ─── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* Leaderboard */}
        <div className="rounded-3xl bg-white border border-gray-200 shadow-sm px-7 py-7">
          <h2 className="mb-1 text-lg font-bold text-gray-900">
            기자 활동 리더보드
          </h2>
          <p className="mb-4 text-sm text-gray-400">
            기사 출고량 기준 상위 기자 - 클릭하여 상세 프로파일 보기
          </p>
          <div className="space-y-1">
            {data.leaderboard.map((r, i) => {
              const isSelected = selectedIdx === i;
              const totalForBar = r.beatBreakdown.reduce((s, b) => s + b.count, 0) || 1;

              return (
                <button
                  key={r.name}
                  onClick={() => setSelectedIdx(isSelected ? null : i)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-3 text-left transition ${
                    isSelected
                      ? "bg-[#3182F6]/8"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <span className="w-5 text-right text-xs font-bold text-gray-400">
                    {i + 1}
                  </span>

                  {/* Beat breakdown mini bar */}
                  <div className="flex h-2 w-10 shrink-0 overflow-hidden rounded-full opacity-80">
                    {r.beatBreakdown.map((b, idx) => (
                      <div
                        key={b.beat}
                        style={{
                          width: `${(b.count / totalForBar) * 100}%`,
                          backgroundColor: getSlateColor(idx),
                        }}
                      />
                    ))}
                  </div>

                  <span className={`min-w-0 flex-1 truncate text-sm font-medium ${r.surgeRatio >= 1.5 ? "text-gray-900" : "text-gray-500"}`}>
                    {r.name.split("(")[0].trim()}
                  </span>

                  {r.surgeRatio >= 1.5 && (
                    <span className="shrink-0 rounded-md bg-[#3182F6]/15 px-1.5 py-0.5 text-xs font-bold text-[#3182F6]">
                      x{r.surgeRatio}
                    </span>
                  )}

                  <span className="shrink-0 rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {r.primaryBeat}
                    {r.isSpecialist ? " 전문" : ""}
                  </span>
                  <span className="w-14 text-right text-xs text-gray-400">
                    {r.total}건
                  </span>

                  {/* Sparkline */}
                  {r.weeklyTrend.length > 0 && (
                    <div className="hidden h-5 w-12 shrink-0 lg:block">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={r.weeklyTrend.map((v, idx) => ({ w: idx, v }))}>
                          <Line
                            type="monotone"
                            dataKey="v"
                            stroke={TOSS_BLUE}
                            strokeWidth={1}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Reporter Profile Card */}
        <div className="rounded-3xl bg-white border border-gray-200 shadow-sm px-7 py-7">
          {selected ? (
            <ReporterProfile reporter={selected} />
          ) : (
            <DefaultProfile reporter={topReporter} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Activity Speedometer Gauge ── */

function ActivityGauge({
  beatSummary,
  convergenceCount,
  surgingCount,
}: {
  beatSummary: BeatSummary[];
  convergenceCount: number;
  surgingCount: number;
}) {
  // Calculate intensity score (0-100)
  const totalArticles = beatSummary.reduce((s, b) => s + b.articles, 0);
  const totalWriters = beatSummary.reduce((s, b) => s + b.writers, 0);
  const perCapita = totalWriters > 0 ? totalArticles / totalWriters : 0;

  // Weighted score: article volume + convergence pressure + surge alerts
  const articleScore = Math.min(totalArticles / 10, 40); // max 40
  const convergenceScore = Math.min(convergenceCount * 5, 30); // max 30
  const surgeScore = Math.min(surgingCount * 10, 30); // max 30
  const intensity = Math.min(Math.round(articleScore + convergenceScore + surgeScore), 100);

  // Color + label by level
  const getLevel = (v: number) => {
    if (v >= 75) return { color: "#EF4444", bg: "#FEE2E2", label: "긴급", arc: "#EF4444" };
    if (v >= 50) return { color: "#F59E0B", bg: "#FEF3C7", label: "주의", arc: "#F59E0B" };
    if (v >= 25) return { color: "#3B82F6", bg: "#DBEAFE", label: "관찰", arc: "#3B82F6" };
    return { color: "#22C55E", bg: "#DCFCE7", label: "안전", arc: "#22C55E" };
  };

  const level = getLevel(intensity);

  // SVG arc math (180 degree semicircle gauge)
  const cx = 90, cy = 80, r = 64;
  const startAngle = Math.PI;
  const endAngle = 0;
  const sweepAngle = startAngle - endAngle;

  const valueEndAngle = startAngle - (intensity / 100) * sweepAngle;
  const valueArcD = describeArc(cx, cy, r, startAngle, valueEndAngle);

  // Indicator dot at arc tip (instead of needle - no overlap)
  const dotX = cx + r * Math.cos(valueEndAngle);
  const dotY = cy - r * Math.sin(valueEndAngle);

  const zones = [
    { start: 0, end: 0.25, color: "#22C55E" },
    { start: 0.25, end: 0.5, color: "#3B82F6" },
    { start: 0.5, end: 0.75, color: "#F59E0B" },
    { start: 0.75, end: 1, color: "#EF4444" },
  ];

  return (
    <div className="flex flex-col items-center">
      <svg width="180" height="108" viewBox="0 0 180 108">
        {/* Zone arcs (background tracks) */}
        {zones.map((zone, i) => {
          const zStart = startAngle - zone.start * sweepAngle;
          const zEnd = startAngle - zone.end * sweepAngle;
          return (
            <path
              key={i}
              d={describeArc(cx, cy, r, zStart, zEnd)}
              fill="none"
              stroke={zone.color}
              strokeWidth={10}
              strokeOpacity={0.12}
              strokeLinecap="butt"
            />
          );
        })}

        {/* Value arc */}
        <path
          d={valueArcD}
          fill="none"
          stroke={level.arc}
          strokeWidth={10}
          strokeLinecap="round"
        />

        {/* Indicator dot on arc tip */}
        <circle cx={dotX} cy={dotY} r={6} fill={level.color} />
        <circle cx={dotX} cy={dotY} r={3} fill="white" />

        {/* Zone labels at ends */}
        <text x="18" y="92" fontSize="9" fill="#D1D5DB" textAnchor="middle" fontWeight="500">안전</text>
        <text x="162" y="92" fontSize="9" fill="#D1D5DB" textAnchor="middle" fontWeight="500">긴급</text>

        {/* Center number - clear space, no overlap */}
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          fontSize="28"
          fontWeight="900"
          fill={level.color}
          letterSpacing="-1.5"
        >
          {intensity}
        </text>
        <text
          x={cx}
          y={cy + 8}
          textAnchor="middle"
          fontSize="10"
          fill="#9CA3AF"
          fontWeight="500"
        >
          / 100
        </text>
      </svg>

      {/* Label */}
      <div className="-mt-1 flex flex-col items-center gap-1">
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
          style={{ backgroundColor: level.bg, color: level.color }}
        >
          취재 과열도 {level.label}
        </span>
        <p className="text-center text-[11px] text-gray-400">
          교차 {convergenceCount}건 · 급증 {surgingCount}명 · {perCapita.toFixed(1)}건/인
        </p>
      </div>
    </div>
  );
}

/** Describe a semicircular arc path from angle a1 to a2 (radians, standard math convention) */
function describeArc(cx: number, cy: number, r: number, a1: number, a2: number): string {
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy - r * Math.sin(a1);
  const x2 = cx + r * Math.cos(a2);
  const y2 = cy - r * Math.sin(a2);
  const largeArc = Math.abs(a1 - a2) > Math.PI ? 1 : 0;
  // Clockwise in SVG = sweeping from a1 to a2 where a1 > a2
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

/* ── Default Profile (when none selected) ── */

function DefaultProfile({ reporter }: { reporter: Reporter | undefined }) {
  if (!reporter) return null;

  const topBeat = reporter.beatBreakdown[0];
  const totalArticles = reporter.beatBreakdown.reduce((s, b) => s + b.count, 0) || 1;
  const topPct = topBeat ? Math.round((topBeat.count / totalArticles) * 100) : 0;

  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#3182F6]">
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
        <p className="text-sm text-gray-500">
          총 <span className="font-bold text-gray-900">{reporter.total}건</span>의 기사를 출고한{" "}
          {reporter.isSpecialist ? (
            <>
              <span className="font-semibold text-[#3182F6]">
                {reporter.primaryBeat}
              </span>{" "}
              전문 기자 (기사의 {topPct}%가 해당 분야)
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
          <p className="text-xl font-bold text-gray-900">{reporter.avgWeekly}</p>
          <p className="text-xs text-gray-400">주평균</p>
        </div>
        <div className="rounded-2xl bg-gray-100 px-5 py-4">
          <p className="text-xl font-bold text-gray-900">{reporter.recentCount}</p>
          <p className="text-xs text-gray-400">이번주</p>
        </div>
        <div className="rounded-2xl bg-gray-100 px-5 py-4">
          <p className={`text-xl font-bold ${reporter.surgeRatio >= 2 ? "text-[#3182F6]" : "text-gray-900"}`}>
            x{reporter.surgeRatio}
          </p>
          <p className="text-xs text-gray-400">급등 배수</p>
        </div>
      </div>

      {/* Beat breakdown as horizontal bar */}
      <div>
        <p className="mb-2 text-xs font-semibold text-gray-400">분야별 비중</p>
        <div className="flex h-3 w-full overflow-hidden rounded-full">
          {reporter.beatBreakdown.map((b, idx) => (
            <div
              key={b.beat}
              style={{
                width: `${(b.count / totalArticles) * 100}%`,
                backgroundColor: getSlateColor(idx),
              }}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {reporter.beatBreakdown.map((b, idx) => (
            <div key={b.beat} className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: getSlateColor(idx) }} />
              {b.beat} {Math.round((b.count / totalArticles) * 100)}%
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-gray-400">
        좌측 리더보드에서 기자를 클릭하면 상세 프로파일을 확인할 수 있습니다
      </p>
    </div>
  );
}

/* ── Reporter Profile Sub-component ── */

function ReporterProfile({ reporter }: { reporter: Reporter }) {
  const totalArticles = reporter.beatBreakdown.reduce((s, b) => s + b.count, 0) || 1;
  const trendData = reporter.weeklyTrend.map((v, i) => ({ week: `${i + 1}주`, v }));

  const topBeat = reporter.beatBreakdown[0];
  const topBeatPct = topBeat ? Math.round((topBeat.count / totalArticles) * 100) : 0;

  return (
    <div className="animate-fade-in space-y-4">
      {/* Name & Beat */}
      <div>
        <h3 className="text-lg font-bold text-gray-900">
          {reporter.name.split("(")[0].trim()}
        </h3>
        <p className="mt-0.5 text-xs text-gray-400">
          {reporter.name.includes("(") ? reporter.name.slice(reporter.name.indexOf("(")) : ""}
        </p>
        <p className="mt-2 rounded-2xl bg-gray-100 px-5 py-4 text-sm text-gray-500">
          {reporter.isSpecialist ? (
            <>
              <span className="font-semibold text-[#3182F6]">
                {reporter.primaryBeat}
              </span>
              {" "}전문 기자 - 기사의 {topBeatPct}%가 이 분야에 집중
            </>
          ) : (
            <>
              <span className="font-semibold text-gray-900">{reporter.beatCount}개 분야</span>를 넘나드는 다분야 기자
              {topBeat && (
                <>, 주력은{" "}
                  <span className="text-[#3182F6]">
                    {reporter.primaryBeat}
                  </span>
                  ({topBeatPct}%)
                </>
              )}
            </>
          )}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-gray-100 px-5 py-4">
          <p className="text-xs text-gray-400">총 기사</p>
          <p className="text-xl font-bold text-gray-900">{reporter.total}</p>
        </div>
        <div className="rounded-2xl bg-gray-100 px-5 py-4">
          <p className="text-xs text-gray-400">주평균</p>
          <p className="text-xl font-bold text-gray-900">{reporter.avgWeekly}</p>
        </div>
        <div className="rounded-2xl bg-gray-100 px-5 py-4">
          <p className="text-xs text-gray-400">이번주</p>
          <p className="text-xl font-bold text-gray-900">{reporter.recentCount}</p>
        </div>
        <div className="rounded-2xl bg-gray-100 px-5 py-4">
          <p className="text-xs text-gray-400">급등 배수</p>
          <p
            className={`text-xl font-bold ${
              reporter.surgeRatio >= 2
                ? "text-[#3182F6]"
                : "text-gray-900"
            }`}
          >
            x{reporter.surgeRatio}
          </p>
        </div>
      </div>

      {/* Beat donut chart */}
      <div>
        <p className="mb-2 text-xs font-semibold text-gray-400">분야별 기사 분포</p>
        <div className="flex items-center gap-4">
          <div className="relative h-[110px] w-[110px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reporter.beatBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={48}
                  dataKey="count"
                  nameKey="beat"
                  strokeWidth={0}
                >
                  {reporter.beatBreakdown.map((entry, idx) => (
                    <Cell
                      key={entry.beat}
                      fill={getSlateColor(idx)}
                      opacity={0.85}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#FFFFFF",
                    border: "1px solid #E5E7EB",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [`${value}건 (${Math.round((Number(value) / totalArticles) * 100)}%)`]}
                />
              </PieChart>
            </ResponsiveContainer>
            {reporter.isSpecialist && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-[#3182F6]">전문</span>
              </div>
            )}
          </div>
          <div className="space-y-1">
            {reporter.beatBreakdown.map((b, idx) => (
              <div key={b.beat} className="flex items-center gap-2 text-xs">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: getSlateColor(idx) }}
                />
                <span className="text-gray-400">{b.beat}</span>
                <span className="font-medium text-gray-600">
                  {Math.round((b.count / totalArticles) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly trend chart */}
      <div>
        <p className="mb-2 text-xs font-semibold text-gray-400">8주 출고 추이</p>
        <div className="h-[90px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={TOSS_BLUE}
                strokeWidth={1.5}
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
                formatter={(value) => [`${value}건`, "출고량"]}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
