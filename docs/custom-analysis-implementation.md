# 맞춤분석 AI 연동 구현 계획서

> 연령대 + 직업 필터 기반 AI 분석으로 6개 행동카드를 생성하는 기능

---

## 현재 상태

| 항목 | 상태 | 비고 |
|------|------|------|
| UI 레이아웃 | 완료 | `custom-analysis-page.tsx` (5개 카드, 하드코딩 색상) |
| 타입 정의 | 부분 완료 | `CustomCard`에 whyNow/govServices/evidenceNews 미포함 |
| 목업 데이터 | 완료 | `getMockData()` 함수 |
| API 엔드포인트 | 미구현 | `/api/custom-analysis` 없음 |
| AI 분석 로직 | 미구현 | 프롬프트/파싱 없음 |
| 재분석 버튼 | UI만 존재 | `onReanalyze` prop이 `undefined` |

---

## 데이터 흐름

```
[재분석 버튼 클릭]
    |
    v
POST /api/custom-analysis { ageGroup, jobGroup }
    |
    v
[서버] DB에서 컨텍스트 수집
    |-- articles: 최근 기사 (카테고리별 상위 기사)
    |-- gov_services: 연령대/직업 관련 정부지원
    |-- signals: 최신 위기 신호
    |-- analysis_runs: 카테고리별 리스크 점수
    |
    v
[서버] Claude API 호출 (컨텍스트 + 프로필 정보)
    |
    v
[서버] 응답 JSON 파싱 + ID 유효성 검증
    |
    v
[서버] CustomAnalysisData 형태로 조립
    |
    v
[클라이언트] 카드 6개 렌더링
```

---

## Phase 1: 타입 & 인터페이스 확장

> 파일: `lib/irumi/types.ts`

- [ ] **1-1.** `GovServiceRef` 인터페이스 추가
  ```typescript
  interface GovServiceRef {
    serviceId: string;
    serviceName: string;
    detailUrl: string;
    orgName?: string;
  }
  ```
- [ ] **1-2.** `EvidenceNewsRef` 인터페이스 추가
  ```typescript
  interface EvidenceNewsRef {
    articleId: string;
    title: string;
    publishedAt: string;
  }
  ```
- [ ] **1-3.** `CustomCard` 타입에 필드 추가
  - `whyNow: string` -- AI 분석 "왜 지금인가" 텍스트 (최대 150자)
  - `govServices: GovServiceRef[]` -- 신청 가능한 정부지원 (최대 2개)
  - `evidenceNews: EvidenceNewsRef[]` -- 근거 뉴스 (최대 2개)
- [ ] **1-4.** `CustomAnalysisData`에 `headline: string` 필드 추가
  - AI가 생성하는 맞춤 헤드라인 (예: "30대 직장인, 지금 당장 이것만 하세요.")
  - 기존 `supportNews`는 하위호환용 유지 (evidenceNews에서 변환)
- [ ] **1-5.** AI 응답 전용 내부 타입 정의 (API route 내부용)
  ```typescript
  interface LLMCustomAnalysisResponse {
    headline: string;
    cards: {
      category: string;
      risk: string;
      title: string;
      subtitle: string;
      whyNow: string;
      keywords: string[];
      govServiceIds: string[];      // DB gov_services.service_id 참조
      evidenceArticleIds: string[]; // DB articles.id 참조
    }[];
  }
  ```

---

## Phase 2: 데이터 조회 레이어

> 신규 파일: `lib/irumi/custom-analysis-query.ts`

- [ ] **2-1.** `fetchRecentArticles()` 구현
  - articles + analysis 테이블 JOIN
  - 최근 1주 기사, 카테고리별 상위 relevance_score 기준
  - 카테고리당 최대 10건 (총 50건 이내)
  - 반환: `{ id, title, summary, category, published_at, risk_score, severity }[]`
- [ ] **2-2.** `fetchGovServicesByProfile(ageGroup, jobGroup)` 구현
  - gov_services 테이블에서 target_audience LIKE 검색
  - 검색 키워드: 연령대 ("30대", "청년", "중장년" 등) + 직업 ("직장인", "근로자", "자영업" 등)
  - 매칭 안 될 경우 service_field 기반 fallback
  - 반환: `{ service_id, service_name, detail_url, org_name, target_audience }[]`
- [ ] **2-3.** `fetchLatestSignals()` 구현
  - signals 테이블에서 최신 run_id의 신호 조회
  - severity 우선순위: critical > warning > caution > safe
  - 반환: `{ id, title, severity, category, description }[]`
- [ ] **2-4.** `fetchLatestScores()` 구현
  - analysis_runs 또는 score_history에서 최신 카테고리별 점수
  - 반환: `{ overall, prices, employment, selfEmployed, finance, realEstate }`
