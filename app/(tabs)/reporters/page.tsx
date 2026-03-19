/**
 * app/(tabs)/reporters/page.tsx -- 기자의 시선 (Server Component)
 *
 * SQLite DB에서 실시간 쿼리하여 기자 분석 데이터를 렌더링합니다.
 * DB 조회 실패 시 빈 기본값으로 폴백합니다.
 */

import { ReportersPage } from "@/components/irumi/pages/reporters-page";
import { loadReporterData } from "@/lib/irumi/reporters-query";
import type { ReporterData } from "@/lib/irumi/types";

export const revalidate = 60;

const FALLBACK_DATA: ReporterData = {
  referenceDate: new Date().toISOString().slice(0, 10),
  leaderboard: [],
  convergence: [],
  beatSummary: [],
};

export default function ReportersRoute() {
  let data: ReporterData;

  try {
    data = loadReporterData();
  } catch (err) {
    console.error("Failed to load reporter data from DB:", err);
    data = FALLBACK_DATA;
  }

  return <ReportersPage data={data} />;
}
