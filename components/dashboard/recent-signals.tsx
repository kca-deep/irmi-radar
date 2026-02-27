import { SignalPreviewCard } from "@/components/dashboard/signal-preview-card";

import type { SignalPreview } from "@/lib/types";

interface RecentSignalsProps {
  signals: SignalPreview[];
}

export function RecentSignals({ signals }: RecentSignalsProps) {
  const displayed = signals.slice(0, 4);

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5">
      <div className="mb-3 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        최근 위기 신호
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {displayed.map((signal) => (
          <SignalPreviewCard key={signal.id} signal={signal} />
        ))}
      </div>
    </div>
  );
}
