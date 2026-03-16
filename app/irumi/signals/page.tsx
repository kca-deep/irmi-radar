/**
 * app/irumi/signals/page.tsx -- 위기 신호 (Server Component)
 *
 * 기존 데이터 소스(loadSignals, loadRegionScores, loadDashboard)에서 데이터를 가져와
 * irumi CrisisSignalData 형태로 변환하여 전달합니다.
 */

import { CrisisSignalPage } from "@/components/irumi/pages/crisis-signal-page";
import {
  loadSignals,
  loadRegionScores,
  loadDashboard,
} from "@/lib/api/data-source";
import { getSeverityByScore } from "@/lib/constants";
import { transformSignals } from "@/lib/irumi/transform";
import type { CrisisSignalData } from "@/lib/irumi/types";
import type { Signal, RegionScore } from "@/lib/types";

import regionsData from "@/data/mock/regions.json";

export const dynamic = "force-dynamic";

const FALLBACK_DATA: CrisisSignalData = {
  signals: [],
  regions: [],
  nationalCompositeScore: 50,
};

export default function SignalsRoute() {
  let data: CrisisSignalData;

  try {
    const signals = loadSignals();
    const dashboard = loadDashboard();

    // DB 기반 지역 데이터 우선, 없으면 mock fallback
    let regionScores: RegionScore[] = loadRegionScores();

    if (regionScores.length === 0) {
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
      regionScores = regionScores.map((r) => ({
        ...r,
        signalCount: signals.filter((s: Signal) => s.region === r.name).length,
      }));
    }

    data = transformSignals(signals, regionScores, dashboard.overallScore);
  } catch {
    data = FALLBACK_DATA;
  }

  return <CrisisSignalPage data={data} />;
}
