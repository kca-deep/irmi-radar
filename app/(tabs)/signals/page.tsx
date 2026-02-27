import { SignalsPage } from "@/components/signals/signals-page";

import signalsData from "@/data/mock/signals.json";
import policiesData from "@/data/mock/policies.json";

import type { Signal, Policy } from "@/lib/types";

export default function SignalsRoute() {
  // Mock 데이터 로드 (해커톤 당일 API 호출로 교체)
  const signals = signalsData as Signal[];
  const policies = policiesData as Policy[];

  return <SignalsPage signals={signals} policies={policies} />;
}