- [ ] **2-5.** 연령대/직업 키워드 매핑 테이블 정의
  - "20대" -> ["청년", "20대", "대학생", "사회초년생"]
  - "직장인" -> ["직장인", "근로자", "급여소득자", "회사원"]
  - 등, gov_services 검색 정확도 향상용

---

## Phase 3: AI 분석 모듈

> 신규 파일: `lib/irumi/custom-analysis-ai.ts`

- [ ] **3-1.** `buildSystemPrompt()` 작성
  - 역할: 민생위기 맞춤 분석 전문가
  - 출력 JSON 스키마 명시 (`LLMCustomAnalysisResponse`)
  - 글자 수 제약:
    - headline: 최대 30자
    - title: 최대 15자 x 2줄 (\n 구분)
    - subtitle: 최대 40자
    - whyNow: 최대 150자 (구체적 숫자/날짜 포함)
  - 카드 배분 규칙: 5대 카테고리 중 위험도 높은 순, 6번째 카드는 가장 긴급한 카테고리에서 추가
  - ID 참조 규칙: 제공된 목록 내 ID만 사용
- [ ] **3-2.** `buildUserPrompt(ageGroup, jobGroup, context)` 작성
  - 연령대/직업 정보
  - 최근 기사 목록 (id, title, category, severity 포함)
  - 정부지원 서비스 목록 (service_id, service_name 포함)
  - 위기 신호 목록
  - 카테고리별 리스크 점수
- [ ] **3-3.** `analyzeForProfile(ageGroup, jobGroup)` 메인 함수 구현
  - Phase 2의 데이터 조회 함수들 호출
  - 프롬프트 구성
  - `callLLM()` 호출 (provider/model은 환경변수 기반)
  - 응답 JSON 파싱
  - `validateAndEnrich()` 호출
  - `CustomAnalysisData` 형태로 변환하여 반환
- [ ] **3-4.** `validateAndEnrich(llmResponse, context)` 구현
  - govServiceIds: DB에 실제 존재하는 ID만 필터링
  - evidenceArticleIds: DB에 실제 존재하는 ID만 필터링
  - 유효한 ID로 실제 데이터(이름, URL, 제목 등) 조인
  - 글자 수 초과 시 truncate 처리
- [ ] **3-5.** fallback 로직 구현
  - AI 호출 실패 / 파싱 실패 시
  - 규칙 기반 카드 생성: 카테고리별 리스크 점수 높은 순 6개
  - whyNow: 최근 기사 제목 기반 템플릿 생성
  - govServices: 카테고리 매칭 기반 할당
  - evidenceNews: 카테고리별 최신 기사 2개 할당

---

## Phase 4: API Route

> 신규 파일: `app/api/custom-analysis/route.ts`

- [ ] **4-1.** POST 핸들러 구현
  ```
  POST /api/custom-analysis
  Body: { ageGroup: string, jobGroup: string }
  Response: CustomAnalysisData
  ```
- [ ] **4-2.** 입력 검증
  - ageGroup: AGE_OPTIONS 목록 내 값인지 확인
  - jobGroup: JOB_OPTIONS 목록 내 값인지 확인
  - 유효하지 않으면 400 응답
- [ ] **4-3.** 캐싱 로직
  - 키: `custom-analysis:${ageGroup}:${jobGroup}`
  - 캐시 유효 시간: 1시간
  - 저장 위치: dashboard_cache 테이블 활용
  - 캐시 hit 시 DB에서 즉시 반환 (AI 호출 생략)
- [ ] **4-4.** 에러 처리
  - AI 호출 타임아웃: 30초 제한
  - 파싱 실패: 1회 재시도 후 fallback
  - DB 오류: 500 응답 + 에러 로깅
- [ ] **4-5.** 응답 형식 통일
  - 성공: `{ success: true, data: CustomAnalysisData }`
  - 실패: `{ success: false, error: string, data: CustomAnalysisData(fallback) }`

---

## Phase 5: UI 컴포넌트 수정

> 파일: `components/irumi/pages/custom-analysis-page.tsx`

- [ ] **5-1.** 헤드라인 동적 바인딩
  - 기존: `<span>{ageGroup} {jobGroup}</span>, 지금 당장 이것만 하세요.`
  - 변경: `data.headline` 사용 (AI 생성 텍스트)
  - headline이 없으면 기존 포맷으로 fallback
- [ ] **5-2.** 카드 수 5 -> 6 대응 확인
  - 현재 그리드: `grid-cols-3` + `Math.ceil(cards.length / 3)` -> 6개면 2행 자동
  - 추가 조정 불필요하나, 반응형(모바일) 확인 필요
- [ ] **5-3.** 상세 패널 "왜 지금인가" 바인딩
  - 기존: 하드코딩 텍스트 ("최근 3개월간 관련 정책...")
  - 변경: `selectedCard.whyNow` 바인딩
  - whyNow 없으면 기존 텍스트 fallback
