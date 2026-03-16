# 이르미 대시보드 — Next.js App Router 변환 패키지

## 파일 구조

```
nextjs-export/
├── irumi-tokens.css                    # globals.css 에 붙여넣을 CSS 변수
├── lib/irumi/
│   ├── types.ts                        # 모든 페이지의 TypeScript 인터페이스
│   └── period-context.tsx              # 조회 기간 공유 Context (use client)
├── components/irumi/
│   ├── sidebar.tsx                     # 사이드바 (usePathname)
│   ├── dashboard-layout.tsx            # 레이아웃 래퍼 (use client)
│   ├── risk-badge.tsx                  # 위험등급 뱃지
│   ├── crisis-signal-card.tsx          # 위기 신호 카드
│   ├── dashboard-charts.tsx            # 차트 3종 (Recharts)
│   ├── crisis-signals-table.tsx        # 위기 뉴스 테이블
│   ├── emerging-issues-widget.tsx      # 이머징 이슈
│   ├── dashboard-hero.tsx              # 대시보드 상단 카드 (useRouter)
│   ├── writing-illustration.tsx        # SVG 일러스트 (Hero용)
│   ├── blogging-illustration.tsx       # SVG 일러스트 (Reporters용)
│   └── pages/
│       ├── dashboard-page.tsx          # 대시보드 클라이언트 페이지
│       ├── crisis-signal-page.tsx      # 위기 신호 클라이언트 페이지
│       ├── news-analysis-page.tsx      # 뉴스 분석 클라이언트 페이지
│       ├── reporters-page.tsx          # 기자의 시선 클라이언트 페이지
│       └── custom-analysis-page.tsx    # 맞춤 분석 클라이언트 페이지
└── app/irumi/
    ├── layout.tsx
    ├── page.tsx                        # 대시보드 (GET /api/dashboard)
    ├── signals/page.tsx                # 위기 신호 (GET /api/signals)
    ├── news/page.tsx                   # 뉴스 분석 (GET /api/news)
    ├── reporters/page.tsx              # 기자의 시선 (GET /api/reporters)
    └── analysis/page.tsx              # 맞춤 분석 (GET /api/custom)
```

---

## 설치 전 체크리스트

### 1. CSS 토큰 추가
`irumi-tokens.css` 내용을 `globals.css`의 `:root { }` 와 `@theme inline { }` 블록에 추가합니다.

### 2. 이미지 파일 배치
```bash
public/
  images/
    irumi-logo.png    # 로고 워터마크 이미지 (figma:asset에서 추출)
  korea-map.svg       # 한국 지도 SVG (현재 프로젝트의 src/imports/korea-map.svg 복사)
```

### 3. 패키지 확인
```bash
# 이미 설치되어 있어야 하는 패키지
@hugeicons/react
motion
recharts
```

### 4. @hugeicons/react 아이콘 이름 확인
코드 내 아이콘 import를 실제 설치된 버전에서 사용 가능한 이름으로 확인하세요.
주요 매핑:
- `Building01Icon` — 부동산
- `Briefcase01Icon` — 고용
- `ShoppingCart01Icon` — 물가
- `BankIcon` — 금융
- `Store01Icon` — 자영업
- `Search01Icon` — 검색
- `ArrowDown01Icon` (또는 해당 패키지의 ChevronDown 대응)

### 5. API 엔드포인트 환경변수
```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## API 응답 형태 (lib/irumi/types.ts 기준)

| 페이지 | 엔드포인트 | 응답 타입 |
|---|---|---|
| 대시보드 | `GET /api/dashboard` | `DashboardData` |
| 위기 신호 | `GET /api/signals` | `CrisisSignalData` |
| 뉴스 분석 | `GET /api/news` | `NewsAnalysisData` |
| AI 분석 실행 | `POST /api/analyze` | SSE 스트리밍 |
| 기자의 시선 | `GET /api/reporters` | `ReporterData` |
| 맞춤 분석 | `GET /api/custom?age=&job=` | `CustomAnalysisData` |

---

## 주요 변환 내역

| 원본 | Next.js 변환 |
|---|---|
| `react-router` `Link` | `next/link` `Link` |
| `useLocation()` | `usePathname()` from `next/navigation` |
| `useNavigate()` | `useRouter()` from `next/navigation` |
| `useOutletContext()` | `usePeriod()` Context 훅 |
| `<Outlet />` | `{children}` prop |
| `figma:asset/...` 이미지 | `next/image` + `/images/irumi-logo.png` |
| `import svg from "...?raw"` | `useEffect(() => fetch('/korea-map.svg'))` |
| `lucide-react` 아이콘 | `@hugeicons/react` 아이콘 |
| 하드코딩 mock 데이터 | `props` 인터페이스 (타입 정의: `lib/irumi/types.ts`) |
| `bg-[#FF6600]` | `bg-irumi-brand` (CSS 변수 토큰) |

---

## SSE 스트리밍 (POST /api/analyze) 구현 가이드

`news/page.tsx`는 Server Component이기 때문에 SSE 콜백을 직접 전달할 수 없습니다.
클라이언트 래퍼를 만드세요:

```tsx
// components/irumi/news-client-wrapper.tsx
"use client";
import { useRouter } from "next/navigation";
import { NewsAnalysisPage } from "@/components/irumi/pages/news-analysis-page";
import type { NewsAnalysisData } from "@/lib/irumi/types";

export function NewsClientWrapper({ data }: { data: NewsAnalysisData }) {
  const handleAnalyze = async () => {
    const res = await fetch("/api/analyze", { method: "POST" });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      // SSE 파싱 후 상태 업데이트
      console.log(text);
    }
  };

  return <NewsAnalysisPage data={data} onAnalyze={handleAnalyze} />;
}
```
