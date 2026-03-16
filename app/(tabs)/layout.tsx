/**
 * app/(tabs)/layout.tsx
 * 사이드바 기반 레이아웃 (irumi DashboardLayout 사용)
 */

import { DashboardLayout } from "@/components/irumi/dashboard-layout";
import Database from "better-sqlite3";
import path from "path";

function getLatestDate(): string {
  try {
    const db = new Database(path.join(process.cwd(), "data", "irmi.db"), { readonly: true });
    const row = db.prepare("SELECT MAX(published_at) as max_date FROM articles").get() as { max_date: string } | undefined;
    db.close();
    return row?.max_date ?? new Date().toISOString();
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
