# 보조금24 API 통합 구현계획

## 1. 개요

### 목적

보조금24 API(행정안전부 공공서비스 정보)를 IRMI 프로젝트에 통합하여, 현재 mock 데이터 기반으로 동작하는 정책 추천 기능을 실제 정부 지원정책 데이터로 전환한다. 10,918건의 실제 정부 지원정책 데이터를 활용하여, 위기 신호별로 관련 지원정책을 실시간으로 조회하고 시민에게 안내하는 것이 핵심 목표이다.

### API 정보

- **제공처**: 행정안전부 (공공데이터포털 경유)
- **기본 URL**: `https://api.odcloud.kr/api/gov24/v3`
- **주요 엔드포인트**:
  - `GET /serviceList` -- 서비스 목록 조회 (페이지네이션 지원)
  - `GET /serviceDetail` -- 서비스 상세 정보 조회
  - `GET /supportConditions` -- 지원 조건/자격 조회
- **인증**: 공공데이터포털 API 키 (ServiceKey 파라미터)
- **데이터 규모**: 약 10,918건의 정부 지원정책 (2026년 3월 기준)
- **응답 형식**: JSON

### 현재 상태

현재 IRMI 프로젝트의 정책 관련 기능은 다음과 같이 구성되어 있다:

| 파일 | 역할 | 데이터 소스 |
|------|------|------------|
| `app/api/policies/route.ts` | 정책 목록 API Route | `lib/api/mock-data.ts` (loadPolicies) |
| `data/mock/policies.json` | Mock 정책 데이터 | 10건의 하드코딩 데이터 |
| `components/signals/signal-detail-dialog.tsx` | 신호 상세 내 정책 표시 | props로 전달된 mock policies |
| `components/signals/action-guide-section.tsx` | 대응 가이드 + 정책 카드 | props로 전달된 mock policies |
| `components/signals/policy-card.tsx` | 개별 정책 카드 UI | Policy 타입 |
| `lib/types.ts` | Policy 인터페이스 정의 | 현재 mock 구조에 맞춤 |

---

## 2. 구현 범위 (4단계)

### 제안1: Policy API 실제 데이터 전환

**목표**: `app/api/policies/route.ts`의 데이터 소스를 mock에서 보조금24 실제 API로 전환한다.

**세부 작업**:

1. **`lib/api/gov-service.ts` 신규 생성**
   - 보조금24 API 호출 유틸리티 함수 구현
   - `fetchServiceList(params)` -- serviceList 엔드포인트 호출
   - `fetchServiceDetail(serviceId)` -- serviceDetail 엔드포인트 호출
   - `fetchSupportConditions(serviceId)` -- supportConditions 엔드포인트 호출
   - `searchServicesByKeywords(keywords, category?)` -- 키워드 기반 검색 래퍼
   - `transformToPolicy(govService)` -- 보조금24 응답을 IRMI Policy 타입으로 변환
   - API 키 이중 인코딩 처리 (`decodeURIComponent` 적용)
   - `next.revalidate: 3600` 캐싱 전략 적용

2. **`app/api/policies/route.ts` 수정**
   - `loadPolicies()` (mock) 호출을 `searchServicesByKeywords()` (실제 API) 호출로 교체
   - try/catch 내에서 실제 API 실패 시 `loadPolicies()` mock fallback 유지
   - category, region 파라미터를 보조금24 API 파라미터로 매핑

3. **`lib/types.ts`에 GovService 타입 추가**
   - 보조금24 API 원본 응답 타입 (`GovServiceRaw`)
   - 변환된 내부 타입은 기존 `Policy` 인터페이스 재활용

**구현 패턴** (기존 `lib/api/assembly.ts` 참고):

