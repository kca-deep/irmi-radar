# CLAUDE.md - 이르미(IRMI) 민생위기 조기경보 레이더

## 프로젝트 개요

뉴스 기반 사회경제 리스크 조기 감지 및 대응 지원 서비스.
매일경제 뉴스 데이터를 활용하여 물가/고용/금융/부동산/자영업 5대 카테고리의 민생 위기 신호를 조기 감지하고, 지표화/요약/해석하여 제공하는 웹 대시보드.

주요 사용자: 지자체/공공기관 민생 담당, 금융기관/서민지원기관, 일반 시민(소상공인 포함)

---

## 기술 스택 (변경 금지)

| 구분 | 기술 | 비고 |
|------|------|------|
| Framework | Next.js 16.1.6 (App Router) | RSC 활성화 |
| React | React 19.2.3 | |
| Language | TypeScript 5 | strict mode |
| Styling | Tailwind CSS 4 | PostCSS 기반, tailwind.config 없음 |
| UI Components | shadcn (base-lyra style) + @base-ui/react 1.2.0 | |
| Icons | @hugeicons/react + @hugeicons/core-free-icons | |
| Utilities | clsx, tailwind-merge, tw-animate-css | cn() 함수 사용 |
| AI | Anthropic Claude API (@anthropic-ai/sdk) | |
| MCP Servers | shadcn, sequential-thinking, context7, playwright | |

---

## 핵심 규칙

### 1. 하드코딩 절대 금지

- 색상값, 간격, 폰트, 반지름 등을 직접 작성하지 않는다
- 반드시 `app/globals.css`에 정의된 CSS 변수 및 Tailwind 시맨틱 토큰을 사용한다
- 새로운 디자인 토큰이 필요하면 `globals.css`의 `:root` / `.dark`에 CSS 변수로 추가한 뒤 `@theme inline` 블록에 매핑하여 사용한다

**사용 가능한 색상 토큰 (globals.css 기준):**

```
background, foreground
card, card-foreground
popover, popover-foreground
primary, primary-foreground
secondary, secondary-foreground
muted, muted-foreground
accent, accent-foreground
destructive
border, input, ring
chart-1 ~ chart-5
sidebar, sidebar-foreground, sidebar-primary, sidebar-primary-foreground
sidebar-accent, sidebar-accent-foreground, sidebar-border, sidebar-ring
```

**사용 가능한 반지름 토큰:**

```
radius-sm, radius-md, radius-lg, radius-xl, radius-2xl, radius-3xl, radius-4xl
```

**위기 등급별 색상 체계** (globals.css에 추가 필요):

```
--danger: 긴급 등급 (빨강 계열)
--warning: 주의 등급 (주황 계열)
--safe: 안전 등급 (초록 계열)
--caution: 관찰 등급 (노랑 계열)
```

이 4개 변수를 globals.css에 정의하고, 모든 위기 등급 표시에 이 토큰을 사용한다. 절대로 `bg-red-500`, `text-orange-600` 같은 직접 색상을 사용하지 않는다.

**Tailwind 사용 예시:**

```
OK:  bg-background text-foreground border-border rounded-lg
BAD: bg-white text-black border-gray-200 rounded-[10px]
BAD: bg-[#ff0000] text-[#333333]
```

### 2. 이모티콘 사용 금지

- 코드, 주석, UI 텍스트, 커밋 메시지 어디에서도 이모티콘(이모지)을 사용하지 않는다
- 아이콘이 필요한 경우 반드시 HugeIcons 라이브러리를 사용한다

```tsx
import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { HugeIcon } from "@hugeicons/react";

<HugeIcon icon={AlertCircleIcon} size={20} />
```

### 3. 환경변수 분리

- 모든 외부 설정값은 `.env.local` 파일에서 관리한다
- 코드에 API 키, URL, 설정값을 직접 작성하지 않는다
- 서버 전용 변수와 클라이언트 변수를 구분한다

**필수 환경변수 구조:**

