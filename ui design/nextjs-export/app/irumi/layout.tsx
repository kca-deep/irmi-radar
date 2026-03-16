/**
 * app/irumi/layout.tsx
 * Next.js App Router 레이아웃
 * DashboardLayout은 "use client" 컴포넌트이므로 이 파일은 Server Component로 유지됩니다.
 */

import type { Metadata } from "next";
import { DashboardLayout } from "@/components/irumi/dashboard-layout";

export const metadata: Metadata = {
  title: "이르미 | 민생위기 조기경보 레이더",
  description: "AI 기반 민생경제 위기 신호 대시보드",
};

export default function IrumiLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