```typescript
// lib/api/gov-service.ts 구조 예시

const BASE_URL = "https://api.odcloud.kr/api/gov24/v3";

async function fetchGovApi<T>(
  endpoint: string,
  params?: Record<string, string>
): Promise<{ data: T[]; totalCount: number }> {
  const apiKey = process.env.DATA_GO_KR_API_KEY;
  if (!apiKey) {
    throw new Error("DATA_GO_KR_API_KEY is not configured");
  }

  const searchParams = new URLSearchParams({
    serviceKey: decodeURIComponent(apiKey),
    type: "json",
    page: "1",
    perPage: "20",
    ...params,
  });

  const url = `${BASE_URL}/${endpoint}?${searchParams.toString()}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  // ...
}
```

---

### 제안2: 위기 신호 상세 실시간 정책 추천

**목표**: `signal-detail-dialog.tsx`에서 위기 신호를 열 때, 해당 신호의 카테고리에 맞는 실제 정부 지원정책을 보조금24 API에서 실시간으로 조회하여 표시한다.

**세부 작업**:

1. **`components/signals/gov-policy-section.tsx` 신규 생성**
   - 클라이언트 컴포넌트 (`"use client"`)
   - 카테고리 키를 받아 `/api/policies?category=...` 호출
   - 로딩/에러/빈 상태 처리
   - 기존 `PolicyCard` 또는 `CompactPolicyCard` 재사용
   - `AssemblyRelatedSection` 컴포넌트 패턴 참고 (useEffect + fetch)

2. **`signal-detail-dialog.tsx` 수정**
   - 현재: props로 받은 `policies` 배열에서 `matchedPolicies`를 useMemo로 필터링
   - 변경: `GovPolicySection` 컴포넌트로 교체하여 실시간 API 조회
   - 기존 mock matchedPolicies 로직은 fallback으로 유지 (API 실패 시)

3. **카테고리별 검색 키워드 매핑**
   - `lib/constants.ts`의 기존 `CATEGORY_SEARCH_KEYWORDS`를 보조금24 검색에 재활용
   - 필요 시 `GOV_SERVICE_KEYWORDS` 별도 정의 (보조금24 서비스명 매칭에 최적화된 키워드)

**UI 동작 흐름**:

```
사용자가 위기 신호 클릭
  -> SignalDetailDialog 열림
  -> GovPolicySection 마운트
  -> /api/policies?category={signal.category} 호출
  -> 보조금24 API에서 관련 정책 조회
  -> 정책 카드 목록 표시 (로딩 스피너 -> 결과)
  -> API 실패 시 mock policies fallback 표시
