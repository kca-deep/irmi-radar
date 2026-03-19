/**
 * app/(tabs)/layout.tsx
 * 사이드바 기반 레이아웃 (irumi DashboardLayout 사용)
 */

import { DashboardLayout } from "@/components/irumi/dashboard-layout";
import { getDb } from "@/lib/db";

// 인메모리 캐시 (5분 TTL) - 탭 전환마다 DB 쿼리 방지
let _latestDateCache: { value: string; ts: number } | null = null;
const LATEST_DATE_TTL = 5 * 60 * 1000;

function getLatestDate(): string {
  if (_latestDateCache && Date.now() - _latestDateCache.ts < LATEST_DATE_TTL) {
    return _latestDateCache.value;
  }
  try {
    const db = getDb(true);
    const row = db.prepare("SELECT MAX(published_at) as max_date FROM articles").get() as { max_date: string } | undefined;
    const result = row?.max_date ?? new Date().toISOString();
    _latestDateCache = { value: result, ts: Date.now() };
    return result;
  } catch {
    return new Date().toISOString();
  }
}

const ROOT_NAV_ITEMS = [
  { label: "대시보드",  href: "/" },
  { label: "맞춤 분석", href: "/analysis" },
  { label: "위기 신호", href: "/signals" },
  { label: "뉴스 분석", href: "/news" },
  { label: "기자의 시선", href: "/reporters" },
];

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const referenceDate = getLatestDate();
  return (
    <DashboardLayout referenceDate={referenceDate} navItems={ROOT_NAV_ITEMS}>
      {children}
    </DashboardLayout>
  );
}
