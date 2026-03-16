import React, { useState, useEffect } from "react";
import { BloggingIllustration } from "../components/BloggingIllustration";
import logoImage from "figma:asset/e1ee2c70c87487ad23c9033fe13a21c1a3a52ca6.png";
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
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
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

/* ── beat badge color map ── */

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

function getBeatBadgeStyle(beat: string) {
  return BEAT_BADGE[beat] ?? { bg: "#F3F4F6", text: "#374151" };
}

/* ── mock data ── */

const mockData: ReporterData = {
  referenceDate: "2026.03.15",
  beatSummary: [
    { beat: "정치", writers: 120, articles: 450 },
    { beat: "경제", writers: 95, articles: 380 },
    { beat: "사회", writers: 150, articles: 620 },
    { beat: "IT/과학", writers: 45, articles: 180 },
    { beat: "국제", writers: 30, articles: 120 },
  ],
  convergence: [
    {
      topic: "부동산 규제 완화 및 대출 정책 변화",
      writer_count: 24,
      beat_count: 3,
      article_count: 85,
      beatDistribution: [
        { beat: "경제", count: 40 },
        { beat: "정치", count: 25 },
        { beat: "사회", count: 20 },
      ],
      topReporters: [
        { name: "김경제", beat: "경제", count: 12 },
        { name: "이정치", beat: "정치", count: 8 },
        { name: "박사회", beat: "사회", count: 7 },
      ],
    },
    {
      topic: "의대 정원 확대 및 의료계 파업",
      writer_count: 35,
      beat_count: 4,
      article_count: 150,
      beatDistribution: [
        { beat: "사회", count: 80 },
        { beat: "정치", count: 40 },
        { beat: "경제", count: 20 },
        { beat: "문화", count: 10 },
      ],
      topReporters: [
        { name: "최사회", beat: "사회", count: 25 },
        { name: "정의료", beat: "사회", count: 18 },
      ],
    },
    {
      topic: "반도체 클러스터 조성 및 세제 지원",
      writer_count: 18,
      beat_count: 3,
      article_count: 65,
      beatDistribution: [
        { beat: "경제", count: 35 },
        { beat: "IT/과학", count: 20 },
        { beat: "정치", count: 10 },
      ],
      topReporters: [
        { name: "강반도", beat: "경제", count: 15 },
        { name: "윤테크", beat: "IT/과학", count: 12 },
      ],
    },
    {
      topic: "청년 실업 및 고용 절벽 현실화",
      writer_count: 20,
      beat_count: 3,
      article_count: 72,
      beatDistribution: [
        { beat: "사회", count: 38 },
        { beat: "경제", count: 22 },
        { beat: "정치", count: 12 },
      ],
      topReporters: [
        { name: "한청년", beat: "사회", count: 14 },
        { name: "오고용", beat: "경제", count: 10 },
      ],
    },
  ],
  leaderboard: [
    {
      name: "김민재 (경제부)",
      total: 45,
      primaryBeat: "경제",
      isSpecialist: true,
      beatCount: 1,
      recentCount: 18,
      avgWeekly: 8,
      surgeRatio: 2.2,
      weeklyTrend: [5, 6, 8, 7, 9, 8, 12, 18],
      beatBreakdown: [{ beat: "경제", count: 45 }],
    },
    {
      name: "이수진 (사회부)",
      total: 38,
      primaryBeat: "사회",
      isSpecialist: false,
      beatCount: 3,
      recentCount: 15,
      avgWeekly: 7,
      surgeRatio: 2.1,
      weeklyTrend: [6, 7, 6, 8, 7, 9, 11, 15],
      beatBreakdown: [
        { beat: "사회", count: 25 },
        { beat: "정치", count: 8 },
        { beat: "문화", count: 5 },
      ],
    },
    {
      name: "박준영 (정치부)",
      total: 35,
      primaryBeat: "정치",
      isSpecialist: true,
      beatCount: 2,
      recentCount: 10,
      avgWeekly: 9,
      surgeRatio: 1.1,
      weeklyTrend: [8, 9, 8, 10, 9, 8, 10, 10],
      beatBreakdown: [
        { beat: "정치", count: 32 },
        { beat: "사회", count: 3 },
      ],
    },
    {
      name: "최유리 (IT/과학)",
      total: 30,
      primaryBeat: "IT/과학",
      isSpecialist: true,
      beatCount: 1,
      recentCount: 14,
      avgWeekly: 6,
      surgeRatio: 2.3,
      weeklyTrend: [4, 5, 6, 5, 7, 6, 9, 14],
      beatBreakdown: [{ beat: "IT/과학", count: 30 }],
    },
    {
      name: "정하늘 (국제부)",
      total: 28,
      primaryBeat: "국제",
      isSpecialist: true,
      beatCount: 2,
      recentCount: 9,
      avgWeekly: 6,
      surgeRatio: 1.5,
      weeklyTrend: [5, 6, 5, 7, 6, 7, 8, 9],
      beatBreakdown: [
        { beat: "국제", count: 24 },
        { beat: "정치", count: 4 },
      ],
    },
    {
      name: "강동훈 (경제부)",
      total: 25,
      primaryBeat: "경제",
      isSpecialist: false,
      beatCount: 2,
      recentCount: 8,
      avgWeekly: 6,
      surgeRatio: 1.3,
      weeklyTrend: [5, 5, 6, 6, 7, 6, 7, 8],
      beatBreakdown: [
        { beat: "경제", count: 18 },
        { beat: "부동산", count: 7 },
      ],
    },
    {
      name: "오미래 (사회부)",
      total: 22,
      primaryBeat: "사회",
      isSpecialist: true,
      beatCount: 1,
      recentCount: 7,
      avgWeekly: 5,
      surgeRatio: 1.4,
      weeklyTrend: [4, 4, 5, 5, 5, 6, 6, 7],
      beatBreakdown: [{ beat: "사회", count: 22 }],
    },
    {
      name: "임서준 (IT/과학)",
      total: 20,
      primaryBeat: "IT/과학",
      isSpecialist: true,
      beatCount: 1,
      recentCount: 6,
      avgWeekly: 5,
      surgeRatio: 1.2,
      weeklyTrend: [3, 4, 5, 4, 5, 5, 5, 6],
      beatBreakdown: [{ beat: "IT/과학", count: 20 }],
    },
    {
      name: "한지수 (정치부)",
      total: 18,
      primaryBeat: "정치",
      isSpecialist: false,
      beatCount: 2,
      recentCount: 5,
      avgWeekly: 4,
      surgeRatio: 1.0,
      weeklyTrend: [4, 4, 4, 5, 4, 4, 4, 5],
      beatBreakdown: [
        { beat: "정치", count: 14 },
        { beat: "사회", count: 4 },
      ],
    },
    {
      name: "장민호 (문화부)",
      total: 15,
      primaryBeat: "문화",
      isSpecialist: true,
      beatCount: 1,
      recentCount: 4,
      avgWeekly: 3,
      surgeRatio: 0.9,
      weeklyTrend: [3, 3, 4, 3, 3, 4, 3, 4],
      beatBreakdown: [{ beat: "문화", count: 15 }],
    },
  ],
};