```

---

### 제안3: 대시보드 "민생 지원정책" 패널

**목표**: 메인 대시보드에 정부 지원정책 요약 패널을 추가하여, 5대 카테고리별로 관련 정책을 탭 형태로 표시한다.

**세부 작업**:

1. **`components/dashboard/gov-policy-panel.tsx` 신규 생성**
   - 클라이언트 컴포넌트 (`"use client"`)
   - `AssemblyTrendsPanel` 디자인 패턴/구조 참고
   - 디자인 토큰: `policy-surface` / `policy-accent` 사용 (globals.css에 추가 필요)
   - 5대 카테고리 탭으로 정책을 분류하여 표시
   - 각 탭에서 해당 카테고리의 상위 3~5건 정책 카드 표시
   - 전체 보기 링크 또는 더보기 버튼
   - HugeIcons의 적절한 아이콘 사용 (LegalDocument01Icon 등)

2. **`components/dashboard/dashboard-page.tsx` 수정**
   - `AssemblyTrendsPanel` 아래에 `GovPolicyPanel` 추가
   - full width (`sm:col-span-2 lg:col-span-3`)로 배치

3. **`app/globals.css` 수정**
   - `:root`에 `--policy-surface` 및 `--policy-accent` CSS 변수 추가
   - `.dark`에 다크모드 대응 값 추가
   - `@theme inline` 블록에 `--color-policy-surface` 및 `--color-policy-accent` 매핑 추가

**패널 레이아웃 구조**:

```
+------------------------------------------------------+
| [아이콘] 민생 지원정책                 보조금24      |
+------------------------------------------------------+
| [물가] [고용] [자영업] [금융] [부동산]  <- 카테고리 탭  |
+------------------------------------------------------+
| +------------------+  +------------------+            |
| | 정책명           |  | 정책명           |            |
| | 지원기관         |  | 지원기관         |            |
| | 지원내용 요약    |  | 지원내용 요약    |            |
| | [연락처] [자세히]|  | [연락처] [자세히]|            |
| +------------------+  +------------------+            |
+------------------------------------------------------+
```

---

### 제안4: AI 연동 (해커톤 당일)

**목표**: Claude API 호출 시 보조금24 데이터를 프롬프트 컨텍스트로 포함하여, AI가 위기 상황에 맞는 구체적인 정부 지원정책을 직접 추천할 수 있도록 한다.

**세부 작업**:

1. **`lib/api/anthropic.ts` 수정**
   - `analyzeNews()` 함수에서 관련 카테고리의 보조금24 정책 목록을 조회
   - 조회된 정책 데이터를 Claude 프롬프트의 시스템 메시지에 컨텍스트로 포함
   - AI 응답에 "추천 정책" 섹션 추가 유도

2. **`generateChatResponse()` 수정**
   - 사용자 질문에 포함된 카테고리 키워드 감지
   - 관련 보조금24 정책을 조회하여 컨텍스트로 전달
   - "어떤 지원을 받을 수 있나요?" 류의 질문에 실제 정책으로 답변

3. **프롬프트 설계**

```
시스템 프롬프트 예시:
"당신은 민생 위기 분석 전문가입니다.
다음은 현재 활용 가능한 정부 지원정책 목록입니다:
{보조금24에서 조회한 정책 목록 JSON}
분석 결과에 관련 지원정책을 구체적으로 추천해 주세요."
```

---

## 3. 파일 변경 목록

### 신규 생성 파일

| 파일 경로 | 설명 |
|-----------|------|
| `lib/api/gov-service.ts` (신규) | 보조금24 API 호출 유틸리티 |
| `components/signals/gov-policy-section.tsx` (신규) | 위기 신호 상세 내 실시간 정책 섹션 |
| `components/dashboard/gov-policy-panel.tsx` (신규) | 대시보드 민생 지원정책 패널 |

### 수정 파일

| 파일 경로 | 변경 내용 |
|-----------|----------|
| `lib/types.ts` (수정) | `GovServiceRaw` 타입 추가 (보조금24 원본 응답 타입) |
| `lib/constants.ts` (수정) | `GOV_SERVICE_KEYWORDS` 상수 추가 (보조금24 검색 최적화 키워드) |
| `app/api/policies/route.ts` (수정) | mock -> 실제 API 호출, mock fallback 유지 |
| `app/globals.css` (수정) | `--policy-surface`, `--policy-accent` CSS 변수 추가 |
| `components/signals/signal-detail-dialog.tsx` (수정) | `GovPolicySection` 통합 또는 실시간 정책 조회 로직 추가 |
| `components/dashboard/dashboard-page.tsx` (수정) | `GovPolicyPanel` import 및 배치 추가 |
| `.env.example` (수정) | `DATA_GO_KR_API_KEY` 설명 보강 (이미 존재, 주석 보완) |
| `lib/api/anthropic.ts` (수정) | 해커톤 당일 -- 보조금24 컨텍스트 주입 |

---

## 4. 데이터 매핑

### 4.1 보조금24 필드 -> IRMI Policy 필드 매핑

| 보조금24 필드 (GovServiceRaw) | IRMI Policy 필드 | 변환 로직 |
|-------------------------------|-------------------|----------|
| `서비스ID` | `id` | `"gov-" + 서비스ID`로 prefix 부여 |
| `서비스명` | `title` | 그대로 매핑 |
| `서비스목적요약` | `description` | 그대로 매핑 (없으면 빈 문자열) |
| `소관기관명` | `provider` | 그대로 매핑 |
| `소관기관코드` | -- | 내부 조회용 (Policy에 미포함) |
| `서비스분야` | -- | 카테고리 매핑 보조 참고용 |
| `선정기준` | `eligibility` | 그대로 매핑 (긴 경우 앞 200자 + "...") |
| `지원내용` | `benefit` | 그대로 매핑 (긴 경우 앞 200자 + "...") |
| `신청방법` | -- | Policy에 없으나, description에 병합 가능 |
| `문의처전화번호` | `contact` | 첫 번째 전화번호 추출 |
| `온라인신청사이트URL` | `url` | 있으면 사용, 없으면 보조금24 상세페이지 URL 생성 |
| -- | `targetCategories` | 서비스명 + 서비스목적요약 키워드 분석으로 결정 (아래 매핑 테이블 참조) |
| -- | `targetRegions` | `소관기관명`에서 지역 추출, 없으면 `["전국"]` |
| -- | `relatedSignals` | 빈 배열 `[]` (실시간 매칭은 카테고리 기반) |

### 4.2 카테고리별 키워드 매핑 (GOV_SERVICE_KEYWORDS)

보조금24 서비스명 및 서비스목적요약에서 아래 키워드를 탐색하여 IRMI 카테고리와 매핑한다. 기존 `CATEGORY_SEARCH_KEYWORDS`를 기반으로 하되, 보조금24 서비스명에 자주 등장하는 용어를 추가한다.

| CategoryKey | 검색 키워드 | 비고 |
|-------------|------------|------|
| `prices` | 물가, 소비자, 식료품, 공공요금, 생활비, 에너지, 바우처, 난방, 전기, 가스, 급식, 식사, 식품, 양곡 | 에너지/식품 바우처류 포함 |
| `employment` | 고용, 실업, 구직, 채용, 청년, 일자리, 노동, 직업훈련, 취업, 근로, 직업, 인턴, 고용보험 | 직업훈련/인턴 포함 |
| `selfEmployed` | 자영업, 소상공인, 폐업, 창업, 상가, 임대료, 소기업, 중소기업, 전통시장, 영세, 배달, 수수료 | 전통시장/창업 포함 |
| `finance` | 금리, 가계부채, 연체, 서민금융, 대출, 금융, 이자, 신용, 채무, 보증, 기초생활, 긴급복지, 생계 | 기초생활/긴급복지 포함 |
| `realEstate` | 부동산, 집값, 전세, 월세, 주거, 임대차, 아파트, 주택, 임대주택, 보증금, 주거급여, 매입임대 | 주거급여/임대주택 포함 |

**매핑 함수 로직**:

```typescript
function categorizeService(
  serviceName: string,
  description: string
): CategoryKey[] {
  const text = `${serviceName} ${description}`;
  const matched: CategoryKey[] = [];

  for (const [category, keywords] of Object.entries(GOV_SERVICE_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) {
      matched.push(category as CategoryKey);
    }
  }

  return matched.length > 0 ? matched : [];
}
```

### 4.3 보조금24 API 원본 응답 타입

```typescript
// lib/types.ts에 추가

