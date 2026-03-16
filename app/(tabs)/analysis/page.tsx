/**
 * app/(tabs)/analysis/page.tsx -- 맞춤 분석 (Server Component)
 *
 * 맞춤 분석은 기존 데이터 소스에 없는 신규 기능입니다.
 * 목업 데이터를 사용하여 페이지를 렌더링합니다.
 *
 * searchParams를 통해 age/job 조건을 전달받습니다.
 */

import { CustomAnalysisPage } from "@/components/irumi/pages/custom-analysis-page";
import type { CustomAnalysisData } from "@/lib/irumi/types";

export const dynamic = "force-dynamic";

interface AnalysisPageProps {
  searchParams: Promise<{ age?: string; job?: string }>;
}

function getMockData(age: string, job: string): CustomAnalysisData {
  return {
    userName: "사용자",
    ageGroup: age,
    jobGroup: job,
    cards: [
      {
        id: "c1",
        category: "물가",
        risk: "주의",
        title: `${age} ${job} 대상\n생활비 부담 증가`,
        subtitle: "식료품 및 공공요금 인상이 가계에 미치는 영향이 커지고 있습니다.",
        keywords: ["물가상승", "생활비", "공공요금"],
        date: new Date().toISOString().slice(0, 10),
      },
      {
        id: "c2",
        category: "고용",
        risk: "관찰",
        title: `${age} ${job} 고용시장\n동향 분석`,
        subtitle: "해당 연령대 고용 지표는 안정적이나, 일부 업종에서 변동이 감지됩니다.",
        keywords: ["고용", "채용", "노동시장"],
        date: new Date().toISOString().slice(0, 10),
      },
      {
        id: "c3",
        category: "금융",
        risk: "주의",
        title: "대출 금리 상승\n가계 부채 부담",
        subtitle: "기준금리 동결에도 시중 대출 금리가 상승세를 보이고 있습니다.",
        keywords: ["금리", "대출", "가계부채"],
        date: new Date().toISOString().slice(0, 10),
      },
      {
        id: "c4",
        category: "부동산",
        risk: "관찰",
        title: "주거비 동향\n전월세 시장 변화",
        subtitle: "전세 가격은 보합세이나, 월세 전환 비율이 증가하고 있습니다.",
        keywords: ["전세", "월세", "주거비"],
        date: new Date().toISOString().slice(0, 10),
      },
      {
        id: "c5",
        category: "자영업",
        risk: "긴급",
        title: "소상공인 경영난\n폐업률 증가 추세",
        subtitle: "매출 감소와 임대료 부담으로 소상공인 경영 환경이 악화되고 있습니다.",
        keywords: ["소상공인", "폐업", "임대료"],
        date: new Date().toISOString().slice(0, 10),
      },
    ],
    supportNews: {
      c1: [
        { headline: "3월 소비자물가 전년 대비 3.1% 상승", date: "2026.03.14" },
        { headline: "서울 전기요금 인상안 확정", date: "2026.03.13" },
      ],
      c2: [
        { headline: "2월 취업자 수 전년 대비 15만 증가", date: "2026.03.14" },
      ],
      c3: [
        { headline: "시중은행 주담대 금리 연 4%대 진입", date: "2026.03.14" },
        { headline: "가계부채 1900조 돌파 우려", date: "2026.03.13" },
      ],
      c4: [
        { headline: "서울 전세가율 60%대 회복", date: "2026.03.14" },
      ],
      c5: [
        { headline: "자영업 폐업률 3개월 연속 상승", date: "2026.03.14" },
        { headline: "소상공인 긴급 경영안정자금 신청 급증", date: "2026.03.13" },
      ],
    },
  };
}

export default async function AnalysisRoute({ searchParams }: AnalysisPageProps) {
  const { age = "30대", job = "직장인" } = await searchParams;

  let data: CustomAnalysisData;

  try {
    data = getMockData(age, job);
  } catch {
    data = getMockData(age, job);
  }

  return (
    <CustomAnalysisPage
      data={data}
      onReanalyze={undefined}
    />
  );
}
