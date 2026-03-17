"use client";

import { useState, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon } from "@hugeicons/core-free-icons";
import { SignalsFilterBar } from "@/components/signals/signals-filter-bar";
import { SignalList } from "@/components/signals/signal-list";
import { SignalDetailDialog } from "@/components/signals/signal-detail-dialog";
import { PolicyCarousel } from "@/components/signals/policy-carousel";
import { RegionMap } from "@/components/signals/region-map";
import { Badge } from "@/components/ui/badge";
import { SEVERITY_LABEL_MAP } from "@/lib/constants";
import { usePeriod } from "@/lib/irumi/period-context";

import type { Signal, Policy, CategoryKey, Severity, RegionScore } from "@/lib/types";

interface SignalsPageProps {
  signals: Signal[];
  policies: Policy[];
  regionScores: RegionScore[];
}

const PERIOD_DAYS_MAP: Record<string, number> = {
  "최근 1주": 7,
  "최근 1개월": 30,
  "최근 3개월": 90,
};

export function SignalsPage({ signals, policies, regionScores }: SignalsPageProps) {
  const { period } = usePeriod();

  // 필터 상태
  const [category, setCategory] = useState<CategoryKey | "all">("all");
  const [region, setRegion] = useState<string>("all");
  const [severity, setSeverity] = useState<Severity | "all">("all");

  // 다이얼로그 상태
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // 기간 필터링된 신호
  const periodFilteredSignals = useMemo(() => {
    const days = PERIOD_DAYS_MAP[period];
    if (!days) return signals;

    const latestDate = signals.reduce((latest, s) => {
      const d = new Date(s.detectedAt);
      return d > latest ? d : latest;
    }, new Date(0));

    const startDate = new Date(latestDate);
    startDate.setDate(startDate.getDate() - days);

    return signals.filter((s) => new Date(s.detectedAt) >= startDate);
  }, [signals, period]);

  // 필터링된 신호 목록
  const filteredSignals = useMemo(() => {
    return periodFilteredSignals.filter((signal) => {
      if (category !== "all" && signal.category !== category) {
        return false;
      }
      if (region !== "all" && signal.region !== region) {
        return false;
      }
      if (severity !== "all" && signal.severity !== severity) {
        return false;
      }
      return true;
    });
  }, [periodFilteredSignals, category, region, severity]);

  // 등급별 카운트 (기간 필터 적용 후)
  const severityCounts = useMemo(() => {
    const counts = { critical: 0, warning: 0, caution: 0, safe: 0 };
    periodFilteredSignals.forEach((signal) => {
      counts[signal.severity]++;
    });
    return counts;
  }, [periodFilteredSignals]);

  // 상세 보기 핸들러
  const handleViewDetail = (signal: Signal) => {
    setSelectedSignal(signal);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
            <HugeiconsIcon
              icon={Alert01Icon}
              size={20}
              strokeWidth={2}
              className="text-danger"
            />
            위기 신호
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            감지된 민생 위기 신호를 확인하고 대응 방안을 알아보세요.
          </p>
        </div>

        {/* 등급별 통계 배지 */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-danger text-danger-foreground">
            {SEVERITY_LABEL_MAP.critical} {severityCounts.critical}건
          </Badge>
          <Badge className="bg-warning text-warning-foreground">
            {SEVERITY_LABEL_MAP.warning} {severityCounts.warning}건
          </Badge>
          <Badge className="bg-caution text-caution-foreground">
            {SEVERITY_LABEL_MAP.caution} {severityCounts.caution}건
          </Badge>
        </div>
      </div>

      {/* 민생 지원정책 캐러셀 */}
      <PolicyCarousel />

      {/* 메인 컨텐츠: 지도 + 목록 */}
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* 왼쪽: 지역 지도 */}
        <div className="order-2 lg:order-1">
          <RegionMap
            regionScores={regionScores}
            selectedRegion={region}
            onRegionSelect={setRegion}
          />
        </div>

        {/* 오른쪽: 필터 + 목록 */}
        <div className="order-1 lg:order-2 space-y-4">
          {/* 필터 바 + 결과 카운트 */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SignalsFilterBar
              category={category}
              region={region}
              severity={severity}
              onCategoryChange={setCategory}
              onRegionChange={setRegion}
              onSeverityChange={setSeverity}
            />
            <span className="text-xs text-muted-foreground">
              {filteredSignals.length}건
            </span>
          </div>

          {/* 신호 목록 */}
          <SignalList signals={filteredSignals} onViewDetail={handleViewDetail} />
        </div>
      </div>

      {/* 상세 다이얼로그 */}
      <SignalDetailDialog
        signal={selectedSignal}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