interface GovServiceRaw {
  서비스ID: string;
  서비스명: string;
  서비스목적요약: string;
  소관기관명: string;
  소관기관코드: string;
  서비스분야: string;
  선정기준: string;
  지원내용: string;
  지원유형: string;
  신청방법: string;
  신청기한: string;
  문의처전화번호: string;
  온라인신청사이트URL: string;
  서비스URL: string;
}
```

---

## 5. 체크리스트

### 제안1: Policy API 실제 데이터 전환

- [ ] `lib/types.ts`에 `GovServiceRaw` 타입 추가
- [ ] `lib/constants.ts`에 `GOV_SERVICE_KEYWORDS` 상수 추가
- [ ] `lib/api/gov-service.ts` 신규 생성 -- 보조금24 API 유틸리티
  - [ ] `fetchGovApi()` 공통 fetch 함수 (API 키 디코딩, 캐싱, 에러 처리)
  - [ ] `fetchServiceList()` -- 서비스 목록 조회
  - [ ] `fetchServiceDetail()` -- 서비스 상세 조회
  - [ ] `searchServicesByKeywords()` -- 키워드 기반 검색
  - [ ] `transformToPolicy()` -- GovServiceRaw -> Policy 변환
- [ ] `app/api/policies/route.ts` 수정 -- 실제 API 호출 + mock fallback

### 제안2: 위기 신호 상세 실시간 정책 추천

- [ ] `components/signals/gov-policy-section.tsx` 신규 생성
  - [ ] useEffect + fetch 패턴으로 /api/policies 호출
  - [ ] 로딩/에러/빈 상태 UI
  - [ ] 기존 PolicyCard 또는 CompactPolicyCard 재사용
- [ ] `components/signals/signal-detail-dialog.tsx` 수정
  - [ ] GovPolicySection 통합 (기존 matchedPolicies 대체 또는 병행)

### 제안3: 대시보드 "민생 지원정책" 패널

- [ ] `app/globals.css` 수정
  - [ ] `:root`에 `--policy-surface`, `--policy-accent` 추가
  - [ ] `.dark`에 다크모드 대응 값 추가
  - [ ] `@theme inline`에 `--color-policy-surface`, `--color-policy-accent` 매핑
- [ ] `components/dashboard/gov-policy-panel.tsx` 신규 생성
  - [ ] 카테고리 탭 UI
  - [ ] 탭별 정책 카드 목록
  - [ ] 로딩/에러 상태
  - [ ] policy-surface/policy-accent 디자인 토큰 사용
- [ ] `components/dashboard/dashboard-page.tsx` 수정
  - [ ] GovPolicyPanel import 추가
  - [ ] AssemblyTrendsPanel 아래에 배치

### 제안4: AI 연동 (해커톤 당일)

- [ ] `lib/api/anthropic.ts` 수정 -- 보조금24 컨텍스트를 프롬프트에 주입
  - [ ] `analyzeNews()`에 관련 정책 컨텍스트 추가
  - [ ] `generateChatResponse()`에 정책 질의 응답 기능 추가
  - [ ] `generateBriefing()`에 추천 정책 섹션 추가

### 공통 검증

- [ ] `.env.local`에 `DATA_GO_KR_API_KEY` 설정 확인
- [ ] `npx next build` 빌드 성공 확인
- [ ] Playwright 시각 검증 -- 대시보드 정책 패널 렌더링
- [ ] Playwright 시각 검증 -- 위기 신호 상세 정책 섹션 렌더링
- [ ] API 키 미설정 시 mock fallback 정상 동작 확인
- [ ] 다크모드 정책 패널 표시 확인

---

## 6. 환경변수

### 필요 환경변수

| 변수명 | 파일 | 용도 | 접근 범위 |
|--------|------|------|----------|
| `DATA_GO_KR_API_KEY` | `.env.local` | 공공데이터포털 API 인증키 | 서버 전용 |

### 설정 방법

1. 공공데이터포털(https://www.data.go.kr)에서 회원가입 및 API 키 발급
2. "보조금24 공공서비스 정보" API 활용 신청
3. 발급받은 API 키를 `.env.local`에 설정:

```env
# 공공데이터포털 (https://www.data.go.kr)
# - 보조금24 공공서비스 정보 API
DATA_GO_KR_API_KEY=발급받은_API_키
```

### 현재 .env.example 상태

`.env.example`에 `DATA_GO_KR_API_KEY`는 이미 정의되어 있다. 주석에 보조금24 관련 설명이 포함되어 있으므로 추가 변경은 불필요하다.

---

## 7. 주의사항

### API 키 이중 인코딩 문제

공공데이터포털에서 발급하는 API 키는 URL 인코딩된 상태로 제공된다. `.env.local`에 인코딩된 키를 그대로 저장하면, fetch 시 URLSearchParams가 한 번 더 인코딩하여 이중 인코딩이 발생한다. 반드시 `decodeURIComponent()`로 디코딩 후 사용해야 한다.

```typescript
// 올바른 사용법
const apiKey = process.env.DATA_GO_KR_API_KEY;
const decodedKey = decodeURIComponent(apiKey);
searchParams.set("serviceKey", decodedKey);
```

### 서버 전용 호출 원칙

- `DATA_GO_KR_API_KEY`는 `NEXT_PUBLIC_` 접두사가 없으므로 서버에서만 접근 가능
- 보조금24 API 호출은 반드시 API Route(`app/api/`) 또는 Server Component에서 수행
- 클라이언트 컴포넌트에서는 `/api/policies` 내부 API Route를 통해 간접 호출

### 캐싱 전략

- `next.revalidate: 3600` (1시간) 설정으로 불필요한 API 호출 최소화
- 보조금24 데이터는 실시간성이 낮으므로 (정책 변경 주기가 수일~수주) 1시간 캐시로 충분
- 기존 `lib/api/assembly.ts`의 `{ next: { revalidate: 3600 } }` 패턴과 동일하게 적용

### Mock Fallback 필수

- API 키 미설정, API 장애, 네트워크 오류 등 모든 실패 상황에서 기존 mock 데이터로 fallback
- 해커톤 시연 중 외부 API 장애로 인한 서비스 중단을 방지
- fallback 구현 패턴:

```typescript
export async function GET(request: Request) {
  try {
    // 1. 실제 보조금24 API 시도
    const policies = await searchServicesByKeywords(keywords);
    return successResponse(policies);
  } catch (error) {
    console.warn("보조금24 API 호출 실패, mock fallback 사용:", error);
    // 2. 실패 시 mock 데이터 반환
    const policies = loadPolicies(filters);
    return successResponse(policies);
  }
}
```

### API 호출 제한

- 공공데이터포털 API는 일일 호출 횟수 제한이 있음 (일반적으로 1,000회/일)
- 개발 중 과도한 호출을 방지하기 위해 캐싱 반드시 적용
- 개발/테스트 시에는 mock fallback을 활용하여 API 할당량 절약

### 디자인 토큰 준수

- 정책 패널의 모든 색상은 `policy-surface` / `policy-accent` CSS 변수를 사용
- 하드코딩된 색상값 사용 금지 (프로젝트 규칙 `globals.css` CSS 변수 원칙)
- 아이콘은 HugeIcons 라이브러리만 사용, 이모지 사용 금지

### 기존 컴포넌트 호환성

- `Policy` 타입 인터페이스는 변경하지 않음 (기존 mock 데이터와 동일한 구조 유지)
- `PolicyCard`, `CompactPolicyCard` 등 기존 UI 컴포넌트는 수정 없이 재사용
- 보조금24 데이터를 기존 `Policy` 타입으로 변환하는 것이 핵심 (`transformToPolicy`)

### 한글 필드명 처리

- 보조금24 API 응답의 필드명이 한글임 (`서비스명`, `소관기관명` 등)
- TypeScript 타입에서 한글 키를 지원하지만, 내부 코드에서는 `GovServiceRaw` 타입으로 받은 뒤 즉시 영문 키의 `Policy` 타입으로 변환하여 사용
