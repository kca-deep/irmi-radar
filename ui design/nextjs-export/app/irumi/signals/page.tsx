/**
 * app/irumi/signals/page.tsx — 위기 신호 (Server Component)
 *
 * GET /api/signals?category=&region=&severity= 호출
 * 초기 필터 없이 전체 목록을 받아 클라이언트에서 필터링합니다.
 *
 * ⚠️  public/korea-map.svg 파일을 반드시 배치하세요.
 *    (현재 프로젝트의 src/imports/korea-map.svg 를 복사)
 */

import { CrisisSignalPage } from "@/components/irumi/pages/crisis-signal-page";
import type { CrisisSignalData } from "@/lib/irumi/types";

async function getSignalsData(): Promise<CrisisSignalData> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/signals`, {
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error("위기 신호 데이터를 불러올 수 없습니다.");
  return res.json();
}

export default async function SignalsRoute() {
  const data = await getSignalsData();
  return <CrisisSignalPage data={data} />;
}
