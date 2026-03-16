/**
 * app/irumi/layout.tsx
 * Next.js App Router 레이아웃
 * DashboardLayout은 "use client" 컴포넌트이므로 이 파일은 Server Component로 유지됩니다.
 */

import type { Metadata } from "next";
import { DashboardLayout } from "@/components/irumi/dashboard-layout";
import Database from "better-sqlite3";
import path from "path";

export const metadata: Metadata = {
  title: "이르미 | 민생위기 조기경보 레이더",
  description: "AI 기반 민생경제 위기 신호 대시보드",
};

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

export default function IrumiLayout({ children }: { children: React.ReactNode }) {
  const referenceDate = getLatestDate();
  return <DashboardLayout referenceDate={referenceDate}>{children}</DashboardLayout>;
}
