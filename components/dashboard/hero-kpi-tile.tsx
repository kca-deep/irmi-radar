"use client";

import { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  Alert02Icon,
  EyeIcon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Notification03Icon,
} from "@hugeicons/core-free-icons";
import { getSeverityByScore, SEVERITY_LABEL_MAP, CATEGORY_LABEL_MAP } from "@/lib/constants";
import { SEVERITY_COLOR_MAP } from "@/lib/icon-maps";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";

import type {
  ScoreHistoryEntry,
  SignalStats,
  SignalPreview,
  CategorySeverityDist,
  Severity,
  CategoryKey,
  DailyDelta,
} from "@/lib/types";

interface HeroKpiTileProps {
  score: number;
  lastUpdated: string;
  scoreHistory: ScoreHistoryEntry[];
  stats: SignalStats;
  recentSignals: SignalPreview[];
  categoryDist: CategorySeverityDist[];
  signalDelta: number | null;
  dailyDelta?: DailyDelta | null;
}

/* ── Static class maps (Tailwind purge safe) ── */

const STROKE_CLASS: Record<string, string> = {
  danger: "stroke-danger",
  warning: "stroke-warning",
  caution: "stroke-caution",
  safe: "stroke-safe",
};

const FILL_CLASS: Record<string, string> = {
  danger: "fill-danger",
  warning: "fill-warning",
  caution: "fill-caution",
  safe: "fill-safe",
};

const TRACK_CLASS: Record<string, string> = {
  danger: "stroke-danger/12",
  warning: "stroke-warning/12",
  caution: "stroke-caution/12",
  safe: "stroke-safe/12",
};

const SEVERITY_BG: Record<Severity, string> = {
  critical: "bg-danger",
  warning: "bg-warning",
  caution: "bg-caution",
  safe: "bg-safe",
};

const SEVERITY_DOT: Record<Severity, string> = {
  critical: "bg-danger",
  warning: "bg-warning",
  caution: "bg-caution",
  safe: "bg-safe",
};

/* ── Gauge constants ── */

const RADIUS = 46;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/* ── Sparkline ── */

const SPARK_W = 100;
const SPARK_H = 28;

