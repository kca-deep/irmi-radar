/**
 * app/irumi/analysis/page.tsx — 맞춤 분석 (Server Component)
 *
 * GET /api/custom?age=&job= 호출 (개발자가 직접 구현 예정)
 * 기본값: 30대 직장인
 * 재분석 시 클라이언트에서 onReanalyze 콜백으로 새 조건을 전달합니다.
 *
 * 주의: 재분석은 URL search params를 통해 Server Component를 재실행하거나,
 * 클라이언트 측에서 fetch로 처리할 수 있습니다.
 * 간단한 구현을 위해 searchParams를 사용하는 방식을 추천합니다.
 */

import { CustomAnalysisPage } from "@/components/irumi/pages/custom-analysis-page";
import type { CustomAnalysisData } from "@/lib/irumi/types";

interface AnalysisPageProps {
  searchParams: Promise<{ age?: string; job?: string }>;
}

async function getCustomData(age: string, job: string): Promise<CustomAnalysisData> {
  const params = new URLSearchParams({ age, job });
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/custom?${params.toString()}`,
    { cache: "no-store" } // 사용자별 개인화 데이터 — 캐시 비활성화
  );
  if (!res.ok) throw new Error("맞춤 분석 데이터를 불러올 수 없습니다.");
  return res.json();
}

export default async function AnalysisRoute({ searchParams }: AnalysisPageProps) {
  const { age = "30대", job = "직장인" } = await searchParams;
  const data = await getCustomData(age, job);

  return (
    <CustomAnalysisPage
      data={data}
      onReanalyze={undefined}
      /**
       * onReanalyze 구현 예시 (클라이언트 래퍼 사용):
       *   import { useRouter } from 'next/navigation';
       *   const router = useRouter();
       *   const handleReanalyze = (age, job) => {
       *     router.push(`/irumi/analysis?age=${age}&job=${job}`);
       *   };
       * Server Component에서는 직접 함수를 전달할 수 없으므로
       * 클라이언트 래퍼 컴포넌트를 만들어 사용하는 것을 권장합니다.
       */
    />
  );
}
