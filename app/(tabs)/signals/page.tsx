import { SignalsPage } from "@/components/signals/signals-page";
import { getSeverityByScore } from "@/lib/constants";
import { loadSignals, loadPolicies, loadRegionScores } from "@/lib/api/data-source";

import regionsData from "@/data/mock/regions.json";

import type { Signal, RegionScore } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function SignalsRoute() {
  const signals = loadSignals();
  const policies = loadPolicies();

  // DB 기반 지역 데이터 우선, 없으면 mock fallback
  let regionScores: RegionScore[] = loadRegionScores();

  if (regionScores.length === 0) {
    // mock fallback
    regionScores = regionsData.regions
      .filter((r) => r.id !== "nationwide")
      .map((r) => ({
        id: r.id,
        name: r.name,
        score: r.score,
        severity: getSeverityByScore(r.score),
        signalCount: signals.filter((s: Signal) => s.region === r.name).length,
        topSignal: r.topIssue,
      }));
  } else {
    // DB 데이터에 신호 수 추가
    regionScores = regionScores.map((r) => ({
      ...r,
      signalCount: signals.filter((s: Signal) => s.region === r.name).length,
    }));
  }

  return (
    <SignalsPage
      signals={signals}
      policies={policies}
      regionScores={regionScores}
    />
  );
}
