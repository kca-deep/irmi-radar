import { SignalPreviewCard } from "@/components/dashboard/signal-preview-card";

import type { SignalPreview, SignalStats } from "@/lib/types";

interface RecentSignalsProps {
  signals: SignalPreview[];
  stats: SignalStats;
}

const BADGE_ITEMS: {
  key: keyof SignalStats;
  label: string;
  colorClass: string;
  bgClass: string;
}[] = [
  { key: "critical", label: "긴급", colorClass: "text-danger", bgClass: "bg-danger/10" },
  { key: "warning", label: "주의", colorClass: "text-warning", bgClass: "bg-warning/10" },
  { key: "caution", label: "관찰", colorClass: "text-caution", bgClass: "bg-caution/10" },
  { key: "surging", label: "급상승", colorClass: "text-caution", bgClass: "bg-caution/10" },
];

export function RecentSignals({ signals, stats }: RecentSignalsProps) {
  const displayed = signals.slice(0, 4);

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5">
      {/* Header with title + stat badges */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          최근 위기 신호
        </span>
        <div className="flex items-center gap-1.5">
          {BADGE_ITEMS.map((item) => (
            <span
              key={item.key}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${item.bgClass} ${item.colorClass}`}
            >
              {item.label}
              <span className="font-bold tabular-nums">{stats[item.key]}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {displayed.map((signal) => (
          <SignalPreviewCard key={signal.id} signal={signal} />
        ))}
      </div>
    </div>
  );
}