```env
# AI API
ANTHROPIC_API_KEY=

# 외부 데이터 (해커톤 당일 설정)
NEWS_DATA_PATH=./data/news.json

# 앱 설정
NEXT_PUBLIC_APP_NAME=이르미 민생위기 조기경보 레이더
NEXT_PUBLIC_APP_DESCRIPTION=뉴스 기반 사회경제 리스크 조기 감지 및 대응 지원
```

- `NEXT_PUBLIC_` 접두사: 클라이언트에서 접근 가능
- 접두사 없음: 서버(API Route, Server Component)에서만 접근
- `.env.local`은 `.gitignore`에 포함되어 있음 (확인 완료)
- `.env.example` 파일을 생성하여 필요한 변수 목록을 문서화한다

### 4. MCP 서버 활용 지침

**sequential-thinking**: 복잡한 로직 설계, 알고리즘 구현, 아키텍처 결정 시 반드시 사용. 리스크 점수 계산, 데이터 흐름 설계, API 구조 설계 등에 활용한다.

**context7**: 라이브러리/프레임워크 문법이나 API 사용법이 불확실할 때 반드시 사용. Next.js App Router, Tailwind CSS v4, React 19 등의 최신 문서를 조회한다.

**shadcn MCP**: UI 컴포넌트 추가/수정 시 반드시 사용.
- 새 컴포넌트 필요 시: `search_items_in_registries`로 검색
- 사용 예시 필요 시: `get_item_examples_from_registries`로 조회
- 컴포넌트 설치 시: `get_add_command_for_items`로 설치 명령 획득
- 작업 완료 후: `get_audit_checklist`로 검증

**playwright**: UI 테스트 및 시각적 검증에 사용. 개발 중 페이지 렌더링 확인, 인터랙션 테스트에 활용한다.

---

## 프로젝트 구조

```
irmi-radar/
├── app/
│   ├── globals.css              # 디자인 토큰 (모든 색상/간격의 유일한 출처)
│   ├── layout.tsx               # 루트 레이아웃
│   ├── page.tsx                 # 메인 대시보드
│   ├── api/                     # API Routes (해커톤 당일 연결)
│   │   ├── analyze/             # Claude AI 뉴스 분석
│   │   └── risk-score/          # 리스크 점수 계산
│   ├── signals/                 # 위기 신호 탭 페이지
│   ├── news/                    # 뉴스 분석 탭 페이지
│   └── regions/                 # 지역별 현황 탭 페이지
├── components/
│   ├── ui/                      # shadcn 기본 UI 컴포넌트
│   ├── layout/                  # 공통 레이아웃 (헤더, 네비게이션, 탭)
│   ├── dashboard/               # 대시보드 위젯
│   ├── signals/                 # 위기 신호 관련 컴포넌트
│   ├── news/                    # 뉴스 분석 관련 컴포넌트
│   └── regions/                 # 지역별 현황 관련 컴포넌트
├── lib/
│   ├── utils.ts                 # cn() 유틸리티 (기존)
│   ├── constants.ts             # 상수 정의 (카테고리, 등급 등)
│   ├── types.ts                 # TypeScript 타입/인터페이스
│   └── api/                     # API 호출 및 데이터 처리 함수
│       ├── anthropic.ts         # Claude API 클라이언트
│       └── news-data.ts         # JSON 뉴스 데이터 로더
├── data/                        # 정적 JSON 데이터 (해커톤 당일 교체)
│   └── mock/                    # 사전 개발용 목업 데이터
├── hooks/                       # 커스텀 React hooks
├── docs/                        # 개발 계획서 등 문서
├── .env.local                   # 환경변수 (gitignore 대상)
├── .env.example                 # 환경변수 템플릿
└── components.json              # shadcn 설정
```

---

## 서비스 구조 (4개 탭)

### 탭 1: 대시보드 (메인 - 종합 민생 리스크 지수)
- 종합 리스크 점수 (0~100) 원형 게이지
- 5대 카테고리별 위험도 바 (물가/고용/자영업/금융/부동산)
- 긴급/주의 신호 통계 카운트
- 최근 위기 신호 미리보기 카드 (3건)
- 기준일시 표시, 기간 필터 (최근 1주/1개월/3개월)