function buildSparkPath(history: ScoreHistoryEntry[]): string {
  if (history.length < 2) return "";
  const scores = history.map((h) => h.score);
  const min = Math.min(...scores) - 3;
  const max = Math.max(...scores) + 3;
  const range = max - min || 1;
  return history
    .map((h, i) => {
      const x = (i / (history.length - 1)) * SPARK_W;
      const y = SPARK_H - ((h.score - min) / range) * SPARK_H;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/* ── Signal stat chip ── */

const STAT_ITEMS = [
  { key: "critical" as const, label: "긴급", icon: AlertCircleIcon, color: "text-danger", bg: "bg-danger/8", border: "border-danger/20" },
  { key: "warning" as const, label: "주의", icon: Alert02Icon, color: "text-warning", bg: "bg-warning/8", border: "border-warning/20" },
  { key: "caution" as const, label: "관찰", icon: EyeIcon, color: "text-caution", bg: "bg-caution/8", border: "border-caution/20" },
];

function StatChip({ item, value }: { item: (typeof STAT_ITEMS)[number]; value: number }) {
  const animated = useCountUp(value, 800);
  const active = value > 0;
  return (
    <div className={cn(
      "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-all",
      active ? item.bg : "bg-muted/30",
      active ? item.border : "border-border/50",
    )}>
      <HugeiconsIcon icon={item.icon} size={12} strokeWidth={2}
        className={active ? item.color : "text-muted-foreground/50"} />
      <span className={cn("text-[10px] font-medium", active ? "text-foreground" : "text-muted-foreground/50")}>
        {item.label}
      </span>
      <span className={cn("text-sm font-extrabold tabular-nums leading-none", active ? item.color : "text-muted-foreground/30")}>
        {animated}
      </span>
    </div>
  );
}

/* ── Category distribution stacked bar ── */

const BAR_COLORS: Record<Severity, string> = {
  critical: "var(--danger)",
  warning: "var(--warning)",
  caution: "var(--caution)",
  safe: "var(--safe)",
};

function CategoryDistBar({ dist, index }: { dist: CategorySeverityDist; index: number }) {
  const [barHovered, setBarHovered] = useState(false);
  const [focusedSev, setFocusedSev] = useState<Severity | null>(null);
  const total = dist.total || 1;
  const segments = ([
    { severity: "critical" as Severity, count: dist.critical, pct: (dist.critical / total) * 100 },
    { severity: "warning" as Severity, count: dist.warning, pct: (dist.warning / total) * 100 },
    { severity: "caution" as Severity, count: dist.caution, pct: (dist.caution / total) * 100 },
    { severity: "safe" as Severity, count: dist.safe, pct: (dist.safe / total) * 100 },
  ] satisfies { severity: Severity; count: number; pct: number }[]).filter((s) => s.count > 0);

  return (
    <div
      onMouseEnter={() => setBarHovered(true)}
      onMouseLeave={() => { setBarHovered(false); setFocusedSev(null); }}
    >
      {/* Label row */}
      <div className="mb-1 flex items-center justify-between">
        <span className={cn(
          "text-[10px] font-bold transition-colors duration-200",
          barHovered ? "text-foreground" : "text-foreground/70",
        )}>
          {CATEGORY_LABEL_MAP[dist.category]}
        </span>
        <div className="flex items-center gap-1.5">
          {barHovered ? (
            segments.map((seg) => (
              <span
                key={seg.severity}
                className={cn(
                  "flex items-center gap-0.5 text-[9px] tabular-nums transition-opacity duration-200",
                  focusedSev && focusedSev !== seg.severity ? "opacity-30" : "opacity-100",
                )}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: BAR_COLORS[seg.severity] }}
                />
                <span className="font-bold" style={{ color: BAR_COLORS[seg.severity] }}>
                  {seg.count}
                </span>
              </span>
            ))
          ) : (
            <span className="text-[10px] font-bold tabular-nums text-muted-foreground">
              {dist.total}건
            </span>
          )}
        </div>
      </div>
      {/* Segmented bar */}
      <div className={cn(
        "relative flex gap-0.5 transition-all duration-300",
        barHovered ? "h-5" : "h-3",
      )}>
        {segments.map((seg) => {
          const isFocused = focusedSev === seg.severity;
          const isDimmed = focusedSev !== null && !isFocused;
          return (
            <div
              key={seg.severity}
              className="relative h-full overflow-hidden rounded animate-[bar-grow_600ms_ease-out_both] transition-all duration-300 cursor-pointer"
              style={{
                flex: `${seg.pct} 0 0%`,
                backgroundColor: BAR_COLORS[seg.severity],
                animationDelay: `${index * 80}ms`,
                opacity: isDimmed ? 0.3 : 1,
                boxShadow: isFocused
                  ? `inset 0 -2px 4px rgba(0,0,0,0.22), inset 0 1px 2px rgba(255,255,255,0.4), 0 0 8px ${BAR_COLORS[seg.severity]}44`
                  : `inset 0 -2px 3px rgba(0,0,0,0.18), inset 0 1px 1px rgba(255,255,255,0.35)`,
                transform: isFocused ? "scaleY(1.15)" : "scaleY(1)",
              }}
              onMouseEnter={() => setFocusedSev(seg.severity)}
              onMouseLeave={() => setFocusedSev(null)}
            >
              {/* Gloss highlight */}
              <div
                className="absolute inset-x-0 top-0 h-[40%] rounded-t"
                style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)" }}
              />
              {/* Percentage label on focus */}
              {isFocused && barHovered && seg.pct >= 12 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[8px] font-extrabold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] tabular-nums">
                    {Math.round(seg.pct)}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Dumbbell Delta Chart ── */

const CAT_CSS_VAR: Record<CategoryKey, string> = {
  prices: "var(--cat-prices)",
  employment: "var(--cat-employment)",
  selfEmployed: "var(--cat-self-employed)",
  finance: "var(--cat-finance)",
  realEstate: "var(--cat-real-estate)",
  other: "var(--muted)",
};

interface DeltaChartItem {
  categoryKey: CategoryKey;
  category: string;
  delta: number;
  catColor: string;
  prev: number;
  curr: number;
}

const DB_ROW_H = 28;
const DB_W = 320;
const DB_CHART_L = 44;
const DB_CHART_R = 268;

function DumbbellDeltaChart({ data }: { data: DeltaChartItem[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const chartH = data.length * DB_ROW_H + 16;
  const scaleX = (v: number) =>
    DB_CHART_L + (Math.min(Math.max(v, 0), 100) / 100) * (DB_CHART_R - DB_CHART_L);

  return (
    <svg
      viewBox={`0 0 ${DB_W} ${chartH}`}
      className="w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((v) => {
        const x = scaleX(v);
        return (
          <g key={v}>
            <line
              x1={x} x2={x}
              y1={0} y2={data.length * DB_ROW_H}
              stroke="var(--muted-foreground)" strokeWidth={0.5}
              opacity={v === 50 ? 0.35 : 0.25}
              strokeDasharray={v === 50 ? "none" : "2 2"}
            />
            <text
              x={x} y={data.length * DB_ROW_H + 10}
              textAnchor="middle" dominantBaseline="central"
              fontSize={7} fill="var(--muted-foreground)" opacity={0.65}
            >
              {v}
            </text>
          </g>
        );
      })}

      {data.map((row, i) => {
        const y = i * DB_ROW_H + DB_ROW_H / 2;
        const xPrev = scaleX(row.prev);
        const xCurr = scaleX(row.curr);
        const dirColor =
          row.delta > 0
            ? "var(--danger)"
            : row.delta < 0
              ? "var(--safe)"
              : "var(--muted-foreground)";
        const isActive = hovered === i;

        return (
          <g
            key={row.category}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            className="cursor-pointer"
            style={{
              animation: `dumbbell-row-in 400ms ease-out ${i * 60}ms both`,
            }}
          >
            {/* Track */}
            <line
              x1={DB_CHART_L} x2={DB_CHART_R}
              y1={y} y2={y}
              stroke="var(--border)" strokeWidth={1}
              opacity={isActive ? 0.5 : 0.25}
            />

            {/* Connector */}
            <line
              x1={xPrev} x2={xCurr}
              y1={y} y2={y}
              stroke={row.catColor}
              strokeWidth={isActive ? 3.5 : 2.5}
              strokeLinecap="round"
              opacity={isActive ? 1 : 0.8}
            />

            {/* Prev dot (hollow ring) */}
            <circle
              cx={xPrev} cy={y} r={3.5}
              fill="var(--card)" stroke={row.catColor} strokeWidth={1.5}
            />

            {/* Curr dot (solid) */}
            <circle cx={xCurr} cy={y} r={4.5} fill={row.catColor} />

            {/* Category label */}
            <text
              x={2} y={y}
              dominantBaseline="central"
              fontSize={9.5}
              fontWeight={isActive ? 700 : 600}
              fill={isActive ? "var(--foreground)" : "var(--muted-foreground)"}
            >
              {row.category}
            </text>

            {/* Hover: score labels outside the leftmost/rightmost dots */}
            {isActive && (() => {
              const xLeft = Math.min(xPrev, xCurr);
              const xRight = Math.max(xPrev, xCurr);
              const prevIsLeft = xPrev <= xCurr;
              return (
                <>
                  <text
                    x={prevIsLeft ? xLeft - 7 : xRight + 7}
                    y={y}
                    textAnchor={prevIsLeft ? "end" : "start"}
                    dominantBaseline="central"
                    fontSize={7.5} fontWeight={600}
                    fill="var(--muted-foreground)"
                  >
                    {row.prev.toFixed(0)}
                  </text>
                  <text
                    x={prevIsLeft ? xRight + 7 : xLeft - 7}
                    y={y}
                    textAnchor={prevIsLeft ? "start" : "end"}
                    dominantBaseline="central"
                    fontSize={7.5} fontWeight={700}
                    fill={row.catColor}
                  >
                    {row.curr.toFixed(0)}
                  </text>
                </>
              );
            })()}

            {/* Delta label */}
            <text
              x={DB_W - 2} y={y}
              textAnchor="end" dominantBaseline="central"
              fontSize={10} fontWeight={700}
              fill={dirColor}
            >
              {row.delta > 0 ? "+" : ""}{row.delta.toFixed(1)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Format helpers ── */

function formatSignalDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatLastUpdated(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${dd} ${h}:${min} 기준`;
}

/* ── Main component ── */

export function HeroKpiTile({
  score,
  lastUpdated,
  scoreHistory,
  stats,
  recentSignals,
  categoryDist,
  signalDelta,
  dailyDelta,
}: HeroKpiTileProps) {
  const severity = getSeverityByScore(score);
  const colorToken = SEVERITY_COLOR_MAP[severity];
  const label = SEVERITY_LABEL_MAP[severity];

  const progress = Math.min(Math.max(score, 0), 100) / 100;
  const offset = CIRCUMFERENCE * (1 - progress);

  const scoreDelta = useMemo(() => {
    if (dailyDelta?.overall.delta != null) return dailyDelta.overall.delta;
    if (scoreHistory.length < 2) return null;
    return score - scoreHistory[scoreHistory.length - 2].score;
  }, [dailyDelta, scoreHistory, score]);

  const recentHistory = useMemo(() => scoreHistory.slice(-7), [scoreHistory]);
  const sparkPath = useMemo(() => buildSparkPath(recentHistory), [recentHistory]);

  const deltaChartData = useMemo<DeltaChartItem[]>(() => {
    if (!dailyDelta) return [];
    return (["prices", "employment", "selfEmployed", "finance", "realEstate"] as CategoryKey[])
      .map((catKey) => {
        const cat = dailyDelta.categories[catKey];
        if (!cat || cat.delta == null || cat.previousScore == null) return null;
        return {
          categoryKey: catKey,
          category: CATEGORY_LABEL_MAP[catKey],
          delta: cat.delta,
          catColor: CAT_CSS_VAR[catKey],
          prev: cat.previousScore,
          curr: cat.previousScore + cat.delta,
        };
      })
      .filter((d): d is DeltaChartItem => d !== null);
  }, [dailyDelta]);

  const total = stats.critical + stats.warning + stats.caution;

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* ── Top: Score + Signal Stats ── */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Score Gauge Area */}
        <div
          className="relative flex flex-col items-center justify-center px-6 py-4 gap-1"
          style={{ background: "linear-gradient(147deg, var(--brand) 0%, var(--brand-light) 100%)" }}
        >
          {/* M logo watermark */}
          <div className="absolute right-0 bottom-0 w-[180px] h-[135px] translate-x-[15%] translate-y-[15%] opacity-[0.16] pointer-events-none mix-blend-multiply">
            <svg viewBox="0 0 120 90" className="size-full" aria-hidden="true">
              <defs>
                <linearGradient id="m-watermark-grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="38%" stopColor="var(--brand)" />
                  <stop offset="62%" stopColor="var(--brand-light)" />
                </linearGradient>
              </defs>
              <path d="M0,0 L36,0 L60,42 L84,0 L120,0 L120,90 L0,90 Z" fill="url(#m-watermark-grad)" />
            </svg>
          </div>

          {/* Title label */}
          <div
            className="text-white/90 relative z-10"
            style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 800, letterSpacing: "0.06em" }}
          >
            IRMI Index
          </div>

          <svg viewBox="0 0 120 120" className="relative z-10 size-32" aria-label={`종합 리스크 점수 ${score}점, ${label} 등급`}>
            <circle cx="60" cy="60" r={RADIUS} fill="none" strokeWidth="8" stroke="rgba(255,255,255,0.15)" />
            <circle
              cx="60" cy="60" r={RADIUS} fill="none"
              stroke="white" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset}
              transform="rotate(-90 60 60)"
              style={{ transition: "stroke-dashoffset 1s ease-out" }}
            />
            <text x="60" y="54" textAnchor="middle" dominantBaseline="central"
              fill="white" style={{ fontSize: "36px", fontWeight: 800, letterSpacing: "-1.5px" }}>
              {score}
            </text>
            <text x="60" y="80" textAnchor="middle" dominantBaseline="central"
              fill="rgba(255,255,255,0.95)" style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "1px" }}>
              {label}
            </text>
          </svg>

          {scoreDelta !== null && (
            <div className="relative z-10 flex items-center gap-1.5 text-xs font-bold text-white/90">
              <span className="tabular-nums">{scoreDelta > 0 ? "+" : ""}{scoreDelta}</span>
              <span className="text-[10px] font-medium text-white/70">전일대비</span>
            </div>
          )}
          {dailyDelta?.overall.severityChanged && dailyDelta.overall.previousSeverity && (
            <div className="relative z-10 flex items-center gap-1 text-[9px] font-extrabold">
              <span className="rounded bg-white/15 px-1.5 py-0.5 text-white/70 backdrop-blur-sm">
                {SEVERITY_LABEL_MAP[dailyDelta.overall.previousSeverity]}
              </span>
              <span className="text-white/40">{"→"}</span>
              <span className="rounded bg-white/25 px-1.5 py-0.5 text-white backdrop-blur-sm">
                {SEVERITY_LABEL_MAP[severity]}
              </span>
            </div>
          )}

          <div className="relative z-10 text-[9px] font-medium text-white/50 tabular-nums tracking-wide">
            {formatLastUpdated(lastUpdated)}
          </div>
        </div>

        {/* Right: Signal Stats + Category Distribution */}
        <div className="flex flex-1 flex-col p-4 gap-3">
          {/* Signal header with delta */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <HugeiconsIcon
                icon={Notification03Icon}
                size={16}
                strokeWidth={2}
                className="text-brand"
              />
              <span className="text-xs font-semibold text-foreground">
                위기 신호
              </span>
            </div>
            <div className="flex items-center gap-2">
              {signalDelta !== null && signalDelta !== 0 && (
                <span className={cn(
                  "flex items-center gap-0.5 text-[10px] font-bold tabular-nums",
                  signalDelta > 0 ? "text-danger" : "text-safe",
                )}>
                  <HugeiconsIcon
                    icon={signalDelta > 0 ? ArrowUp01Icon : ArrowDown01Icon}
                    size={10} strokeWidth={2.5}
                  />
                  {signalDelta > 0 ? "+" : ""}{signalDelta}
                </span>
              )}
              <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                {total}건 감지
              </span>
              {dailyDelta?.signals && (dailyDelta.signals.newCount > 0 || dailyDelta.signals.resolvedCount > 0) && (
                <div className="flex items-center gap-1">
                  <span className="rounded bg-danger/8 px-1.5 py-px text-[9px] font-bold text-danger tabular-nums">
                    신규 {dailyDelta.signals.newCount}
                  </span>
                  <span className="rounded bg-safe/8 px-1.5 py-px text-[9px] font-bold text-safe tabular-nums">
                    해소 {dailyDelta.signals.resolvedCount}
                  </span>
                  {dailyDelta.signals.upgradedCount > 0 && (
                    <span className="rounded bg-warning/8 px-1.5 py-px text-[9px] font-bold text-warning tabular-nums">
                      상향 {dailyDelta.signals.upgradedCount}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Severity chips */}
          <div className="flex flex-wrap gap-1.5">
            {STAT_ITEMS.map((item) => (
              <StatChip key={item.key} item={item} value={stats[item.key]} />
            ))}
          </div>

          {/* Daily delta category chart */}
          {dailyDelta != null && deltaChartData.length > 0 && (
            <div className="mt-auto rounded-lg bg-brand/4 p-2.5 animate-[delta-row-in_400ms_ease-out_both]">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[9px] font-bold text-brand-muted/80 uppercase tracking-wider">
                  전일대비
                </span>
                {dailyDelta.previousDate && (
                  <span className="rounded bg-brand/8 px-1.5 py-0.5 text-[8px] font-medium text-brand-muted/60 tabular-nums">
                    {dailyDelta.previousDate.slice(5).replace("-", ".")} 기준
                  </span>
                )}
              </div>
              <DumbbellDeltaChart data={deltaChartData} />
            </div>
          )}

          {/* Sparkline fallback when no dailyDelta */}
          {dailyDelta == null && recentHistory.length >= 2 && (
            <div className="mt-auto">
              <svg viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} className="h-7 w-full" preserveAspectRatio="none">
                <path d={sparkPath} fill="none" className={STROKE_CLASS[colorToken]} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
                {(() => {
                  const scores = recentHistory.map(h => h.score);
                  const min = Math.min(...scores) - 3;
                  const max = Math.max(...scores) + 3;
                  const range = max - min || 1;
                  const lastScore = recentHistory[recentHistory.length - 1].score;
                  const cy = SPARK_H - ((lastScore - min) / range) * SPARK_H;
                  return <circle cx={SPARK_W} cy={cy} r={2} className={FILL_CLASS[colorToken]} />;
                })()}
              </svg>
              <div className="text-[9px] text-muted-foreground">7일 추이</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom: Recent Signals Feed ── */}
      {recentSignals.length > 0 && (
        <div className="border-t border-border px-4 py-2.5">
          <div className="space-y-1.5">
            {recentSignals.slice(0, 3).map((signal) => (
              <div key={signal.id} className="flex items-center gap-2 text-[11px]">
                <span className={cn("size-1.5 shrink-0 rounded-full", SEVERITY_DOT[signal.severity])} />
                <span className={cn(
                  "shrink-0 rounded px-1.5 py-px text-[9px] font-bold text-white leading-tight",
                  SEVERITY_BG[signal.severity],
                )}>
                  {SEVERITY_LABEL_MAP[signal.severity]}
                </span>
                <span className="min-w-0 truncate text-foreground/80 font-medium">
                  {signal.title}
                </span>
                <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                  {CATEGORY_LABEL_MAP[signal.category]} {formatSignalDate(signal.date)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
