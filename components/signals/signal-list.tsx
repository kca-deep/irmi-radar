import { SignalCard } from "@/components/signals/signal-card";

import type { Signal } from "@/lib/types";

interface SignalListProps {
  signals: Signal[];
  onViewDetail: (signal: Signal) => void;
}

export function SignalList({ signals, onViewDetail }: SignalListProps) {
  if (signals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">
          조건에 맞는 위기 신호가 없습니다.
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          필터 조건을 변경해 보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
      {signals.map((signal) => (
        <SignalCard
          key={signal.id}
          signal={signal}
          onViewDetail={onViewDetail}
        />
      ))}
    </div>
  );
}
