import { SignalsPage } from "@/components/signals/signals-page";
import { getSeverityByScore } from "@/lib/constants";

import signalsData from "@/data/mock/signals.json";
import policiesData from "@/data/mock/policies.json";
import regionsData from "@/data/mock/regions.json";
import newsData from "@/data/mock/news.json";

import type { Signal, Policy, RegionScore, NewsArticle } from "@/lib/types";

export default function SignalsRoute() {
  // Mock 데이터 로드 (해커톤 당일 API 호출로 교체)
  const signals = signalsData as Signal[];
  const policies = policiesData as Policy[];
  const articles = newsData as NewsArticle[];

  // regions.json → RegionScore[] 변환 (전국 제외)
  const regionScores: RegionScore[] = regionsData.regions
    .filter((r) => r.id !== "nationwide")
    .map((r) => ({
      id: r.id,
      name: r.name,
      score: r.score,
      severity: getSeverityByScore(r.score),
      signalCount: signals.filter((s) => s.region === r.name).length,
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
