"use client";

import { useState, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon } from "@hugeicons/core-free-icons";
import { SignalsFilterBar } from "@/components/signals/signals-filter-bar";
import { SignalList } from "@/components/signals/signal-list";
import { SignalDetailDialog } from "@/components/signals/signal-detail-dialog";
import { RegionMap } from "@/components/signals/region-map";
import { Badge } from "@/components/ui/badge";
import { SEVERITY_LABEL_MAP, REGIONS, getSeverityByScore } from "@/lib/constants";

import type { Signal, Policy, CategoryKey, Severity, RegionScore } from "@/lib/types";

// severity를 점수로 변환
const SEVERITY_SCORE: Record<Severity, number> = {
  critical: 100,
  warning: 70,
  caution: 40,
  safe: 10,
};

interface SignalsPageProps {
  signals: Signal[];
  policies: Policy[];
}

export function SignalsPage({ signals, policies }: SignalsPageProps) {
  // 필터 상태
  const [category, setCategory] = useState<CategoryKey | "all">("all");
  const [region, setRegion] = useState<string>("all");
  const [severity, setSeverity] = useState<Severity | "all">("all");

  // 다이얼로그 상태
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // 필터링된 신호 목록
  const filteredSignals = useMemo(() => {
    return signals.filter((signal) => {
      // 카테고리 필터
      if (category !== "all" && signal.category !== category) {
        return false;
      }
      // 지역 필터
      if (region !== "all" && signal.region !== region) {
        return false;
      }
      // 등급 필터
      if (severity !== "all" && signal.severity !== severity) {
        return false;
      }
      return true;
    });
  }, [signals, category, region, severity]);

  // 등급별 카운트
  const severityCounts = useMemo(() => {
    const counts = { critical: 0, warning: 0, caution: 0, safe: 0 };
    signals.forEach((signal) => {
      counts[signal.severity]++;
    });
    return counts;
  }, [signals]);

  // 지역별 점수 계산
  const regionScores: RegionScore[] = useMemo(() => {
    // 전국 제외한 지역들만 처리
    const regionList = REGIONS.filter((r) => r.id !== "nationwide");

    return regionList.map((regionInfo) => {
      // 해당 지역의 신호들 필터링
      const regionSignals = signals.filter(
        (s) => s.region === regionInfo.name
      );

      // 점수 계산 (신호가 없으면 기본 20점)
      let score = 20;
      if (regionSignals.length > 0) {
        const totalScore = regionSignals.reduce(
          (sum, s) => sum + SEVERITY_SCORE[s.severity],
          0
        );
        score = Math.round(totalScore / regionSignals.length);
      }

      // 가장 심각한 신호 찾기
      const sortedSignals = [...regionSignals].sort(
        (a, b) => SEVERITY_SCORE[b.severity] - SEVERITY_SCORE[a.severity]
      );
      const topSignal = sortedSignals[0]?.title;

      return {
        id: regionInfo.id,
        name: regionInfo.name,
        score,
        severity: getSeverityByScore(score),
        signalCount: regionSignals.length,
        topSignal,
      };
    });
  }, [signals]);

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
          <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <HugeiconsIcon
              icon={Alert01Icon}
              size={24}
              strokeWidth={2}
              className="text-danger"
            />
            위기 신호
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
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
          {/* 필터 바 */}
          <SignalsFilterBar
            category={category}
            region={region}
            severity={severity}
            onCategoryChange={setCategory}
            onRegionChange={setRegion}
            onSeverityChange={setSeverity}
          />

          {/* 필터 결과 정보 */}
          <div className="text-sm text-muted-foreground">
            {filteredSignals.length}건의 신호가 검색되었습니다.
          </div>

          {/* 신호 목록 */}
          <SignalList signals={filteredSignals} onViewDetail={handleViewDetail} />
        </div>
      </div>

      {/* 상세 다이얼로그 */}
      <SignalDetailDialog
        signal={selectedSignal}
        policies={policies}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