/* ── main page ── */

export function ReportersPage() {
  const [data, setData] = useState<ReporterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showAllConv, setShowAllConv] = useState(false);
  const [showAllSurging, setShowAllSurging] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setData(mockData);
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
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

  // Convergence: show 2 by default
  const visibleConv = showAllConv ? data.convergence : data.convergence.slice(0, 2);
  const hasMoreConv = data.convergence.length > 2;

  // Surging: show 3 by default
  const visibleSurging = showAllSurging ? surging : surging.slice(0, 3);
  const hasMoreSurging = surging.length > 3;

  // Top reporter for default profile view
  const topReporter = data.leaderboard[0];

  return (
    <div className="space-y-4 pb-10">
      {/* Page Header */}
      <div className="flex items-center justify-between mt-[12px] mb-[12px]">
        <div className="text-[#AAAAAA] text-[14px]">기자 활동 패턴으로 읽는 위기 신호를 확인해 보세요</div>
      </div>

      {/* ─── Insight Banner ─── */}
      <div className="animate-fade-in rounded-[16px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] px-5 py-4 flex items-center gap-4 flex-wrap relative overflow-hidden">
        <span className="shrink-0 rounded-full bg-[#EFF6FF] px-2.5 py-0.5 text-xs font-black text-[#3182F6] tracking-wider">요약</span>
        <p className="text-gray-800 flex-1 min-w-0 text-[16px]">
          <span className="font-extrabold text-gray-900">{topBeat.beat}</span>
          {" "}분야{" "}
          <span className="font-extrabold text-gray-900">{topBeat.writers}명</span>의 기자가{" "}
          <span className="font-extrabold text-gray-900">{topBeat.articles}건</span> 출고하며 전 분야 최다 활동.{" "}
          기사 출고 급증 기자{" "}
          <span className="font-extrabold text-[#3182F6]">{surging.length}명</span>,{" "}
          교차취재{" "}
          <span className="font-extrabold text-[#3182F6]">{data.convergence.length}건</span> 감지.
        </p>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-[44px] h-[44px] pointer-events-none select-none">
          <img
            src={logoImage}
            alt=""
            className="w-full h-full object-contain"
            style={{ filter: "grayscale(1) brightness(0.75)", opacity: 0.12 }}
          />
        </div>
      </div>

      {/* ─── Section 1: Beat Activity - Hero + Side Cards ─── */}
      <div className="grid gap-3 items-stretch" style={{ gridTemplateColumns: "2fr 3fr" }}>
        {/* Hero: Top Beat */}
        <div className="animate-fade-in rounded-[16px] bg-gradient-to-br from-[#3182F6] to-[#1D4ED8] px-5 py-5 shadow-[0_2px_12px_rgba(49,130,246,0.25)] transition-all duration-200 hover:shadow-[0_4px_20px_rgba(49,130,246,0.35)] hover:-translate-y-px">
          <div className="grid grid-cols-2 items-center gap-4 h-full">
            {/* Left: Data block */}
            <div className="flex flex-col items-center text-center">
              <span className="rounded-md bg-white/20 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-white">
                전 분야 최다
              </span>
              <p className="mt-2 text-sm font-medium text-white/60">{topBeat.beat}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black leading-none tracking-tighter text-white">{topBeat.articles}</span>
                <span className="text-sm font-medium text-white/50">건</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-white/50">
                <span>기자 <span className="font-bold text-white/90">{topBeat.writers}명</span></span>
                <span className="h-3 w-px bg-white/30" />
                <span>1인당 <span className="font-bold text-white/90">{(topBeat.articles / topBeat.writers).toFixed(1)}건</span></span>
              </div>
            </div>
            {/* Right: Gauge */}
            <div className="flex flex-col items-center">
              <ActivityGauge
                beatSummary={data.beatSummary}
                convergenceCount={data.convergence.length}
                surgingCount={surging.length}
                dark={true}
              />
            </div>
          </div>
        </div>

        {/* Rest Beats - no card, just dividers */}
        <div className="flex items-stretch divide-x divide-gray-200">
          {restBeats.map((bs, i) => {
            const totalArticles = data.beatSummary.reduce((s, b) => s + b.articles, 0);
            const pct = totalArticles > 0 ? Math.round((bs.articles / totalArticles) * 100) : 0;
            return (
              <div
                key={bs.beat}
                className="flex-1 flex flex-col justify-center px-5 py-3"
                style={{
                  animationDelay: `${(i + 1) * 80}ms`,
                  animationFillMode: "both",
                }}
              >
                <p className="text-xs text-gray-400">{bs.beat}</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-gray-900">{bs.articles}</span>
                  <span className="text-xs text-gray-400">건</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-gray-400 whitespace-nowrap">
                  <span>기자 <span className="font-bold text-gray-600">{bs.writers}명</span></span>
                  <span className="h-3 w-px bg-gray-300" />
                  <span>1인당 <span className="font-bold text-gray-600">{bs.writers > 0 ? (bs.articles / bs.writers).toFixed(1) : "0"}건</span></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Section 2 & 3: Surging + Convergence side by side ─── */}
      <div className="grid gap-3 items-stretch" style={{ gridTemplateColumns: "2fr 3fr" }}>
        {/* Left: 출고 급증 감지 */}
        <div className="rounded-[16px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] px-6 pt-6 pb-3 flex flex-col transition-all duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.10)] hover:-translate-y-px relative overflow-hidden">
          <div className="mb-2.5 flex items-center gap-2">
            
            <div className="w-1.5 h-1.5 rounded-full bg-[#3182F6]"></div>
            <h2 className="text-base font-bold text-gray-900">출고 급증 감지</h2>
            <span className="rounded-full bg-[#3182F6]/15 px-2 py-0.5 text-xs font-bold text-[#3182F6]">
              {surging.length}명
            </span>
            {surging.length >= 3 && (
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-black text-[#3182F6]">
                주의
              </span>
            )}
          </div>
          <p className="mb-5 text-sm text-gray-500">
            주평균 대비 2배 이상 출고 - 특정 이 대한 집중 취재 가능성
          </p>
          <div className="grid grid-cols-1 gap-2">
            {visibleSurging.map((r) => (
              <div
                key={r.name}
                className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-3"
              >
                <span className="font-semibold text-gray-900 text-[14px] flex-1">
                  {r.name.split("(")[0].trim()}
                </span>
                <span className="text-xs text-gray-500">
                  이번주 {r.recentCount}건
                </span>
                <span className="rounded-md bg-[#3182F6]/15 px-2 py-0.5 text-sm font-bold text-[#3182F6]">
                  x{r.surgeRatio}
                </span>
              </div>
            ))}
          </div>
          {/* 더보기 */}
          {hasMoreSurging && (
            <button
              onClick={() => setShowAllSurging(!showAllSurging)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-gray-400 transition hover:bg-gray-100 hover:text-gray-900"
            >
              {showAllSurging ? (
                <>접기 <ChevronUp size={14} /></>
              ) : (
                <>나머지 {surging.length - 3}명 더 보기 <ChevronDown size={14} /></>
              )}
            </button>
          )}
          {/* Gray logo watermark — visible when 교차취재 더보기 is expanded */}
          {showAllConv && (
            <div className="absolute bottom-4 right-4 w-[96px] h-[96px] pointer-events-none select-none">
              <img
                src={logoImage}
                alt=""
                className="w-full h-full object-contain"
                style={{ filter: "grayscale(1) brightness(0.6)", opacity: 0.13 }}
              />
            </div>
          )}
        </div>

        {/* Right: 교차취재 감지 */}
        <div className="rounded-[16px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] px-6 pt-6 pb-3 flex flex-col transition-all duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.10)] hover:-translate-y-px">
          <div className="mb-2.5 flex items-center gap-2">
            
            <div className="w-1.5 h-1.5 rounded-full bg-[#3182F6]"></div>
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
          <p className="mb-5 text-sm text-gray-500">
            3개 이상 분야 기자가 동시에 집중하는 주제 - 위기가 분야를 넘어 확산되고 있다는 신호
          </p>

          {/* Topic cards */}
          <div className="divide-y divide-gray-100 flex-1">
            {visibleConv.map((c) => (
              <div
                key={c.topic}
                className="group flex items-center gap-4 rounded-xl px-4 py-2.5 transition hover:bg-gray-50"
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

                {/* Top reporters — fixed-width, always rendered for consistent row height */}
                <div className="shrink-0 flex items-center gap-1.5 w-[148px] justify-end">
                  {[0, 1].map((slot) => {
                    const r = c.topReporters[slot];
                    return r ? (
                      <span
                        key={r.name}
                        className="flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-600 whitespace-nowrap"
                      >
                        {r.name}
                      </span>
                    ) : (
                      <span key={slot} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs invisible">
                        _
                      </span>
                    );
                  })}
                  <span
                    className={`text-xs font-medium text-gray-400 min-w-[24px] text-right ${c.topReporters.length > 2 ? "visible" : "invisible"}`}
                  >
                    +{c.topReporters.length - 2}
                  </span>
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
                <>나머지 {data.convergence.length - 2}건 더 보기 <ChevronDown size={14} /></>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ─── Section 4: Leaderboard + Profile ─── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* Leaderboard Table */}
        <div className="rounded-[16px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] px-7 py-6 transition-all duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.10)] hover:-translate-y-px">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#3182F6]"></div>
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
              {data.leaderboard.map((r, i) => {
                const isSelected = selectedIdx === i;
                const totalForBar = r.beatBreakdown.reduce((s, b) => s + b.count, 0) || 1;
                const badgeStyle = getBeatBadgeStyle(r.primaryBeat);
                return (
                  <tr
                    key={r.name}
                    onClick={() => setSelectedIdx(isSelected ? null : i)}
                    className={`cursor-pointer border-b border-gray-50 last:border-0 transition-colors ${
                      isSelected ? "bg-[#3182F6]/5" : "hover:bg-gray-50"
                    }`}
                  >
                    {/* # */}
                    <td className={`py-2.5 pr-3 text-xs font-bold align-middle ${i < 3 ? "text-[#3182F6]" : "text-gray-300"}`}>{i + 1}</td>

                    {/* 기자명 */}
                    <td className="py-2.5 pr-4 align-middle">
                      <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                        {r.name.split("(")[0].trim()} 기자
                      </span>
                    </td>

                    {/* 주 분야 */}
                    <td className="py-2.5 pr-4 align-middle"><span className="text-xs text-gray-400 whitespace-nowrap">{r.primaryBeat}{r.isSpecialist ? " 전문" : ""}</span></td>

                    {/* 출고수 */}
                    <td className="py-2.5 pr-4 text-right text-sm font-bold text-gray-900 align-middle whitespace-nowrap">
                      {r.total}건
                    </td>

                    {/* 교차비율 */}
                    <td className="py-2.5 pr-4 text-right align-middle">
                      <span
                        className={`text-sm font-bold ${
                          r.surgeRatio >= 2
                            ? "text-[#3182F6]"
                            : r.surgeRatio >= 1.5
                            ? "text-gray-700"
                            : "text-gray-400"
                        }`}
                      >
                        x{r.surgeRatio}
                      </span>
                    </td>

                    {/* 추이 - mini bar chart */}
                    <td className="py-2.5 text-right align-middle">
                      <div className="inline-flex items-end justify-end gap-px h-5 w-12">
                        {r.weeklyTrend.slice(-6).map((v, idx, arr) => {
                          const max = Math.max(...arr, 1);
                          const heightPct = Math.max((v / max) * 100, 12);
                          const isLast = idx === arr.length - 1;
                          return (
                            <div
                              key={idx}
                              className="flex-1 rounded-sm"
                              style={{
                                height: `${heightPct}%`,
                                backgroundColor: isLast ? TOSS_BLUE : "#CBD5E1",
                                opacity: 0.4 + (idx / arr.length) * 0.6,
                              }}
                            />
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* 더보기 */}
          <button className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium text-gray-400 transition hover:bg-gray-50 hover:text-gray-700 border border-dashed border-gray-200">
            더보기 · 1,067명 남음
            <ChevronDown size={13} />
          </button>
        </div>

        {/* Reporter Profile Card */}
        <div className="rounded-[16px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] px-7 py-7 transition-all duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.10)] hover:-translate-y-px relative overflow-hidden">
          {selected ? (
            <ReporterProfile reporter={selected} />
          ) : (
            <DefaultProfile reporter={topReporter} />
          )}
          {!selected && (
            <BloggingIllustration className="absolute -bottom-[190px] right-[5px] w-[200px] pointer-events-none select-none" />
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
  dark = false,
}: {
  beatSummary: BeatSummary[];
  convergenceCount: number;
  surgingCount: number;
  dark?: boolean;
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
              stroke={dark ? "#FFFFFF" : zone.color}
              strokeWidth={10}
              strokeOpacity={dark ? 0.15 : 0.12}
              strokeLinecap="butt"
            />
          );
        })}

        {/* Value arc */}
        <path
          d={valueArcD}
          fill="none"
          stroke={dark ? "#FFFFFF" : level.arc}
          strokeWidth={10}
          strokeLinecap="round"
        />

        {/* Indicator dot on arc tip */}
        <circle cx={dotX} cy={dotY} r={6} fill={dark ? "#FFFFFF" : level.color} />
        <circle cx={dotX} cy={dotY} r={3} fill={dark ? "rgba(30,58,138,0.8)" : "white"} />

        {/* Zone labels at ends */}
        <text x="18" y="92" fontSize="9" fill={dark ? "rgba(255,255,255,0.4)" : "#D1D5DB"} textAnchor="middle" fontWeight="500">안전</text>
        <text x="162" y="92" fontSize="9" fill={dark ? "rgba(255,255,255,0.4)" : "#D1D5DB"} textAnchor="middle" fontWeight="500">긴급</text>

        {/* Center number - clear space, no overlap */}
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          fontSize="28"
          fontWeight="900"
          fill={dark ? "#FFFFFF" : level.color}
          letterSpacing="-1.5"
        >
          {intensity}
        </text>
        <text
          x={cx}
          y={cy + 8}
          textAnchor="middle"
          fontSize="10"
          fill={dark ? "rgba(255,255,255,0.45)" : "#9CA3AF"}
          fontWeight="500"
        >
          / 100
        </text>
      </svg>

      {/* Label */}
      <div className="-mt-1 flex flex-col items-center gap-1">
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
          style={
            dark
              ? { backgroundColor: "rgba(255,255,255,0.18)", color: "#FFFFFF" }
              : { backgroundColor: level.bg, color: level.color }
          }
        >
          취재 과열도 {level.label}
        </span>
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
          총 <span className="font-bold text-gray-900">{reporter.total}건</span>의 기사를 출고한{" "}
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
          <p className="font-bold text-gray-900 text-[24px]">{reporter.avgWeekly}</p>
          <p className="text-xs text-gray-400">주평균</p>
        </div>
        <div className="rounded-2xl bg-gray-100 px-5 py-4">
          <p className="font-bold text-gray-900 text-[24px]">{reporter.recentCount}</p>
          <p className="text-xs text-gray-400">이번주</p>
        </div>
        <div className="rounded-2xl bg-gray-100 px-5 py-4">
          <p className={`font-bold ${reporter.surgeRatio >= 2 ? "text-[#3182F6]" : "text-gray-900"} text-[24px]`}>
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

      <p className="text-center text-xs text-gray-400">좌측 리더보드에서 기자를 클릭하면<br />상세 프로파일을 확인할 수 있습니다</p>
    </div>
  );
}

/* ── Reporter Profile Sub-component ── */

function ReporterProfile({ reporter }: { reporter: Reporter }) {
  const totalArticles = reporter.beatBreakdown.reduce((s, b) => s + b.count, 0) || 1;
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

      {/* Stats 2×2 */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-gray-100 px-5 py-4">
          <p className="text-xs text-gray-400">총 기사</p>
          <p className="mt-0.5 text-2xl font-bold text-gray-900">
            {reporter.total}<span className="text-sm font-medium text-gray-500">건</span>
          </p>
        </div>
        <div className="rounded-2xl bg-gray-100 px-5 py-4">
          <p className="text-xs text-gray-400">분야 수</p>
          <p className="mt-0.5 text-2xl font-bold text-gray-900">
            {reporter.beatCount}<span className="text-sm font-medium text-gray-500">개</span>
          </p>
        </div>
        <div className="rounded-2xl bg-gray-100 px-5 py-4">
          <p className="text-xs text-gray-400">이번주</p>
          <p className="mt-0.5 text-2xl font-bold text-gray-900">
            {reporter.recentCount}<span className="text-sm font-medium text-gray-500">건</span>
          </p>
        </div>
        <div className="rounded-2xl bg-gray-100 px-5 py-4">
          <p className="text-xs text-gray-400">교차 비율</p>
          <p className={`mt-0.5 text-2xl font-bold ${reporter.surgeRatio >= 2 ? "text-[#3182F6]" : "text-gray-900"}`}>
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
                  data={reporter.beatBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={32}
                  outerRadius={50}
                  dataKey="count"
                  nameKey="beat"
                  strokeWidth={0}
                >
                  {reporter.beatBreakdown.map((entry, idx) => (
                    <Cell key={entry.beat} fill={getSlateColor(idx)} opacity={0.85} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend: dot · name · % right-aligned */}
          <div className="flex-1 space-y-2">
            {reporter.beatBreakdown.map((b, idx) => (
              <div key={b.beat} className="flex items-center gap-2 text-xs">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: getSlateColor(idx) }}
                />
                <span className="flex-1 text-gray-500">{b.beat}</span>
                <span className="font-medium text-gray-700">
                  {Math.round((b.count / totalArticles) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

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
                formatter={(value) => [`${value}건`, "출고량"]}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}