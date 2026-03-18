import { CrisisSignalPage } from "@/components/irumi/pages/crisis-signal-page";
import {
  loadSignals,
  loadRegionScores,
  loadRegionCategoryScores,
  loadDashboard,
  getDataSource,
} from "@/lib/api/data-source";
import { getSeverityByScore } from "@/lib/constants";
import { transformSignals } from "@/lib/irumi/transform";
import type { CrisisSignalData } from "@/lib/irumi/types";
import type { Signal, RegionScore, CategoryKey } from "@/lib/types";

import regionsData from "@/data/mock/regions.json";

export const dynamic = "force-dynamic";

const FALLBACK_DATA: CrisisSignalData = {
  signals: [],
  regions: [],
  nationalCompositeScore: 0,
};

export default function SignalsRoute() {
  let data: CrisisSignalData;

  try {
    const signals = loadSignals();
    const dashboard = loadDashboard();
    const isDbMode = getDataSource() === "db";

    let regionScores: RegionScore[] = loadRegionScores();

    if (regionScores.length === 0 && !isDbMode) {
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

    let regionCategories: Record<string, Record<CategoryKey, number>> = {};
    if (isDbMode) {
      regionCategories = loadRegionCategoryScores();
    } else {
      for (const r of regionsData.regions) {
        if (r.id !== "nationwide") {
          regionCategories[r.name] = r.categories as Record<CategoryKey, number>;
        }
      }
    }

    data = transformSignals(signals, regionScores, dashboard.overallScore, regionCategories);

    return <CrisisSignalPage data={data} originalSignals={signals} />;
  } catch {
    data = FALLBACK_DATA;
  }

  return <CrisisSignalPage data={data} />;
}