### 탭 2: 위기 신호
- 위기 신호 목록 (긴급/주의/관찰 등급 구분)
- 카테고리별/지역별 필터
- 각 신호별 관련 기사 수 표시
- 상세 보기 (관련 기사, 원인 분석, 영향 범위)

### 탭 3: 뉴스 분석
- 분석된 뉴스 기사 목록
- 키워드 태그 표시
- 카테고리별 분류
- 키워드 검색 기능

### 탭 4: 지역별 현황
- 전국/서울/경기/인천 등 주요 지역별 리스크 점수 목록
- 색상 코딩 (danger/warning/safe 토큰 사용)
- 지역 클릭 시 해당 지역 상세 리스크 정보

---

## 개발 전략: 해커톤 전 (80%) vs 당일 (20%)

### 사전 개발 범위 (해커톤 전 - 80%)

**Phase 1: 기반 구축**
- 프로젝트 디자인 토큰 확장 (globals.css에 위기 등급 색상 추가)
- 공통 레이아웃 (헤더, 탭 네비게이션)
- TypeScript 타입 정의 (뉴스 데이터, 리스크 점수, 위기 신호 등)
- 상수 정의 (카테고리 목록, 지역 목록, 등급 정의)
- 목업 JSON 데이터 생성

**Phase 2: UI 컴포넌트 구현 (목업 데이터 기반)**
- 대시보드 탭: 종합 리스크 게이지, 카테고리별 위험도 바, 신호 통계, 미리보기 카드
- 위기 신호 탭: 신호 목록, 필터, 등급 배지, 상세 보기
- 뉴스 분석 탭: 뉴스 카드 목록, 키워드 태그, 카테고리 필터, 검색
- 지역별 현황 탭: 지역 리스크 목록, 색상 코딩

**Phase 3: API Route 스캐폴딩**
- `/api/analyze` - Claude AI 분석 엔드포인트 (인터페이스만 정의, 내부 로직은 목업 반환)
- `/api/risk-score` - 리스크 점수 계산 엔드포인트 (목업 반환)
- 데이터 로더 유틸리티 (JSON 파일 읽기)

**Phase 4: 연결 준비**
- 모든 컴포넌트가 props로 데이터를 받도록 설계 (데이터 소스 교체 용이)
- API Route 호출 훅 준비
- 로딩/에러 상태 UI

### 해커톤 당일 구현 범위 (20%) - 최소화

1. **JSON 데이터 교체**: `data/` 디렉토리에 제공된 실제 뉴스 JSON 파일 배치
2. **Claude API 연결**: `.env.local`에 API 키 설정 후 `lib/api/anthropic.ts`의 목업을 실제 호출로 교체
3. **API Route 활성화**: 목업 응답을 실제 데이터 처리 로직으로 교체
4. **최종 조정**: 실제 데이터 기반 UI 미세 조정

---

## 데이터 구조 설계

### 뉴스 데이터 (해커톤 당일 JSON으로 제공)

```
NewsArticle {
  id: string
  title: string
  content: string
  publishedAt: string (ISO 8601)
  section: string
  category: "prices" | "employment" | "selfEmployed" | "finance" | "realEstate"
  region?: string
  keywords?: string[]
}
```

### 리스크 분석 결과 (Claude API 응답)

```
RiskAnalysis {
  overallScore: number (0~100)
  categories: {
    prices: CategoryRisk
    employment: CategoryRisk
    selfEmployed: CategoryRisk
    finance: CategoryRisk
    realEstate: CategoryRisk
  }
  signals: Signal[]
  summary: string
}

CategoryRisk {
  score: number (0~100)
  trend: "rising" | "stable" | "falling"
  keyIssues: string[]
}

Signal {
  id: string
  title: string
  description: string
  severity: "critical" | "warning" | "caution" | "safe"
  category: string
  region?: string
  relatedArticleCount: number
  detectedAt: string
  evidence: string[]
}
```

---

## 코딩 컨벤션