- [ ] **5-4.** 상세 패널 "신청 가능한 정부지원" 목록 렌더링
  - 기존: 하드코딩 단일 항목 ("2026 맞춤형 지원 프로그램")
  - 변경: `selectedCard.govServices` 배열 순회 렌더링
  - 각 항목: 서비스명 + 기관명 표시
  - "신청하러 가기" 버튼: `govServices[0].detailUrl`로 `window.open()` 또는 `<a target="_blank">`
  - 서비스가 여러 개면 목록으로 표시, 각각 링크 제공
- [ ] **5-5.** 상세 패널 "근거 뉴스" 바인딩
  - 기존: `data.supportNews[selectedCard.id]` 참조
  - 변경: `selectedCard.evidenceNews` 직접 참조
  - 하위호환: supportNews도 evidenceNews에서 변환하여 유지
- [ ] **5-6.** 재분석 버튼 기능 구현
  - 클릭 시 `POST /api/custom-analysis` 호출
  - 로딩 상태: 버튼 텍스트 "분석중..." + 비활성화 + 스피너
  - 카드 영역: 스켈레톤 UI 또는 fade-out/fade-in
  - 성공 시: data 상태 교체, selectedCard 초기화
  - 실패 시: 에러 토스트 또는 인라인 메시지
- [ ] **5-7.** 하드코딩 색상 -> CSS 변수 토큰 전환
  - CATEGORY_CONFIG의 bg/iconColor -> CSS 변수 참조
  - RISK_CONFIG의 color/cardBg -> --danger, --warning, --caution, --safe 토큰
  - 인라인 style의 색상값 -> Tailwind 클래스 또는 CSS 변수
  - `#FFF8E1`, `#EDF2FF` 등 -> globals.css에 카테고리 토큰 추가 후 참조

---

## Phase 6: 서버 페이지 연결

> 파일: `app/irumi/analysis/page.tsx`

- [ ] **6-1.** 초기 렌더링 분기
  - 기본: getMockData()로 즉시 렌더 (빠른 초기 로드)
  - 캐시 존재 시: 캐시된 AI 분석 결과 사용
- [ ] **6-2.** onReanalyze 콜백 구현
  - Server Component에서 Client Component로 전환 필요 검토
  - 또는 클라이언트 래퍼 컴포넌트 분리
  - fetch(`/api/custom-analysis`, { method: 'POST', body }) 호출
  - 응답으로 data 상태 교체
- [ ] **6-3.** URL searchParams 연동
  - 재분석 후 URL 업데이트: `?age=${ageGroup}&job=${jobGroup}`
  - 뒤로가기/새로고침 시 조건 유지

---

## 고려사항 및 리스크

### 글자 수 제한 (UI overflow 방지)

| 필드 | 최대 길이 | 비고 |
|------|----------|------|
| headline | 30자 | 메인 타이틀 영역 |
| card.title | 15자 x 2줄 | `\n`으로 줄바꿈 |
| card.subtitle | 40자 | 카드 하단 보조 텍스트 |
| card.whyNow | 150자 | 상세 패널 좌측 |
| govService.serviceName | 25자 | 초과 시 truncate |

- 프롬프트에 글자 수 제한 명시
- 서버에서 truncate fallback 적용

### 토큰 비용 관리

- 입력: 기사 50건 요약 + 정부지원 + 신호 = ~3,000~4,000 토큰
- 출력: 6개 카드 JSON = ~1,500~2,000 토큰
- 캐싱으로 동일 조건 반복 호출 방지 (1시간 TTL)

### AI 환각 방지

- AI에게 ID만 선택하도록 제한 (자유 텍스트 생성 금지)
- 서버에서 반드시 ID 유효성 검증 후 실제 데이터 조인
- 유효하지 않은 ID는 조용히 제거 (에러 아님)

### 카드 6개 배분 전략

- 5대 카테고리(물가/고용/자영업/금융/부동산) 각 1개 = 5개
- 6번째: 가장 위험도 높은 카테고리에서 추가 행동 카드 1개
- AI 판단에 위임하되, 프롬프트에 규칙 명시

### 성능

- 초기 로드: 목업 즉시 렌더 (0ms 대기)
- 재분석: AI 호출 5~15초 예상 -> 로딩 UI 필수
- 캐시 hit: DB 조회 ~50ms

---

## 파일 변경 요약

| 파일 | 작업 | Phase |
|------|------|-------|
| `lib/irumi/types.ts` | 타입 확장 | 1 |
| `lib/irumi/custom-analysis-query.ts` | 신규 생성 | 2 |
| `lib/irumi/custom-analysis-ai.ts` | 신규 생성 | 3 |
| `app/api/custom-analysis/route.ts` | 신규 생성 | 4 |
| `components/irumi/pages/custom-analysis-page.tsx` | UI 수정 | 5 |
| `app/irumi/analysis/page.tsx` | 서버 페이지 수정 | 6 |
| `app/globals.css` | 카테고리 색상 토큰 추가 (선택) | 5 |
