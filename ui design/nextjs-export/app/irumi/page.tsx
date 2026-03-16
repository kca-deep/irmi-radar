/**
 * app/irumi/page.tsx — 대시보드 메인 (Server Component)
 *
 * GET /api/dashboard 호출 → DashboardPage 클라이언트 컴포넌트로 데이터 전달
 *
 * API 응답 형태는 lib/irumi/types.ts의 DashboardData 인터페이스를 따릅니다.
 */

import { DashboardPage } from "@/components/irumi/pages/dashboard-page";
import type { DashboardData } from "@/lib/irumi/types";

async function getDashboardData(): Promise<DashboardData> {
  // ── 실제 API 호출로 교체하세요 ──────────────────────────
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/dashboard`, {
    next: { revalidate: 60 }, // 60초 ISR (필요에 따라 조정)
  });

  if (!res.ok) throw new Error("대시보드 데이터를 불러올 수 없습니다.");
  return res.json();
  // ───────────────────────────────────────────────────────
}

export default async function DashboardRoute() {
  const data = await getDashboardData();
  return <DashboardPage data={data} />;
}