### 파일/폴더 네이밍
- 컴포넌트 파일: kebab-case (`risk-gauge.tsx`)
- 타입 파일: kebab-case (`types.ts`)
- 훅 파일: camelCase (`useRiskData.ts`)

### 컴포넌트 작성
- Server Component 우선 사용 (데이터 fetch가 필요한 경우)
- Client Component는 인터랙션이 필요한 경우에만 `"use client"` 선언
- Props 인터페이스는 컴포넌트 파일 상단에 정의
- `cn()` 유틸리티로 클래스 조합 (`lib/utils.ts`)

### 스타일링
- Tailwind 유틸리티 클래스만 사용 (인라인 style 금지)
- 색상은 반드시 globals.css의 시맨틱 토큰 참조
- 반응형: mobile-first 접근 (sm/md/lg 브레이크포인트)
- 다크모드: `dark:` variant 활용 (globals.css에 이미 정의됨)

### Import 순서
1. React / Next.js
2. 외부 라이브러리
3. `@/components/ui/*`
4. `@/components/*`
5. `@/lib/*`
6. `@/hooks/*`
7. 타입

### 경로 별칭
- `@/` = 프로젝트 루트 (tsconfig.json에 설정됨)
- `@/components/ui/` = shadcn UI 컴포넌트
- `@/lib/` = 유틸리티, API 클라이언트, 상수
- `@/hooks/` = 커스텀 훅

---

## AI(Claude API) 활용 설계

### 용도
1. 뉴스 기사 요약 및 카테고리 분류
2. 위험 신호 감지 및 심각도 판정
3. 상황 분석 리포트 생성 (원인/영향/대응 포인트)
4. 키워드 추출

### 구현 위치
- 서버 사이드 전용 (`lib/api/anthropic.ts`)
- API Route (`app/api/`)를 통해서만 호출
- 클라이언트에서 직접 호출하지 않는다 (API 키 보호)

### API 키 관리
- `ANTHROPIC_API_KEY`는 `.env.local`에만 저장
- 서버 컴포넌트 및 API Route에서 `process.env.ANTHROPIC_API_KEY`로 접근
- 클라이언트에 절대 노출하지 않는다

---

## 5대 민생 카테고리 정의

| 키 | 한글명 | 영문키 | 주요 감지 대상 |
|-----|--------|--------|---------------|
| 물가 | 물가 | prices | 소비자물가, 식료품가격, 공공요금, 생활비 |
| 고용 | 고용 | employment | 실업률, 구조조정, 채용동향, 청년고용 |
| 자영업 | 자영업 | selfEmployed | 폐업률, 소상공인, 배달앱, 임대료 |
| 금융 | 금융 | finance | 금리, 가계부채, 연체율, 서민금융 |
| 부동산 | 부동산 | realEstate | 집값, 전세, 월세, 주거비 |

---

## 위기 등급 체계

| 등급 | 영문키 | 점수 범위 | CSS 변수 | 의미 |
|------|--------|----------|---------|------|
| 긴급 | critical | 80~100 | --danger | 즉각 대응 필요 |
| 주의 | warning | 60~79 | --warning | 주의 깊은 모니터링 필요 |
| 관찰 | caution | 40~59 | --caution | 추이 관찰 필요 |
| 안전 | safe | 0~39 | --safe | 정상 범위 |

---

## 금지 사항 요약

- 색상/간격/폰트 등 디자인 값 하드코딩 금지 (globals.css CSS 변수 사용)
- 이모티콘/이모지 사용 금지 (HugeIcons 사용)
- 환경변수 코드 내 직접 기입 금지 (.env.local 사용)
- `tailwind.config` 파일 생성 금지 (Tailwind v4는 PostCSS + globals.css 방식)
- shadcn 컴포넌트 직접 수정 금지 (래핑하여 확장)
- `components/ui/` 내 파일 직접 편집 최소화
- 클라이언트에서 API 키 직접 접근 금지

---

## 빠른 참조

```bash
# 개발 서버
npm run dev

# 빌드
npm run build

# 린트
npm run lint

# shadcn 컴포넌트 추가 (MCP 사용 권장)
npx shadcn@latest add [component-name]
```
