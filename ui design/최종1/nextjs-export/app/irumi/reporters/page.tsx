/**
 * app/irumi/reporters/page.tsx — 기자의 시선 (Server Component)
 *
 * GET /api/reporters 호출 (개발자가 직접 구현 예정)
 * 응답 형태: lib/irumi/types.ts의 ReporterData 인터페이스
 */

import { ReportersPage } from "@/components/irumi/pages/reporters-page";
import type { ReporterData } from "@/lib/irumi/types";

async function getReportersData(): Promise<ReporterData> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/reporters`, {
    next: { revalidate: 300 }, // 5분 캐시 (기자 데이터는 실시간성이 낮음)
  });
  if (!res.ok) throw new Error("기자 데이터를 불러올 수 없습니다.");
  return res.json();
}

export default async function ReportersRoute() {
  const data = await getReportersData();
  return <ReportersPage data={data} />;
}
