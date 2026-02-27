"use client";

export function ChainLegend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 mt-4 pt-3 border-t border-border/50">
      {/* 연결 강도 */}
      <div className="flex items-center gap-3">
        <span className="text-[9px] text-muted-foreground">연결 강도:</span>
        <div className="flex items-center gap-1">
          <div className="w-6 h-0.5 bg-foreground rounded-full" />
          <span className="text-[9px] text-muted-foreground">강함</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-0.5 bg-foreground/60 rounded-full" />
          <span className="text-[9px] text-muted-foreground">보통</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-px bg-foreground/40 rounded-full border-dashed" />
          <span className="text-[9px] text-muted-foreground">약함</span>
        </div>
      </div>

      {/* 위험 등급 */}
      <div className="flex items-center gap-3">
        <span className="text-[9px] text-muted-foreground">위험 등급:</span>
        <div className="flex items-center gap-1">
          <div className="size-2.5 rounded-full bg-danger" />
          <span className="text-[9px] text-muted-foreground">긴급</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="size-2.5 rounded-full bg-warning" />
          <span className="text-[9px] text-muted-foreground">주의</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="size-2.5 rounded-full bg-caution" />
          <span className="text-[9px] text-muted-foreground">관찰</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="size-2.5 rounded-full bg-safe" />
          <span className="text-[9px] text-muted-foreground">안전</span>
        </div>
      </div>
    </div>
  );
}
