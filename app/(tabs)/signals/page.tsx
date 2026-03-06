import { SignalsPage } from "@/components/signals/signals-page";
import { getSeverityByScore } from "@/lib/constants";
import { loadSignals, loadPolicies, loadNews } from "@/lib/api/data-source";

import regionsData from "@/data/mock/regions.json";

import type { Signal, RegionScore } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function SignalsRoute() {
  const signals = loadSignals();
  const policies = loadPolicies();
  const articles = loadNews();

  // regions.json → RegionScore[] 변환 (전국 제외)
  const regionScores: RegionScore[] = regionsData.regions
    .filter((r) => r.id !== "nationwide")
    .map((r) => ({
      id: r.id,
      name: r.name,
      score: r.score,
      severity: getSeverityByScore(r.score),
      signalCount: signals.filter((s: Signal) => s.region === r.name).length,
      topSignal: r.topIssue,
    }));

  return (
    <SignalsPage
      signals={signals}
      policies={policies}
      regionScores={regionScores}
      articles={articles}
    />
  );
}
